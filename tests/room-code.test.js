import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomStore } from '../server/room-store.js';
import { createServer } from '../server/server.js';

test('códigos de sala têm quatro caracteres fáceis de distinguir e não se repetem', () => {
  const store = new RoomStore();
  const codes = Array.from({ length: 40 }, (_, index) => store.create(`Grupo ${index + 1}`, 2).code);
  assert.equal(new Set(codes).size, 40);
  for (const code of codes) assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  assert.equal(store.join(codes[0].toLowerCase(), 'Beto', 2).error, undefined);
});

test('API aceita o novo código de quatro caracteres', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/rooms`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ana', capacity: 2 })
    });
    const created = await response.json();
    assert.match(created.code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    assert.equal((await fetch(`${base}/api/rooms/${created.code}`)).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
