import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomStore } from '../server/room-store.js';

test('participante sai do lobby e libera sua vaga', () => {
  const store = new RoomStore();
  const creator = store.create('Ana', 2);
  const guest = store.join(creator.code, 'Beto', 2);
  assert.equal(store.snapshot(creator.code, creator.token).viewerRole, 'creator');
  assert.equal(store.snapshot(creator.code, guest.token).viewerRole, 'player');
  assert.equal(store.snapshot(creator.code).viewerRole, null);
  assert.ok(store.leave(creator.code, creator.token).error);
  assert.ok(store.leave(creator.code, 'token-invalido').error);
  assert.equal(store.leave(creator.code, guest.token).remaining, 3);
  assert.equal(store.snapshot(creator.code).players.some(player => player.name === 'Beto'), false);
  assert.equal(store.join(creator.code, 'Caio', 2).error, undefined);
});

test('somente o criador exclui a sala', () => {
  const store = new RoomStore();
  const creator = store.create('Ana', 2);
  const guest = store.join(creator.code, 'Beto', 2);
  assert.ok(store.delete(creator.code, guest.token).error);
  assert.ok(store.delete(creator.code, 'token-invalido').error);
  assert.equal(store.snapshot(creator.code).players.length, 2);
  assert.equal(store.delete(creator.code, creator.token).deleted, true);
  assert.ok(store.snapshot(creator.code).error);
});

test('uma partida iniciada não pode ser abandonada ou excluída pelo lobby', () => {
  const store = new RoomStore();
  const creator = store.create('Ana', 2);
  const guest = store.join(creator.code, 'Beto', 1);
  store.join(creator.code, 'Carla', 2);
  store.join(creator.code, 'Dani', 2);
  assert.ok(store.leave(creator.code, guest.token).error);
  assert.ok(store.delete(creator.code, creator.token).error);
  assert.equal(store.snapshot(creator.code).status, 'playing');
});
