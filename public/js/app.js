(function () {
  const t = (...args) => window.WM.i18n.t(...args);
  const L = window.WM.layout;
  const S = window.WM.store;
  const $ = (s) => document.querySelector(s);

  const wall = $('#wall');
  const previewEl = $('#preview');
  const drawer = $('#drawer');
  const toolbar = $('#toolbar');

  let cfg = null;
  let editing = false;
  let selectedId = null;
  let drawerDraft = null;
  let drawerSaving = false;
  let saveQueue = Promise.resolve();
  let saveTimer = null;
  const undoStack = [];
  const views = new Map(); // panel id → { el, iframe, url, zoom, refresh, timer }

  const find = (id) => cfg.panels.find((p) => p.id === id);

  // ───────── Render ─────────

  function panelTemplate() {
    const el = document.createElement('div');
    el.className = 'panel';
    el.innerHTML = `
      <div class="frame-loading" role="status"><i></i><span></span></div>
      <div class="frame-wrap"><iframe allow="autoplay; fullscreen; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <div class="placeholder"><b></b><span>No URL assigned</span></div>
      <div class="title-badge"></div>
      <button class="source-swap-handle" type="button" title="Drag content to another screen" aria-label="Swap screen content">⠿ ⇄</button>
      <div class="edit-overlay">
        <div class="ov-title"></div>
        <div class="ov-size"></div>
        <div class="ov-url"></div>
        <div class="ov-actions">
          <button type="button" data-act="edit" title="Settings">⚙</button>
          <button type="button" data-act="reload" title="Reload">⟳</button>
          <button type="button" data-act="split" title="Split">⊞</button>
          <button type="button" data-act="delete" title="Delete">✕</button>
        </div>
        <i class="handle nw" data-corner="nw"></i>
        <i class="handle ne" data-corner="ne"></i>
        <i class="handle sw" data-corner="sw"></i>
        <i class="handle se" data-corner="se"></i>
      </div>`;
    el.querySelector('.placeholder span').textContent = '';
    window.WM.i18n.bind(el);
    return el;
  }

  function updateView(v, p) {
    const d = L.dims(cfg);
    v.el.dataset.id = p.id;
    v.el.style.gridColumn = `${p.x + 1} / span ${p.w}`;
    v.el.style.gridRow = `${p.y + 1} / span ${p.h}`;
    v.el.classList.toggle('selected', p.id === selectedId);
    v.el.classList.toggle('show-title', !!p.showTitle);

    const source = panelSource(p);
    const url = source.url;
    v.el.classList.toggle("has-source", !!url);
    if (v.url !== url) {
      v.url = url;
      loadFrame(v);
      v.el.classList.toggle('is-empty', !url);
    }
    if (v.zoom !== p.zoom) {
      v.zoom = p.zoom;
      const z = (p.zoom || 100) / 100;
      v.iframe.style.width = `${100 / z}%`;
      v.iframe.style.height = `${100 / z}%`;
      v.iframe.style.transform = z === 1 ? '' : `scale(${z})`;
    }
    if (v.refresh !== p.refresh) {
      v.refresh = p.refresh;
      clearInterval(v.timer);
      if (p.refresh > 0) v.timer = setInterval(() => reloadView(v), p.refresh * 1000);
    }

    const title = p.title || t("(unnamed)");
    v.el.querySelector('.placeholder b').textContent = title;
    v.el.querySelector('.title-badge').textContent = title;
    v.el.querySelector('.ov-title').textContent = title;
    const mon = (n) => {
      const r = n / d.s;
      return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, '');
    };
    // Physical monitors covered by the screen (M1 … left to right, top to bottom)
    const mons = [];
    for (let my = Math.floor(p.y / d.s); my <= Math.floor((p.y + p.h - 1) / d.s); my++)
      for (let mx = Math.floor(p.x / d.s); mx <= Math.floor((p.x + p.w - 1) / d.s); mx++)
        mons.push('M' + (my * cfg.grid.cols + mx + 1));
    v.el.querySelector('.ov-size').textContent = t("{0} × {1} monitors · {2}", [mon(p.w), mon(p.h), mons.join(', ')]);
    const ou = v.el.querySelector('.ov-url');
    ou.textContent = source.error || (url ? (p.sourceType === 'embed' ? 'Embed · ' : '') + url : t("No content — click to configure"));
    v.el.querySelector('.placeholder span').textContent = source.error || t("No content assigned");
    ou.classList.toggle('none', !url);
    ou.title = url || ''; 
  }

  function loadFrame(v) {
    clearTimeout(v.loadTimer);
    v.el.classList.toggle('is-loading', !!v.url);
    v.el.classList.remove('load-slow');
    v.el.querySelector('.frame-loading span').textContent = t('Loading…');
    v.el.setAttribute('aria-busy', String(!!v.url));
    v.iframe.onload = () => {
      clearTimeout(v.loadTimer);
      v.el.classList.remove('is-loading', 'load-slow');
      v.el.setAttribute('aria-busy', 'false');
    };
    if (v.url) v.loadTimer = setTimeout(() => {
      v.el.classList.add('load-slow');
      v.el.querySelector('.frame-loading span').textContent = t('Loading is taking longer. Check the source.');
      v.el.setAttribute('aria-busy', 'false');
    }, 15000);
    v.iframe.src = v.url || 'about:blank';
  }

  function reloadView(v) {
    if (v?.url) loadFrame(v);
  }

  function render() {
    window.WM.i18n.set(cfg.language);
    $('#t-toggle').textContent = t(toolbar.classList.contains('is-compact') ? 'Settings ▾' : 'Collapse ▴');
    document.body.classList.toggle("allow-source-swap", cfg.allowSourceSwap === true);
    const d = L.dims(cfg);
    const root = document.documentElement.style;
    root.setProperty('--gap', cfg.style.gap + 'px');
    root.setProperty('--bg', cfg.style.background);
    wall.style.gridTemplateColumns = `repeat(${d.C}, minmax(0, 1fr))`;
    wall.style.gridTemplateRows = `repeat(${d.R}, minmax(0, 1fr))`;

    const seen = new Set();
    cfg.panels.forEach((p) => {
      seen.add(p.id);
      let v = views.get(p.id);
      if (!v) {
        const el = panelTemplate();
        v = { el, iframe: el.querySelector('iframe'), url: null, zoom: null, refresh: null, timer: null };
        views.set(p.id, v);
        wall.appendChild(el);
      }
      updateView(v, p);
    });
    for (const [id, v] of views) {
      if (!seen.has(id)) {
        clearInterval(v.timer);
        clearTimeout(v.loadTimer);
        v.el.remove();
        views.delete(id);
      }
    }

    renderEmptyCells(d);
  }

  function renderEmptyCells(d) {
    wall.querySelectorAll('.empty-cell').forEach((e) => e.remove());
    if (!editing) return;
    const occ = L.occupancy(cfg);
    const frag = document.createDocumentFragment();
    for (let y = 0; y < d.R; y++)
      for (let x = 0; x < d.C; x++) {
        if (occ[y][x]) continue;
        const c = document.createElement('div');
        c.className = 'empty-cell';
        c.dataset.x = x;
        c.dataset.y = y;
        c.style.gridColumn = `${x + 1}`;
        c.style.gridRow = `${y + 1}`;
        c.textContent = '+';
        frag.appendChild(c);
      }
    wall.appendChild(frag);
  }

  // FLIP animation: measure before and after the change, then "fly" each panel from its old rect to the new one.
  function animate(mutate) {
    const before = new Map();
    views.forEach((v, id) => before.set(id, v.el.getBoundingClientRect()));
    mutate();
    render();
    views.forEach((v, id) => {
      const a = before.get(id);
      if (!a) {
        v.el.animate(
          [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.2,.9,.25,1)' }
        );
        return;
      }
      const b = v.el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = a.width / b.width;
      const sy = a.height / b.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      v.el.classList.add('moving');
      const anim = v.el.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', transform: `translate(${dx * 0.04}px, ${dy * 0.04}px) scale(1.01)`, offset: 0.85 },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: 620, easing: 'cubic-bezier(.2,.9,.25,1)' }
      );
      anim.onfinish = anim.oncancel = () => v.el.classList.remove('moving');
    });
  }

  // ───────── Saving & undo ─────────

  function setStatus(text, bad) {
    const st = $('#t-status');
    st.textContent = text;
    st.classList.toggle('bad', !!bad);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    cfg.updatedAt = Date.now();
    const snapshot = JSON.parse(JSON.stringify(cfg));
    setStatus(t('Saving…'));
    const task = saveQueue.catch(() => {}).then(() => S.save(snapshot));
    saveQueue = task;
    return task.then(where => {
      setStatus(where === 'server' ? '✓ data/config.json' : t('✓ in browser (no server)'));
      return where;
    }).catch(error => {
      setStatus(t('✗ Save failed: ') + error.message, true);
      throw error;
    });
  }

  function commit() {
    cfg.updatedAt = Date.now();
    clearTimeout(saveTimer);
    setStatus(t('Saving…'));
    saveTimer = setTimeout(() => saveNow().catch(() => {}), 300);
  }

  function pushUndo() {
    undoStack.push(JSON.stringify(cfg));
    if (undoStack.length > 60) undoStack.shift();
  }

  function undo() {
    const snap = undoStack.pop();
    if (!snap) return toast(t("Nothing to undo"));
    animate(() => { cfg = L.normalize(JSON.parse(snap)); });
    if (selectedId && !find(selectedId)) closeDrawer();
    else fillDrawer();
    commit();
    syncToolbar();
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ───────── Edit mode ─────────

  function setEditing(on) {
    if (drawerSaving) return;
    if (on && !editing && cfg.security.pin) {
      const v = prompt('PIN:');
      if (v !== cfg.security.pin) {
        if (v !== null) toast(t("Incorrect PIN"));
        return;
      }
    }
    editing = on;
    document.body.classList.toggle('editing', on);
    syncUrl();
    if (!on) {
      closeDrawer();
      selectedId = null;
      hidePreview();
    }
    syncToolbar();
    render();
  }

  // The URL reflects the mode: /edit → editing, / → wall
  const EDIT_RE = /\/edit\/?$/;
  function syncUrl() {
    if (!location.protocol.startsWith('http')) return;
    const base = location.pathname.replace(EDIT_RE, '/');
    const want = editing ? base + 'edit' : base;
    if (location.pathname !== want) history.replaceState(null, '', want + location.hash);
  }

  function syncToolbar() {
    window.WM.i18n.set(cfg.language);
    $('#t-language').value = cfg.language;
    $('#t-toggle').textContent = t(toolbar.classList.contains('is-compact') ? 'Settings ▾' : 'Collapse ▴');
    $('#t-rows').value = cfg.grid.rows;
    $('#t-cols').value = cfg.grid.cols;
    $('#t-sub').value = cfg.grid.sub;
    $('#t-gap').value = cfg.style.gap;
    $('#t-bg').value = cfg.style.background;
    $('#t-pin').value = cfg.security.pin;
    $('#t-source-swap').checked = cfg.allowSourceSwap === true;
    const sel = $('#t-preset');
    const prev = sel.value;
    sel.innerHTML = '';
    L.presets(cfg).forEach((p) => {
      const o = document.createElement('option');
      o.value = p.key;
      o.textContent = p.name;
      sel.appendChild(o);
    });
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }

  function setGrid(rows, cols, sub) {
    rows = Math.max(1, Math.min(16, rows | 0 || 1));
    cols = Math.max(1, Math.min(16, cols | 0 || 1));
    if (rows === cfg.grid.rows && cols === cfg.grid.cols && sub === cfg.grid.sub) return;
    pushUndo();
    const grew = rows > cfg.grid.rows || cols > cfg.grid.cols;
    animate(() => {
      if (sub !== cfg.grid.sub) L.rescaleSub(cfg, sub);
      cfg.grid.rows = rows;
      cfg.grid.cols = cols;
      L.normalize(cfg);
      if (grew) L.fillEmpty(cfg);
    });
    if (selectedId && !find(selectedId)) closeDrawer();
    commit();
    syncToolbar();
  }

  // ───────── Cell under the pointer ─────────

  function unitAt(cx, cy) {
    const r = wall.getBoundingClientRect();
    const d = L.dims(cfg);
    const x = Math.floor(((cx - r.left) / r.width) * d.C);
    const y = Math.floor(((cy - r.top) / r.height) * d.R);
    return { x: Math.max(0, Math.min(d.C - 1, x)), y: Math.max(0, Math.min(d.R - 1, y)) };
  }

  function showPreview(r, ok, label) {
    previewEl.style.gridColumn = `${r.x + 1} / span ${r.w}`;
    previewEl.style.gridRow = `${r.y + 1} / span ${r.h}`;
    previewEl.classList.add('show');
    previewEl.classList.toggle('bad', !ok);
    previewEl.firstElementChild.textContent = label;
    wall.appendChild(previewEl); // keep it on top
  }
  function hidePreview() {
    previewEl.classList.remove('show');
  }

  // Shared helper for tracking a pointer gesture
  function track(e, onMove, onUp) {
    wall.setPointerCapture(e.pointerId);
    const move = (ev) => onMove(ev);
    const up = (ev) => {
      wall.removeEventListener('pointermove', move);
      wall.removeEventListener('pointerup', up);
      wall.removeEventListener('pointercancel', up);
      onUp(ev, ev.type === 'pointercancel');
    };
    wall.addEventListener('pointermove', move);
    wall.addEventListener('pointerup', up);
    wall.addEventListener('pointercancel', up);
  }

  // ───────── Drag & drop ─────────

  function startDrag(e, id, sourceOnly = false) {
    const p = find(id);
    const v = views.get(id);
    const rect = v.el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    const u0 = unitAt(e.clientX, e.clientY);
    const grab = { dx: u0.x - p.x, dy: u0.y - p.y };
    const k = Math.min(1, 300 / rect.width, 190 / rect.height);
    const off = { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
    let ghost = null;
    let targetId = null;
    let place = null;

    const clearTarget = () => {
      if (targetId) views.get(targetId)?.el.classList.remove('drop-target');
      targetId = null;
    };

    track(
      e,
      (ev) => {
        if (!ghost) {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
          ghost = document.createElement('div');
          ghost.className = 'ghost';
          ghost.style.width = rect.width * k + 'px';
          ghost.style.height = rect.height * k + 'px';
          ghost.innerHTML = `<b></b><small></small>`;
          ghost.querySelector('b').textContent = p.title || t("(unnamed)");
          ghost.querySelector('small').textContent = panelSource(p).url || t("No URL");
          document.body.appendChild(ghost);
          ghost.animate([{ transform: `translate(${rect.left}px, ${rect.top}px) scale(${1 / k})`, opacity: 0.3 }, { opacity: 1 }], {
            duration: 180,
            easing: 'ease-out',
          });
          v.el.classList.add('dragging');
          document.body.classList.add('is-dragging');
        }
        ghost.style.transform = `translate(${ev.clientX - off.x}px, ${ev.clientY - off.y}px) rotate(-2deg)`;

        const hit = document.elementFromPoint(ev.clientX, ev.clientY);
        const tp = hit && hit.closest('.panel');
        if (tp && tp.dataset.id !== id) {
          if (targetId !== tp.dataset.id) {
            clearTarget();
            targetId = tp.dataset.id;
            tp.classList.add('drop-target');
          }
          place = null;
          hidePreview();
          return;
        }
        clearTarget();
        if (sourceOnly) { place = null; hidePreview(); return; }
        const u = unitAt(ev.clientX, ev.clientY);
        const r = { x: u.x - grab.dx, y: u.y - grab.dy, w: p.w, h: p.h };
        const moved = r.x !== p.x || r.y !== p.y;
        const inside = L.inBounds(r, L.dims(cfg));
        if (moved && inside && L.isFree(cfg.panels, r, [id])) {
          place = r;
          showPreview(r, true, t("Move here"));
        } else {
          place = null;
          if (moved && inside) showPreview(r, false, t("Area occupied"));
          else hidePreview();
        }
      },
      (ev, cancelled) => {
        v.el.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        hidePreview();
        const tId = targetId;
        clearTarget();

        if (!ghost) {
          if (!cancelled && !sourceOnly) select(id);
          return;
        }
        let dest = null;
        if (!cancelled && tId) {
          const targetPanel = find(tId);
          dest = views.get(tId).el.getBoundingClientRect();
          pushUndo();
          animate(() => {
            if (sourceOnly) {
              for (const key of ['title', 'url', 'sourceType', 'embedCode', 'zoom', 'refresh', 'showTitle']) {
                const previous = p[key]; p[key] = targetPanel[key]; targetPanel[key] = previous;
              }
              return;
            }
            const g = { x: p.x, y: p.y, w: p.w, h: p.h };
            Object.assign(p, { x: targetPanel.x, y: targetPanel.y, w: targetPanel.w, h: targetPanel.h });
            Object.assign(targetPanel, g);
          });
          commit();
          toast(sourceOnly ? t("⇄ Content swapped") : t("⇄ Positions swapped"));
        } else if (!cancelled && place) {
          pushUndo();
          animate(() => Object.assign(p, { x: place.x, y: place.y }));
          commit();
        }
        const g = ghost;
        const from = g.style.transform;
        const to = dest
          ? `translate(${dest.left + dest.width / 2 - (rect.width * k) / 2}px, ${dest.top + dest.height / 2 - (rect.height * k) / 2}px) scale(.6)`
          : `${from} scale(.8)`;
        g.animate([{ transform: from, opacity: 1 }, { transform: to, opacity: 0 }], {
          duration: 260,
          easing: 'ease-in',
        }).onfinish = () => g.remove();
      }
    );
  }

  // ───────── Resize from the corners ─────────

  function startResize(e, id, corner) {
    const p = find(id);
    // The cell opposite the dragged corner stays anchored
    const anchor = {
      x: corner.includes('w') ? p.x + p.w - 1 : p.x,
      y: corner.includes('n') ? p.y + p.h - 1 : p.y,
    };
    let res = null;
    const marked = new Set();
    const unmark = () => {
      marked.forEach((mid) => views.get(mid)?.el.classList.remove('will-merge'));
      marked.clear();
    };

    track(
      e,
      (ev) => {
        const r = L.bbox(anchor, unitAt(ev.clientX, ev.clientY));
        const hits = cfg.panels.filter((o) => o.id !== id && L.intersects(o, r));
        const ok = hits.every((o) => L.contains(r, o));
        res = { r, ok, hits };
        unmark();
        if (ok) hits.forEach((o) => { marked.add(o.id); views.get(o.id).el.classList.add('will-merge'); });
        const s = cfg.grid.sub;
        const size = `${+(r.w / s).toFixed(2)} × ${+(r.h / s).toFixed(2)}`;
        showPreview(r, ok, ok ? (hits.length ? t("{0} · {1} screens will merge", [size, hits.length]) : size) : t("Partially overlaps another screen"));
      },
      (ev, cancelled) => {
        unmark();
        hidePreview();
        if (cancelled || !res || !res.ok) return;
        const { r, hits } = res;
        if (r.x === p.x && r.y === p.y && r.w === p.w && r.h === p.h) return;
        pushUndo();
        animate(() => {
          cfg.panels = cfg.panels.filter((o) => !hits.includes(o));
          Object.assign(p, r);
        });
        commit();
        if (hits.length) toast(t("{0} screens merged", [hits.length]));
      }
    );
  }

  // ───────── Draw a new screen on empty cells ─────────

  function startCreate(e, x, y) {
    const anchor = { x, y };
    let res = { r: { x, y, w: 1, h: 1 }, ok: true };
    showPreview(res.r, true, t('New screen'));
    track(
      e,
      (ev) => {
        const r = L.bbox(anchor, unitAt(ev.clientX, ev.clientY));
        const ok = L.isFree(cfg.panels, r);
        res = { r, ok };
        showPreview(r, ok, ok ? t("New screen {0}×{1}", [r.w, r.h]) : t("Area occupied"));
      },
      (ev, cancelled) => {
        hidePreview();
        if (cancelled || !res.ok) return;
        pushUndo();
        const np = L.newPanel(res.r, { title: L.nextTitle(cfg) });
        animate(() => cfg.panels.push(np));
        commit();
        select(np.id);
      }
    );
  }

  // ───────── Panel actions ─────────

  function splitPanel(id) {
    const p = find(id);
    const rects = L.splitRects(cfg, p);
    if (rects.length < 2) return toast(t('This screen is already at its smallest size'));
    pushUndo();
    animate(() => {
      const [first, ...rest] = rects;
      Object.assign(p, first);
      rest.forEach((r) => cfg.panels.push(L.newPanel(r, { title: L.nextTitle(cfg) })));
    });
    commit();
    fillDrawer();
    toast(t("Split into {0} sections", [rects.length]));
  }

  function deletePanel(id) {
    const v = views.get(id);
    pushUndo();
    const done = () => {
      cfg.panels = cfg.panels.filter((p) => p.id !== id);
      if (selectedId === id) closeDrawer();
      render();
      commit();
      toast(t("Deleted · Ctrl+Z to undo"));
    };
    if (v) {
      v.el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.85)' }], {
        duration: 220,
        easing: 'ease-in',
      }).onfinish = done;
    } else done();
  }

  // ───────── Settings drawer ─────────

  function select(id) {
    if (drawerSaving) return;
    drawerDraft = { ...find(id) };
    $('#f-save-status').textContent = '';
    selectedId = id;
    render();
    fillDrawer();
    drawer.classList.add('open');
  }

  function closeDrawer() {
    if (drawerSaving) return;
    drawerDraft = null;
    drawer.classList.remove('open');
    selectedId = null;
    if (cfg) render();
  }

  function fillDrawer() {
    const p = drawerDraft;
    if (!p) return;
    $('#f-title').value = p.title;
    $('#f-url').value = p.url;
    $('#f-source').value = p.sourceType || 'url';
    $('#f-embed').value = p.embedCode || '';
    syncSourceFields(p);
    $('#f-zoom').value = p.zoom;
    $('#f-zoom-val').textContent = p.zoom + '%';
    $('#f-refresh').value = p.refresh;
    $('#f-show').checked = p.showTitle;
    const s = cfg.grid.sub;
    $('#f-info').textContent =
      t("Position: column {0}, row {1} · size {2} × {3} monitors", [p.x / s + 1, p.y / s + 1, p.w / s, p.h / s]).replace(/\.(\d{2})\d+/g, '.$1');
  }

  // Read the iframe URL only; never execute pasted markup in the editor.
  function panelSource(p) {
    if (p.sourceType !== 'embed') return { url: (p.url || '').trim() };
    const code = (p.embedCode || '').trim();
    if (!code) return { url: '' };
    const doc = new DOMParser().parseFromString(code, 'text/html');
    const frames = doc.querySelectorAll('iframe');
    if (frames.length !== 1 || doc.querySelector('script') || frames[0].hasAttribute('srcdoc')) {
      return { url: '', error: t("Enter embed code with one iframe. Script and srcdoc are not supported.") };
    }
    try {
      const src = frames[0].getAttribute('src') || '';
      const url = new URL(src.startsWith('//') ? 'https:' + src : src);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      return { url: url.href };
    } catch {
      return { url: '', error: t("Embed code must contain a valid HTTP or HTTPS URL.") };
    }
  }

  function syncSourceFields(p) {
    const embed = p.sourceType === 'embed';
    $('#f-url-group').hidden = embed;
    $('#f-embed-group').hidden = !embed;
    const error = panelSource(p).error || '';
    $('#f-source-error').textContent = error;
    $('#f-source-error').hidden = !error;
  }

  function normalizeUrl(u) {
    u = u.trim();
    if (!u) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('/')) return u;
    return 'https://' + u;
  }

  function bindDrawer() {
    const field = (sel, apply, evt = 'input') => {
      const el = $(sel);
      el.addEventListener(evt, () => {
        const p = drawerDraft;
        if (!p || drawerSaving) return;
        apply(p, el);
        $('#f-save-status').textContent = t('Changes have not been applied.');
      });
    };
    field('#f-source', (p, el) => { p.sourceType = el.value; syncSourceFields(p); }, 'change');
    field('#f-embed', (p, el) => { p.embedCode = el.value; syncSourceFields(p); }, 'change');
    field('#f-title', (p, el) => { p.title = el.value; });
    field('#f-url', (p, el) => { p.url = normalizeUrl(el.value); el.value = p.url; }, 'change');
    field('#f-zoom', (p, el) => { p.zoom = +el.value; $('#f-zoom-val').textContent = p.zoom + '%'; });
    field('#f-refresh', (p, el) => { p.refresh = Math.max(0, Math.round(+el.value || 0)); });
    field('#f-show', (p, el) => { p.showTitle = el.checked; }, 'change');

    $('#f-apply').addEventListener('click', async () => {
      if (!drawerDraft || drawerSaving) return;
      const error = panelSource(drawerDraft).error;
      if (error) { syncSourceFields(drawerDraft); return; }
      const p = find(selectedId);
      if (!p) return;
      pushUndo();
      Object.assign(p, drawerDraft);
      render();
      drawerSaving = true;
      drawer.classList.add('saving');
      drawer.setAttribute('aria-busy', 'true');
      document.body.classList.add('saving-drawer');
      drawer.querySelectorAll('button,input,select,textarea').forEach(el => { el.disabled = true; });
      $('#f-save-status').textContent = t('Saving…');
      let saved = false;
      try {
        const where = await saveNow();
        toast(t(where === 'server' ? 'Saved' : 'Saved in browser'));
        saved = true;
      } catch (error) {
        $('#f-save-status').textContent = t('✗ Save failed: ') + error.message;
      } finally {
        drawerSaving = false;
        drawer.classList.remove('saving');
        drawer.setAttribute('aria-busy', 'false');
        document.body.classList.remove('saving-drawer');
        drawer.querySelectorAll('button,input,select,textarea').forEach(el => { el.disabled = false; });
      }
      if (saved) closeDrawer();
    });

    $('#f-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
    drawer.querySelector('[data-close]').addEventListener('click', closeDrawer);
    drawer.querySelector('.d-actions').addEventListener('click', (e) => {
      const act = e.target.closest('[data-do]')?.dataset.do;
      const p = selectedId && find(selectedId);
      if (!act || !p) return;
      if (act === 'reload') reloadView(views.get(p.id));
      if (act === 'open') {
        const url = panelSource(p).url;
        if (url) window.open(url, '_blank', 'noopener');
      }
      if (act === 'split') splitPanel(p.id);
      if (act === 'delete') deletePanel(p.id);
    });
  }

  // ───────── Toolbar ─────────

  function bindToolbar() {
    $('#t-language').addEventListener('change', (e) => {
      pushUndo();
      cfg.language = e.target.value;
      syncToolbar();
      render();
      fillDrawer();
      commit();
    });
    const gridChange = () => setGrid(+$('#t-rows').value, +$('#t-cols').value, +$('#t-sub').value);
    $('#t-rows').addEventListener('change', gridChange);
    $('#t-cols').addEventListener('change', gridChange);
    $('#t-sub').addEventListener('change', gridChange);

    $('#t-apply').addEventListener('click', () => {
      const preset = L.presets(cfg).find((p) => p.key === $('#t-preset').value);
      if (!preset) return;
      pushUndo();
      animate(() => L.applyRects(cfg, preset.rects));
      if (selectedId && !find(selectedId)) closeDrawer();
      else fillDrawer();
      commit();
      toast(t("Layout applied"));
    });
    $('#t-fill').addEventListener('click', () => {
      const before = cfg.panels.length;
      pushUndo();
      animate(() => L.fillEmpty(cfg));
      const added = cfg.panels.length - before;
      if (!added) { undoStack.pop(); return toast(t("No empty areas")); }
      commit();
      toast(t("{0} new screens added", [added]));
    });

    $('#t-gap').addEventListener('change', (e) => {
      pushUndo();
      cfg.style.gap = Math.max(0, Math.min(60, +e.target.value || 0));
      render();
      commit();
    });
    $('#t-bg').addEventListener('input', (e) => {
      cfg.style.background = e.target.value;
      render();
      commit();
    });
    $('#t-pin').addEventListener('change', (e) => {
      cfg.security.pin = e.target.value.trim();
      commit();
      toast(cfg.security.pin ? t("PIN set") : t("PIN removed"));
    });

    $('#t-source-swap').addEventListener('change', (e) => {
      pushUndo();
      cfg.allowSourceSwap = e.target.checked;
      render();
      commit();
    });
    $('#t-undo').addEventListener('click', undo);
    $('#t-export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `wall-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#t-import').addEventListener('click', () => $('#t-file').click());
    $('#t-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || !data.grid || !Array.isArray(data.panels)) throw new Error(t('Missing grid / panels'));
        pushUndo();
        animate(() => { cfg = L.normalize(data); });
        closeDrawer();
        commit();
        syncToolbar();
        toast(t("Imported"));
      } catch (err) {
        toast(t("Could not read file: ") + err.message);
      }
    });
    const handle = $('#t-drag');
    const place = (x, y) => {
      const r = toolbar.getBoundingClientRect();
      toolbar.style.left = `${Math.max(12, Math.min(x, innerWidth - r.width - 12))}px`;
      toolbar.style.top = `${Math.max(12, Math.min(y, innerHeight - r.height - 12))}px`;
      toolbar.style.bottom = 'auto';
    };
    const clamp = () => {
      if (!editing) return;
      const r = toolbar.getBoundingClientRect();
      place(r.left, r.top);
    };
    $('#t-toggle').addEventListener('click', () => {
      const compact = toolbar.classList.toggle('is-compact');
      $('#t-toggle').setAttribute('aria-expanded', String(!compact));
      $('#t-toggle').textContent = compact ? t("Settings ▾") : t("Collapse ▴");
      clamp();
    });
    let moving = null;
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const r = toolbar.getBoundingClientRect();
      moving = { id: e.pointerId, x: e.clientX - r.left, y: e.clientY - r.top };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (moving && moving.id === e.pointerId) place(e.clientX - moving.x, e.clientY - moving.y);
    });
    const stop = () => { moving = null; };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', stop);
    handle.addEventListener('keydown', (e) => {
      const delta = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
      if (!delta) return;
      e.preventDefault();
      const r = toolbar.getBoundingClientRect();
      place(r.left + delta[0], r.top + delta[1]);
    });
    window.addEventListener('resize', clamp);
    new ResizeObserver(clamp).observe(toolbar);
    $('#t-move').addEventListener('click', () => {
      const r = toolbar.getBoundingClientRect();
      place(r.left, r.top < innerHeight / 2 ? innerHeight - r.height - 12 : 12);
    });
    $('#t-done').addEventListener('click', () => setEditing(false));
  }

  // ───────── Events ─────────

  function bindWall() {
    wall.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (!editing) {
        const handle = e.target.closest('.source-swap-handle');
        if (cfg.allowSourceSwap && handle) {
          e.preventDefault();
          startDrag(e, handle.closest('.panel').dataset.id, true);
        }
        return;
      }
      if (e.target.closest('[data-act], .ov-url:not(.none)')) return;
      const handle = e.target.closest('.handle');
      const panelEl = e.target.closest('.panel');
      const empty = e.target.closest('.empty-cell');
      if (handle && panelEl) {
        e.preventDefault();
        startResize(e, panelEl.dataset.id, handle.dataset.corner);
      } else if (panelEl) {
        e.preventDefault();
        startDrag(e, panelEl.dataset.id);
      } else if (empty) {
        e.preventDefault();
        startCreate(e, +empty.dataset.x, +empty.dataset.y);
      }
    });

    wall.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      const panelEl = e.target.closest('.panel');
      if (!btn || !panelEl || !editing) return;
      const id = panelEl.dataset.id;
      const act = btn.dataset.act;
      if (act === 'edit') select(id);
      if (act === 'reload') reloadView(views.get(id));
      if (act === 'split') splitPanel(id);
      if (act === 'delete') deletePanel(id);
    });

    $('#hotcorner button').addEventListener('click', () => setEditing(true));

    document.addEventListener('keydown', (e) => {
      if (drawerSaving) return;
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditing(!editing);
        return;
      }
      if (!editing) return;
      if (e.key === 'Escape') {
        if (drawer.classList.contains('open')) closeDrawer();
        else setEditing(false);
      } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && selectedId) {
        deletePanel(selectedId);
      }
    });

    // In view mode the cursor hides after 3 seconds of inactivity
    let idle;
    document.addEventListener('mousemove', () => {
      document.body.classList.remove('cursor-hidden');
      clearTimeout(idle);
      idle = setTimeout(() => { if (!editing) document.body.classList.add('cursor-hidden'); }, 3000);
    });
  }

  // Picks up changes saved from another machine (e.g. a laptop) and re-renders the wall
  function startSync() {
    setInterval(async () => {
      if (editing || document.body.classList.contains('is-dragging') || S.mode !== 'server') return;
      const remote = await S.fetchRemote();
      if (remote && remote.grid && remote.updatedAt && remote.updatedAt !== cfg.updatedAt) {
        animate(() => { cfg = L.normalize(remote); });
        syncToolbar();
      }
    }, 5000);
  }

  // ───────── Startup ─────────

  async function init() {
    await window.WM.i18n.load();
    window.WM.i18n.bind(document.body);
    const data = await S.load();
    if (data && data.grid) {
      cfg = L.normalize(data);
    } else {
      cfg = L.normalize({ grid: { rows: 3, cols: 3, sub: 1 }, panels: [] });
      L.fillEmpty(cfg);
    }
    bindWall();
    bindToolbar();
    bindDrawer();
    syncToolbar();
    render();
    setStatus(S.mode === 'server' ? t("File mode") : t("Browser mode (no server)"));
    if (!data) commit();
    startSync();

    const q = new URLSearchParams(location.search);
    if (EDIT_RE.test(location.pathname) || location.hash === '#edit' || q.has('edit')) setEditing(true);
    syncUrl(); // fix the URL if the PIN prompt was cancelled or a legacy ?edit link was used
  }

  init();
})();
