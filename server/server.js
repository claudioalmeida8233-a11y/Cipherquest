import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RoomStore } from './room-store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) throw new Error('Requisição muito grande.');
  }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('JSON inválido.'); }
}

async function handler(req, res, store) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    try {
      if (req.method === 'POST' && url.pathname === '/api/rooms') {
        const data = await readJson(req);
        const result = store.create(data.name, data.capacity);
        return send(res, result.error ? 400 : 201, result);
      }
      const match = /^\/api\/rooms\/([2-9A-HJ-NP-Z]{4})(?:\/(join|leave|answer|hint|advance))?$/i.exec(url.pathname);
      if (!match) return send(res, 404, { error: 'Rota não encontrada.' });
      const [, code, action] = match;
      if (req.method === 'GET' && !action) {
        const result = store.snapshot(code, req.headers['x-player-token']);
        return send(res, result.error ? 404 : 200, result);
      }
      if (req.method !== 'POST' && req.method !== 'DELETE') return send(res, 405, { error: 'Método não permitido.' });
      const data = await readJson(req);
      let result;
      if (req.method === 'DELETE' && !action) result = store.delete(code, data.token);
      else if (req.method === 'POST' && action?.toLowerCase() === 'join') result = store.join(code, data.name, data.team);
      else if (req.method === 'POST' && action?.toLowerCase() === 'leave') result = store.leave(code, data.token);
      else if (req.method === 'POST' && action?.toLowerCase() === 'answer') result = store.answer(code, data.token, data.answer);
      else if (req.method === 'POST' && action?.toLowerCase() === 'hint') result = store.hint(code, data.token);
      else if (req.method === 'POST' && action?.toLowerCase() === 'advance') result = store.advance(code, data.token);
      else return send(res, 404, { error: 'Rota não encontrada.' });
      return send(res, result.error ? 400 : 200, result);
    } catch (error) {
      return send(res, 400, { error: error.message || 'Requisição inválida.' });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método não permitido.' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'Caminho inválido.' }); }
  if (pathname === '/') pathname = '/index.html';
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root + path.sep) || target.includes(`${path.sep}.`) || target.includes(`${path.sep}server${path.sep}`) || target.includes(`${path.sep}tests${path.sep}`) || target.includes(`${path.sep}docs${path.sep}`)) {
    return send(res, 404, { error: 'Arquivo não encontrado.' });
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Arquivo não encontrado.');
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { send(res, 404, { error: 'Arquivo não encontrado.' }); }
}

export function createServer({ filePath = null } = {}) {
  const store = new RoomStore({ filePath });
  const timer = setInterval(() => store.prune(), 30_000);
  timer.unref();
  const server = http.createServer((req, res) => handler(req, res, store));
  server.on('close', () => clearInterval(timer));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const filePath = process.env.CIPHERQUEST_DATA_FILE || path.join(root, 'server', 'data', 'rooms.json');
  createServer({ filePath }).listen(port, '0.0.0.0', () => console.log(`CipherQuest: http://localhost:${port}`));
}
