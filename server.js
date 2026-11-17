// WallGrid: tiny, dependency-free server.
// Serves the static app (public/) and persists the layout to data/config.json.
//   node server.js            → http://127.0.0.1:8080
//   PORT=9000 HOST=0.0.0.0 node server.js   → reachable from the local network

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG = path.join(DATA_DIR, 'config.json');
const BACKUP = path.join(DATA_DIR, 'config.backup.json');
const EXAMPLE = path.join(DATA_DIR, 'config.example.json');
const MAX_BODY = 2 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readConfig(res) {
  fs.readFile(CONFIG, 'utf8', (err, txt) => {
    if (err && err.code === 'ENOENT') {
      // First run: start from the bundled demo layout (if present) instead of a blank wall
      return fs.readFile(EXAMPLE, 'utf8', (err2, demo) => send(res, 200, err2 ? 'null' : demo));
    }
    if (err) return send(res, 500, JSON.stringify({ error: err.message }));
    send(res, 200, txt);
  });
}

function writeConfig(req, res) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      send(res, 413, JSON.stringify({ error: 'Too large' }));
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (res.writableEnded) return;
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }));
    }
    if (!data || typeof data !== 'object' || !data.grid || !Array.isArray(data.panels)) {
      return send(res, 400, JSON.stringify({ error: 'grid and panels are required' }));
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(CONFIG)) {
      try { fs.copyFileSync(CONFIG, BACKUP); } catch { /* backup is best-effort */ }
    }
    const tmp = CONFIG + '.tmp';
    fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8', (err) => {
      if (err) return send(res, 500, JSON.stringify({ error: err.message }));
      fs.rename(tmp, CONFIG, (err2) => {
        if (err2) return send(res, 500, JSON.stringify({ error: err2.message }));
        send(res, 200, JSON.stringify({ ok: true, updatedAt: data.updatedAt || null }));
      });
    });
  });
}

function serveStatic(pathname, req, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, 'Bad request', 'text/plain');
  }
  let file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');

  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err2, buf) => {
      if (err2) return send(res, 404, 'Not found', 'text/plain');
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : buf);
    });
  });
}

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (pathname === '/api/config') {
      if (req.method === 'GET') return readConfig(res);
      if (req.method === 'PUT' || req.method === 'POST') return writeConfig(req, res);
      return send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed', 'text/plain');
    }
    // /edit serves the same page, opened in edit mode
    if (pathname === '/edit/') {
      res.writeHead(301, { Location: '/edit' });
      return res.end();
    }
    serveStatic(pathname === '/edit' ? '/index.html' : pathname, req, res);
  })
  .listen(PORT, HOST, () => {
    console.log(`WallGrid: http://${HOST}:${PORT}/`);
    console.log(`Config file: ${CONFIG}`);
  });
