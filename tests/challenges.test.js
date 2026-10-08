import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign } from '../js/challenges.js';
import { createGame, submitAnswer, useHint, advance } from '../js/game.js';

test('campanha é reprodutível, varia por semente e inclui os dois modos', () => {
  const a = createCampaign(1234);
  assert.deepEqual(a, createCampaign(1234));
  assert.notDeepEqual(a, createCampaign(5678));
  assert.equal(a.length, 20);
  assert.equal(new Set(a.map(c => c.mode)).size, 2);
  assert.deepEqual([...new Set(a.map(c => c.method))], ['caesar']);
  assert.deepEqual([...new Set(a.map(c => c.level))], [1, 2, 3, 4, 5]);
  for (let level = 1; level <= 5; level += 1) {
    const phases = a.filter(c => c.level === level);
    assert.deepEqual(phases.map(c => c.shift).sort((x, y) => x - y), [-1, 1, 2, 3]);
    assert.equal(phases.filter(c => c.mode === 'encrypt').length, 2);
    assert.equal(phases.filter(c => c.mode === 'decrypt').length, 2);
  }
});

test('nível inicial sorteia a ordem de +1, +2, +3 e recuo mantendo os dois modos', () => {
  const opening = createCampaign(1234).slice(0, 4);
  assert.deepEqual(opening.map(c => c.shift).sort((a, b) => a - b), [-1, 1, 2, 3]);
  assert.equal(opening.filter(c => c.mode === 'encrypt').length, 2);
  assert.equal(opening.filter(c => c.mode === 'decrypt').length, 2);
  assert.notDeepEqual(opening.map(c => c.shift), createCampaign(5678).slice(0, 4).map(c => c.shift));
});

test('acerto, erro, pista e avanço alteram o estado corretamente', () => {
  const game = createGame(1234);
  const expected = game.currentChallenge.mode === 'encrypt' ? game.currentChallenge.encrypted : game.currentChallenge.original;
  assert.equal(submitAnswer(game, 'resposta errada').correct, false);
  assert.equal(game.incorrectAnswers, 1);
  assert.equal(useHint(game).used, true);
  assert.equal(useHint(game).used, false);
  assert.equal(submitAnswer(game, expected.toLowerCase()).correct, true);
  assert.equal(game.score, 50);
  assert.equal(game.correctAnswers, 1);
  advance(game);
  assert.equal(game.stage, 2);
});
