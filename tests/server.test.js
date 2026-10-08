import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/server.js';

test('API inicia automaticamente quando as duas mesas lotam', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, data) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  }
  try {
    const created = await post('/api/rooms', { name: 'Ana', capacity: 2 });
    assert.equal(created.status, 201);
    const code = created.body.code;
    const joined = await post(`/api/rooms/${code}/join`, { name: 'Beto', team: 2 });
    assert.equal(joined.status, 200);
    const waiting = await fetch(`${base}/api/rooms/${code}`).then(res => res.json());
    assert.equal(waiting.status, 'lobby');
    assert.equal(waiting.remaining, 2);
    assert.equal(waiting.campaign.length, 20);
    const second = await post('/api/rooms', { name: 'Outro grupo', capacity: 2 });
    const otherRoom = await fetch(`${base}/api/rooms/${second.body.code}`).then(res => res.json());
    const keys = new Set(waiting.campaign.map(c => `${c.level}|${c.mode}|${c.shift}|${c.original}`));
    assert.equal(otherRoom.campaign.some(c => keys.has(`${c.level}|${c.mode}|${c.shift}|${c.original}`)), false);
    assert.equal((await post(`/api/rooms/${code}/join`, { name: 'Carla', team: 1 })).status, 200);
    assert.equal((await post(`/api/rooms/${code}/join`, { name: 'Dani', team: 2 })).status, 200);
    const started = await fetch(`${base}/api/rooms/${code}`).then(res => res.json());
    assert.equal(started.status, 'playing');
    assert.equal(started.remaining, 0);
    assert.equal((await fetch(`${base}/api/rooms/${second.body.code}`).then(res => res.json())).status, 'lobby');
    assert.equal((await post(`/api/rooms/${code}/start`, { token: created.body.token })).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('servidor entrega a nova logo como PNG', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/assets/images/cipherquest-logo.png`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/png/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
