import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomStore } from '../server/room-store.js';

test('sala começa automaticamente quando todas as vagas são preenchidas', () => {
  const store = new RoomStore();
  const created = store.create('Ana', 2);
  const seed = store.snapshot(created.code).seed;
  assert.equal(Number.isInteger(seed), true);
  assert.equal(store.snapshot(created.code).status, 'lobby');
  const bob = store.join(created.code, 'Beto', 1);
  const carla = store.join(created.code, 'Carla', 2);
  assert.equal(store.snapshot(created.code).status, 'lobby');
  const dani = store.join(created.code, 'Dani', 2);
  assert.equal(dani.error, undefined);
  assert.equal(store.snapshot(created.code).status, 'playing');
  assert.equal(store.snapshot(created.code).seed, seed);
  assert.equal(store.join(created.code, 'Eva', 2).error, 'A partida já começou.');
  assert.equal(store.finish(created.code, bob.token, { score: 100 }).winner, null);
  assert.equal(store.finish(created.code, created.token, { score: 100 }).winner, 1);
  assert.equal(store.finish(created.code, carla.token, { score: 90 }).winner, 1);
  assert.equal(store.snapshot(created.code).players[0].token, undefined);
});

test('limites de vagas e nomes são validados', () => {
  const store = new RoomStore();
  const room = store.create('Ana', 2);
  store.join(room.code, 'Beto', 1);
  assert.equal(store.join(room.code, 'Caio', 1).error, 'Mesa 01 está cheia.');
  assert.equal(store.snapshot(room.code).status, 'lobby');
  assert.equal(store.join(room.code, ' ', 2).error, 'Informe um nome de 2 a 24 caracteres.');
});
