// Persistence: data/config.json when the server is available, otherwise the browser's localStorage.
(function () {
  const LS_KEY = 'wall_monitor_config';
  const S = { mode: 'local' };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function getRemote() {
    const r = await fetch('api/config', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  S.load = async () => {
    // On boot the browser may start before the server is up, so retry a few times.
    const tries = location.protocol.startsWith('http') ? 8 : 0;
    for (let i = 0; i < tries; i++) {
      try {
        const data = await getRemote();
        S.mode = 'server';
        return data;
      } catch {
        await sleep(1000);
      }
    }
    S.mode = 'local';
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  S.save = async (cfg) => {
    const body = JSON.stringify(cfg, null, 2);
    try { localStorage.setItem(LS_KEY, body); } catch { /* storage full or blocked, ignore */ }
    if (S.mode !== 'server') return 'local';
    const r = await fetch('api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return 'server';
  };

  S.fetchRemote = async () => {
    if (S.mode !== 'server') return null;
    try { return await getRemote(); } catch { return null; }
  };

  window.WM = window.WM || {};
  window.WM.store = S;
})();
