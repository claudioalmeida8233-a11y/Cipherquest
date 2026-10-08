import { ALPHABET, SUBSTITUTION_KEY, alphabetPair } from './crypto.js';
import { LEVELS, methodLabel } from './challenges.js';
import { comboMultiplier } from './game.js';

const $ = id => document.getElementById(id);

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => { screen.hidden = screen.id !== id; });
  window.scrollTo({ top: 0, behavior: 'instant' });
  const title = $(id)?.querySelector('h1,h2');
  if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
}

function addAlphabetRow(container, label, letters) {
  const row = document.createElement('div'); row.className = 'alphabet-row';
  const heading = document.createElement('span'); heading.className = 'row-label'; heading.textContent = label; row.append(heading);
  for (const letter of letters) { const cell = document.createElement('span'); cell.textContent = letter; row.append(cell); }
  container.append(row);
}

export function renderAlphabet(challenge) {
  const panel = $('alphabet-panel'); panel.replaceChildren();
  const pair = challenge.method === 'caesar' ? alphabetPair(challenge.shift) : { original: ALPHABET, shifted: SUBSTITUTION_KEY };
  addAlphabetRow(panel, 'ORIGINAL', pair.original);
  addAlphabetRow(panel, challenge.method === 'caesar' ? `CÉSAR ${challenge.shift > 0 ? '+' : ''}${challenge.shift}` : 'CÓDIGO', pair.shifted);
}

export function renderGame(game, { training = false } = {}) {
  const c = game.currentChallenge;
  const total = game.challenges.length;
  $('level-label').textContent = training
    ? `TREINO / ${c.method === 'caesar' ? 'CIFRA DE CÉSAR' : 'SUBSTITUIÇÃO SIMPLES'}`
    : `NÍVEL 0${game.level} / ${LEVELS[game.level - 1].toUpperCase()}`;
  $('stage-stat').textContent = `${String(game.stage).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  $('score-stat').textContent = game.score.toLocaleString('pt-BR');
  $('combo-stat').textContent = `x${comboMultiplier(game.streak)}`;
  $('attempt-stat').textContent = String(game.attempts);
  $('progress-fill').style.width = `${((game.stage - 1) / total) * 100}%`;
  const timeline = $('stage-timeline');
  timeline.hidden = training;
  timeline.replaceChildren();
  if (!training) for (let i = 1; i <= total; i += 1) {
    const step = document.createElement('span');
    step.textContent = i;
    step.className = i < game.stage ? 'done' : i === game.stage ? 'current' : '';
    timeline.append(step);
  }
  document.querySelector('.progress-track').setAttribute('aria-valuemax', String(total));
  document.querySelector('.progress-track').setAttribute('aria-valuenow', String(game.stage - 1));
  $('mission-number').textContent = `FASE ${String(game.stage).padStart(2, '0')}`;
  $('mission-badge').textContent = c.mode === 'encrypt' ? 'CRIPTOGRAFAR' : 'DESCRIPTOGRAFAR';
  $('method-name').textContent = methodLabel(c);
  $('source-label').textContent = c.mode === 'encrypt' ? 'PALAVRA OU FRASE ORIGINAL' : 'MENSAGEM CRIPTOGRAFADA';
  $('source-text').textContent = c.mode === 'encrypt' ? c.original : c.encrypted;
  $('answer-label').textContent = c.mode === 'encrypt' ? 'Digite a mensagem criptografada' : 'Digite a mensagem original';
  $('submit-button').textContent = c.mode === 'encrypt' ? 'CRIPTOGRAFAR ↗' : 'DESCRIPTOGRAFAR ↗';
  $('answer-input').value = ''; $('answer-input').disabled = false; $('submit-button').disabled = false;
  $('answer-feedback').textContent = ''; $('answer-feedback').classList.remove('success');
  $('hint-panel').hidden = true; $('hint-panel').textContent = '';
  $('hint-button').disabled = false;
  $('success-panel').hidden = true;
  $('alphabet-panel').hidden = true;
  $('alphabet-button').hidden = !training && game.level > 2;
  $('alphabet-button').setAttribute('aria-expanded', 'false');
  document.querySelectorAll('#level-list li').forEach((item, index) => { item.classList.toggle('active', index + 1 === game.level); item.classList.toggle('done', index + 1 < game.level); });
  renderAlphabet(c);
  if (training || game.level === 1) { $('alphabet-panel').hidden = false; $('alphabet-button').setAttribute('aria-expanded', 'true'); }
  showScreen('game'); $('answer-input').focus();
}

export function showHint(text) {
  $('hint-panel').textContent = text; $('hint-panel').hidden = false; $('hint-button').disabled = true;
  $('alphabet-button').hidden = false;
}

export function showWrong(message = 'Ainda não. Confira a regra e tente outra vez.') {
  $('answer-feedback').textContent = message;
  $('answer-feedback').classList.remove('success');
  $('answer-input').focus(); $('answer-input').select();
}

export function showSuccess(game, earned) {
  const c = game.currentChallenge;
  $('answer-feedback').textContent = 'Resposta correta!'; $('answer-feedback').classList.add('success');
  $('answer-input').disabled = true; $('submit-button').disabled = true;
  $('hint-button').disabled = true;
  $('success-title').textContent = c.mode === 'encrypt' ? 'Criptografia concluída' : 'Mensagem decifrada';
  $('earned-points').textContent = `+${earned} PTS`;
  $('explanation-text').textContent = c.method === 'caesar'
    ? `Você usou a Cifra de César com deslocamento ${c.shift > 0 ? '+' : ''}${c.shift}. Cada letra avança ou volta no alfabeto, e depois de Z retorna a A.`
    : 'Você usou uma substituição simples: cada letra do alfabeto foi trocada sempre pela mesma letra correspondente.';
  $('original-result').textContent = c.original; $('encrypted-result').textContent = c.encrypted;
  const mapping = $('letter-mapping'); mapping.replaceChildren();
  for (let i = 0; i < c.original.length; i += 1) {
    if (c.original[i] === ' ') continue;
    const chip = document.createElement('span'); chip.textContent = `${c.original[i]} → ${c.encrypted[i]}`;
    chip.style.animationDelay = `${Math.min(i * 60, 900)}ms`; mapping.append(chip);
  }
  $('success-panel').hidden = false;
  $('success-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('score-stat').textContent = game.score.toLocaleString('pt-BR');
  $('combo-stat').textContent = `x${comboMultiplier(game.streak)}`;
  $('attempt-stat').textContent = String(game.attempts);
}

export function renderResult(game) {
  const totalChallenges = game.challenges.length;
  $('progress-fill').style.width = '100%';
  document.querySelector('.progress-track').setAttribute('aria-valuenow', String(totalChallenges));
  $('result-score').textContent = game.score.toLocaleString('pt-BR');
  $('result-correct').textContent = `${game.correctAnswers} / ${totalChallenges}`;
  const total = game.correctAnswers + game.incorrectAnswers;
  $('result-accuracy').textContent = `${total ? Math.round((game.correctAnswers / total) * 100) : 0}%`;
  $('result-combo').textContent = String(game.bestStreak);
  $('result-errors').textContent = String(game.incorrectAnswers);
  showScreen('result');
}
