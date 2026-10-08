import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/server.js';

test('API identifica o criador e permite sair ou excluir antes da partida', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/rooms`;
  const send = (path, method, body) => fetch(base + path, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });

  try {
    const creator = await send('', 'POST', { name: 'Ana', capacity: 2 }).then(res => res.json());
    const guest = await send(`/${creator.code}/join`, 'POST', { name: 'Beto', team: 2 }).then(res => res.json());
    const roomUrl = `${base}/${creator.code}`;
    const view = token => fetch(roomUrl, { headers: { 'x-player-token': token } }).then(res => res.json());
    assert.equal((await view(creator.token)).viewerRole, 'creator');
    assert.equal((await view(guest.token)).viewerRole, 'player');
    assert.equal((await send(`/${creator.code}`, 'DELETE', { token: guest.token })).status, 400);
    assert.equal((await send(`/${creator.code}/leave`, 'POST', { token: guest.token })).status, 200);
    assert.equal((await view(creator.token)).remaining, 3);
    assert.equal((await send(`/${creator.code}`, 'DELETE', { token: creator.token })).status, 200);
    assert.equal((await fetch(roomUrl)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
