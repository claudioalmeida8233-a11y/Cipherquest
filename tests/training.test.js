import test from 'node:test';
import assert from 'node:assert/strict';
import { createTraining } from '../js/challenges.js';
import { createGame, submitAnswer, advance } from '../js/game.js';

test('treino curto contém César, substituição e ambos os sentidos sem afetar a disputa', () => {
  const challenges = createTraining();
  assert.equal(challenges.length, 4);
  assert.deepEqual(new Set(challenges.map(item => item.method)), new Set(['caesar', 'substitution']));
  assert.deepEqual(new Set(challenges.map(item => item.mode)), new Set(['encrypt', 'decrypt']));
  const game = createGame(1, challenges);
  for (const item of challenges) {
    const answer = item.mode === 'encrypt' ? item.encrypted : item.original;
    assert.equal(submitAnswer(game, answer).correct, true);
    assert.equal(advance(game), true);
  }
  assert.equal(game.finished, true);
});
