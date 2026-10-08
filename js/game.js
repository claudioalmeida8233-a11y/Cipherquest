import { createCampaign } from './challenges.js';
import { normalizeAnswer } from './crypto.js';

export function createGame(seed = Date.now(), challenges = createCampaign(seed)) {
  return { seed, challenges, level: 1, stage: 1, score: 0, streak: 0, bestStreak: 0,
    attempts: 0, correctAnswers: 0, incorrectAnswers: 0, hintUsed: false,
    solved: false, finished: false, lastEarned: 0, currentChallenge: challenges[0] };
}

export function comboMultiplier(streak) {
  return Math.min(4, Math.max(1, Math.floor(streak / 3) + 1));
}

export function submitAnswer(game, answer) {
  if (game.finished || game.solved) return { correct: false, ignored: true };
  const normalized = normalizeAnswer(answer);
  if (!normalized || normalized.length > 100) return { correct: false, invalid: true };
  const challenge = game.currentChallenge;
  const expected = challenge.mode === 'encrypt' ? challenge.encrypted : challenge.original;
  game.attempts += 1;
  if (normalized !== normalizeAnswer(expected)) {
    game.incorrectAnswers += 1;
    game.streak = 0;
    return { correct: false, invalid: false };
  }
  game.streak += 1;
  game.bestStreak = Math.max(game.bestStreak, game.streak);
  game.correctAnswers += 1;
  game.solved = true;
  const base = game.attempts === 1 ? 100 : game.attempts === 2 ? 80 : game.attempts === 3 ? 60 : 40;
  const earned = Math.max(0, base * comboMultiplier(game.streak) - (game.hintUsed ? 30 : 0));
  game.score += earned;
  game.lastEarned = earned;
  return { correct: true, earned, expected };
}

export function useHint(game) {
  if (game.hintUsed || game.solved || game.finished) return { used: false };
  game.hintUsed = true;
  return { used: true };
}

export function advance(game) {
  if (!game.solved || game.finished) return false;
  if (game.stage >= game.challenges.length) {
    game.finished = true;
    return true;
  }
  game.stage += 1;
  game.level = Math.floor((game.stage - 1) / 4) + 1;
  game.currentChallenge = game.challenges[game.stage - 1];
  game.attempts = 0;
  game.hintUsed = false;
  game.solved = false;
  game.lastEarned = 0;
  return true;
}
