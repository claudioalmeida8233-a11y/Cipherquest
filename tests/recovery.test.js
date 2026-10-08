import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RoomStore } from '../server/room-store.js';

test('progresso e vagas sobrevivem ao reinício e ações exigem token', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cipherquest-'));
  try {
    const filePath = path.join(directory, 'rooms.json');
    const first = new RoomStore({ filePath });
    const creator = first.create('Ana', 2);
    first.join(creator.code, 'Beto', 1);
    first.join(creator.code, 'Caio', 2);
    first.join(creator.code, 'Dani', 2);
    const challenge = first.snapshot(creator.code, creator.token).game.currentChallenge;
    const answer = challenge.mode === 'encrypt' ? challenge.encrypted : challenge.original;
    assert.equal(first.answer(creator.code, 'invalido', answer).error, 'Participante não encontrado.');
    assert.equal(first.answer(creator.code, creator.token, answer).correct, true);
    const second = new RoomStore({ filePath });
    const view = second.snapshot(creator.code, creator.token);
    assert.equal(view.status, 'playing');
    assert.equal(view.game.solved, true);
    assert.equal(view.game.score, 100);
    assert.equal(view.players.length, 4);
    assert.equal(second.advance(creator.code, creator.token).game.stage, 2);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('jogador desconectado libera vaga antes da largada e o criador pode ser substituído', () => {
  let clock = 100_000;
  const store = new RoomStore({ now: () => clock, lobbyTimeoutMs: 60_000 });
  const creator = store.create('Ana', 2);
  const guest = store.join(creator.code, 'Beto', 1);
  clock += 30_000;
  store.snapshot(creator.code, guest.token);
  clock += 31_000;
  const view = store.snapshot(creator.code, guest.token);
  assert.equal(view.remaining, 3);
  assert.equal(view.viewerRole, 'creator');
  assert.equal(view.players.length, 1);
});
