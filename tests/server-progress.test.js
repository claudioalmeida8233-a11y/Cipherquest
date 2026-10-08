import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/server.js';

test('API valida respostas no servidor e restaura a fase do participante', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/rooms`;
  const send = async (path, body) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };

  try {
    const created = (await send('', { name: 'Ana', capacity: 2 })).body;
    const sameTeam = (await send(`/${created.code}/join`, { name: 'Beto', team: 1 })).body;
    await send(`/${created.code}/join`, { name: 'Caio', team: 2 });
    await send(`/${created.code}/join`, { name: 'Dani', team: 2 });
    const room = await fetch(`${base}/${created.code}`, { headers: { 'x-player-token': created.token } }).then(response => response.json());
    const challenge = room.game.currentChallenge;
    const answer = challenge.mode === 'encrypt' ? challenge.encrypted : challenge.original;
    assert.equal((await send(`/${created.code}/answer`, { token: created.token, answer })).body.correct, true);
    assert.equal((await send(`/${created.code}/advance`, { token: created.token })).body.game.stage, 2);
    const restored = await fetch(`${base}/${created.code}`, { headers: { 'x-player-token': created.token } }).then(response => response.json());
    assert.equal(restored.game.stage, 2);
    assert.equal((await send(`/${created.code}/answer`, { token: sameTeam.token, answer: 'ERRADO' })).body.correct, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
