// Layout logic: grid, panels, presets. No DOM dependencies.
//
// Coordinates are measured in "units". One monitor = sub × sub units.
// E.g. a 3×3 wall with sub=2 is a 6×6 unit grid, so every monitor can be split into 4 parts.
(function () {
  const t = (...args) => window.WM.i18n.t(...args);
  const L = {};

  L.uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const int = (v, min, max, def) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  };

  L.dims = (cfg) => ({
    C: cfg.grid.cols * cfg.grid.sub,
    R: cfg.grid.rows * cfg.grid.sub,
    s: cfg.grid.sub,
  });

  L.intersects = (a, b) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  L.contains = (outer, inner) =>
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h;

  L.inBounds = (r, d) =>
    r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= d.C && r.y + r.h <= d.R;

  L.isFree = (panels, r, ignoreIds = []) =>
    !panels.some((p) => !ignoreIds.includes(p.id) && L.intersects(p, r));

  // Bounding rectangle of two cells (used when dragging a corner or drawing on empty cells)
  L.bbox = (a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x) + 1,
    h: Math.abs(a.y - b.y) + 1,
  });

  L.occupancy = (cfg) => {
    const d = L.dims(cfg);
    const g = Array.from({ length: d.R }, () => Array(d.C).fill(null));
    cfg.panels.forEach((p) => {
      for (let y = p.y; y < p.y + p.h && y < d.R; y++)
        for (let x = p.x; x < p.x + p.w && x < d.C; x++) g[y][x] = p.id;
    });
    return g;
  };

  L.newPanel = (r, extra = {}) =>
    Object.assign(
      { id: L.uid(), title: '', url: '', sourceType: 'url', embedCode: '', zoom: 100, refresh: 0, showTitle: false },
      extra,
      { x: r.x, y: r.y, w: r.w, h: r.h }
    );

  L.sortReading = (ps) => ps.slice().sort((a, b) => a.y - b.y || a.x - b.x);

  L.nextTitle = (cfg) => {
    let max = 0;
    cfg.panels.forEach((p) => {
      // Default names in any interface language: "Screen 3", "Ekran 3", "Экран 3"
      const m = /^(?:Screen|Ekran|Экран) (\d+)$/.exec(p.title || '');
      if (m) max = Math.max(max, +m[1]);
    });
    return t('Screen {0}', [max + 1]);
  };

  // Turns whatever is in the file into a valid layout: clamps to bounds, drops overlapping panels.
  L.normalize = (cfg) => {
    cfg = cfg && typeof cfg === 'object' ? cfg : {};
    cfg.version = 1;
    cfg.language = ['az', 'en', 'ru'].includes(cfg.language) ? cfg.language : 'en';
    cfg.updatedAt = Number(cfg.updatedAt) || 0;
    const g = cfg.grid || {};
    cfg.grid = {
      rows: int(g.rows, 1, 16, 3),
      cols: int(g.cols, 1, 16, 3),
      sub: int(g.sub, 1, 4, 1),
    };
    const st = cfg.style || {};
    cfg.style = {
      gap: int(st.gap, 0, 60, 0),
      background: /^#[0-9a-f]{6}$/i.test(st.background || '') ? st.background : '#000000',
    };
    cfg.allowSourceSwap = cfg.allowSourceSwap === true;
    cfg.security = { pin: String((cfg.security && cfg.security.pin) || '') };

    const d = L.dims(cfg);
    const out = [];
    (Array.isArray(cfg.panels) ? cfg.panels : []).forEach((raw) => {
      if (!raw || typeof raw !== 'object') return;
      const p = L.newPanel(
        { x: int(raw.x, 0, 999, 0), y: int(raw.y, 0, 999, 0), w: int(raw.w, 1, 999, 1), h: int(raw.h, 1, 999, 1) },
        {
          id: typeof raw.id === 'string' && raw.id ? raw.id : L.uid(),
          title: String(raw.title || ''),
          url: String(raw.url || ''),
          sourceType: raw.sourceType === 'embed' ? 'embed' : 'url',
          embedCode: String(raw.embedCode || ''),
          zoom: int(raw.zoom, 10, 500, 100),
          refresh: int(raw.refresh, 0, 86400, 0),
          showTitle: !!raw.showTitle,
        }
      );
      if (p.x >= d.C || p.y >= d.R) return;
      p.w = Math.min(p.w, d.C - p.x);
      p.h = Math.min(p.h, d.R - p.y);
      if (out.some((o) => o.id === p.id)) p.id = L.uid();
      if (!L.isFree(out, p)) return;
      out.push(p);
    });
    cfg.panels = out;
    return cfg;
  };

  // Fills empty space: first whole free monitors, then any remaining single units.
  L.fillEmpty = (cfg) => {
    const { rows, cols, sub: s } = cfg.grid;
    for (let my = 0; my < rows; my++)
      for (let mx = 0; mx < cols; mx++) {
        const r = { x: mx * s, y: my * s, w: s, h: s };
        if (L.isFree(cfg.panels, r)) cfg.panels.push(L.newPanel(r, { title: L.nextTitle(cfg) }));
      }
    const d = L.dims(cfg);
    for (let y = 0; y < d.R; y++)
      for (let x = 0; x < d.C; x++) {
        const r = { x, y, w: 1, h: 1 };
        if (L.isFree(cfg.panels, r)) cfg.panels.push(L.newPanel(r, { title: L.nextTitle(cfg) }));
      }
    return cfg;
  };

  // Converts coordinates to the new unit size when the monitor subdivision changes.
  L.rescaleSub = (cfg, newSub) => {
    const k = newSub / cfg.grid.sub;
    cfg.panels.forEach((p) => {
      const x0 = Math.floor(p.x * k), y0 = Math.floor(p.y * k);
      const x1 = Math.max(x0 + 1, Math.ceil((p.x + p.w) * k));
      const y1 = Math.max(y0 + 1, Math.ceil((p.y + p.h) * k));
      Object.assign(p, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    });
    cfg.grid.sub = newSub;
    return cfg;
  };

  // Splits a panel: into monitors if it spans several, otherwise into single units.
  L.splitRects = (cfg, p) => {
    const s = cfg.grid.sub;
    const aligned = p.x % s === 0 && p.y % s === 0 && p.w % s === 0 && p.h % s === 0;
    const step = aligned && (p.w > s || p.h > s) ? s : 1;
    const rects = [];
    for (let y = p.y; y < p.y + p.h; y += step)
      for (let x = p.x; x < p.x + p.w; x += step) rects.push({ x, y, w: step, h: step });
    return rects;
  };

  // Presets are generated for the current grid every time (works for 3×3, 4×4, 3×4, …).
  L.presets = (cfg) => {
    const { rows: R, cols: C, sub: s } = cfg.grid;
    const m = (x, y, w, h) => ({ x: x * s, y: y * s, w: w * s, h: h * s });
    const list = [];
    const add = (key, name, rects) => list.push({ key, name, rects });
    const singlesExcept = (skip) => {
      const out = [];
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (!skip(x, y)) out.push(m(x, y, 1, 1));
      return out;
    };

    add('singles', t("Each monitor separately ({0} screens)", [R * C]), singlesExcept(() => false));
    add('full', t("Whole wall — one screen"), [m(0, 0, C, R)]);

    if (s > 1) {
      const units = [];
      for (let y = 0; y < R * s; y++) for (let x = 0; x < C * s; x++) units.push({ x, y, w: 1, h: 1 });
      add('units', t("Smallest subdivision ({0} screens)", [units.length]), units);
    }
    if (R > 1) add('rows', t("One screen per row ({0})", [R]), Array.from({ length: R }, (_, y) => m(0, y, C, 1)));
    if (C > 1) add('cols', t("One screen per column ({0})", [C]), Array.from({ length: C }, (_, x) => m(x, 0, 1, R)));

    if (R > 1 && C > 1) {
      add('big-tl', t("Large {0}×{1} + edges", [C - 1, R - 1]),
        [m(0, 0, C - 1, R - 1), ...singlesExcept((x, y) => x < C - 1 && y < R - 1)]);
      add('big-left', t("Large left {0}×{1} + right column", [C - 1, R]),
        [m(0, 0, C - 1, R), ...singlesExcept((x) => x < C - 1)]);
      add('big-top', t("Large top {0}×{1} + bottom row", [C, R - 1]),
        [m(0, 0, C, R - 1), ...singlesExcept((x, y) => y < R - 1)]);
    }
    if (C >= 3) {
      add('center-col', t("Tall center screen + sides"),
        [m(1, 0, C - 2, R), ...singlesExcept((x) => x >= 1 && x <= C - 2)]);
    }
    if (R >= 3 && C >= 3) {
      add('center-big', t("Large center {0}×{1} + border", [C - 2, R - 2]),
        [m(1, 1, C - 2, R - 2), ...singlesExcept((x, y) => x >= 1 && x <= C - 2 && y >= 1 && y <= R - 2)]);
    }
    if (C % 2 === 0 && C > 1) add('halves-v', t("Left / right halves"), [m(0, 0, C / 2, R), m(C / 2, 0, C / 2, R)]);
    if (R % 2 === 0 && R > 1) add('halves-h', t("Top / bottom halves"), [m(0, 0, C, R / 2), m(0, R / 2, C, R / 2)]);
    if (C % 2 === 0 && R % 2 === 0) {
      const w = C / 2, h = R / 2;
      add('quads', t("4 equal sections"), [m(0, 0, w, h), m(w, 0, w, h), m(0, h, w, h), m(w, h, w, h)]);
    }
    return list;
  };

  // Applies a preset. Existing panel content (URL, name, …) moves to the new slots in reading order.
  L.applyRects = (cfg, rects) => {
    const old = L.sortReading(cfg.panels);
    const next = [];
    L.sortReading(rects).forEach((r, i) => {
      const p = old[i]
        ? L.newPanel(r, old[i])
        : L.newPanel(r, { title: L.nextTitle({ panels: old.concat(next) }) });
      next.push(p);
    });
    cfg.panels = next;
    return cfg;
  };

  window.WM = window.WM || {};
  window.WM.layout = L;
})();
