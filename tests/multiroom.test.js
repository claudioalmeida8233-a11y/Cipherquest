import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomStore } from '../server/room-store.js';

test('salas simultâneas usam desafios distintos e começam independentemente', () => {
  const store = new RoomStore();
  const rooms = Array.from({ length: 40 }, (_, index) => store.create(`Grupo ${index + 1}`, 2));
  const seen = new Set();

  for (const { code } of rooms) {
    const room = store.snapshot(code);
    assert.equal(room.campaign.length, 20);
    assert.equal(room.remaining, 3);
    for (const challenge of room.campaign) {
      const key = `${challenge.level}|${challenge.mode}|${challenge.shift}|${challenge.original}`;
      assert.equal(seen.has(key), false, `Desafio repetido: ${key}`);
      seen.add(key);
    }
  }
  assert.match(store.create('Mais uma sala', 2).error, /desafios exclusivos/);

  const first = rooms[0].code;
  const beto = store.join(first, 'Beto', 1);
  assert.equal(store.snapshot(first).remaining, 2);
  const carla = store.join(first, 'Carla', 2);
  const dani = store.join(first, 'Dani', 2);
  assert.equal(store.snapshot(first).status, 'playing');
  assert.equal(store.snapshot(first).remaining, 0);
  assert.equal(store.snapshot(rooms[1].code).status, 'lobby');
  store.finish(first, rooms[0].token, { score: 100 });
  store.finish(first, beto.token, { score: 90 });
  assert.equal(store.snapshot(first).winner, 1);
  assert.equal(store.snapshot(first).status, 'playing');
  store.finish(first, carla.token, { score: 80 });
  store.finish(first, dani.token, { score: 70 });
  assert.equal(store.snapshot(first).status, 'finished');
  assert.equal(store.create('Nova sala', 2).error, undefined);
});
