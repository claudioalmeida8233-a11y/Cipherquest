import { createGame, submitAnswer, useHint, advance } from './game.js';
import { challengeHint, createTraining } from './challenges.js';
import { showScreen, renderGame, showHint, showWrong, showSuccess, renderResult } from './ui.js';
import { initRooms, hasRoom, roomAction, clearRoom } from './rooms.js';
import { startHeroAnimation } from './hero.js';

const $ = id => document.getElementById(id);
let game = null;
let gameMode = null;

function startGame(room) {
  game = room.game ?? createGame(room.seed, room.campaign);
  gameMode = 'room';
  $('room-result').hidden = true;
  $('result-subtitle').textContent = 'Você descobriu os padrões e concluiu a jornada.';
  $('play-again').textContent = 'NOVA SALA ↗';
  renderGame(game);
  renderStandings(room);
}

function startRoomWithCountdown(room) {
  const status = $('lobby-status');
  let count = 3;
  status.textContent = `Sala completa! O desafio começa em ${count}…`;
  const timer = setInterval(() => {
    count -= 1;
    if (count > 0) status.textContent = `Sala completa! O desafio começa em ${count}…`;
    else { clearInterval(timer); startGame(room); }
  }, 700);
}

function startTraining() {
  game = createGame(Date.now(), createTraining());
  gameMode = 'training';
  $('room-result').hidden = true;
  $('result-subtitle').textContent = 'Você concluiu o treino e está pronto para disputar uma sala.';
  $('play-again').textContent = 'TREINAR NOVAMENTE ↗';
  renderGame(game, { training: true });
}

function renderStandings(room) {
  const panel = $('game-standings');
  panel.hidden = gameMode !== 'room' || !room;
  if (panel.hidden) return;
  const team = number => room.players.filter(player => player.team === number);
  const completed = number => team(number).filter(player => player.finished).length;
  const mine = room.players.find(player => player.name === (room.viewerName ?? ''));
  const sessionTeam = room.players.find(player => player.name === sessionStorage.getItem('cipherquest-player-name'))?.team;
  $('game-my-team').textContent = sessionTeam ? `VOCÊ: MESA 0${sessionTeam}` : '';
  $('game-team-one').textContent = `MESA 01: ${completed(1)} / ${room.capacity} concluíram`;
  $('game-team-two').textContent = `MESA 02: ${completed(2)} / ${room.capacity} concluíram`;
  const ahead = completed(1) === completed(2) ? 'Disputa equilibrada.' : `Mesa 0${completed(1) > completed(2) ? 1 : 2} está na frente.`;
  $('game-broadcast').textContent = ahead;
  if (room.startedAt) {
    const seconds = Math.max(0, Math.floor((Date.now() - room.startedAt) / 1000));
    $('game-timer').textContent = `TEMPO ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
}

function showRoomResult(room) {
  if (!game?.finished) return;
  const panel = $('room-result'); panel.hidden = false;
  panel.replaceChildren();
  const title = document.createElement('strong'); title.textContent = room.winner ? `MESA 0${room.winner} VENCEU` : 'AGUARDANDO SUA MESA';
  const detail = document.createElement('p'); detail.textContent = room.winner
    ? 'A primeira mesa com todos os participantes concluídos venceu a rodada.'
    : 'Sua pontuação foi enviada. A disputa termina quando todos de uma mesa concluírem.';
  panel.append(title, detail);
}

document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => {
  const target = button.dataset.go;
  if (target === 'rooms' && hasRoom()) { showScreen('rooms'); return; }
  showScreen(target);
}));

$('answer-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!game) return;
  let result;
  try {
    result = gameMode === 'room'
      ? await roomAction('answer', { answer: $('answer-input').value })
      : submitAnswer(game, $('answer-input').value);
    if (result.game) game = result.game;
  } catch (error) { showWrong(error.message); return; }
  if (result.invalid) { showWrong('Digite uma resposta antes de enviar.'); return; }
  if (result.ignored) return;
  if (result.correct) showSuccess(game, result.earned);
  else { showWrong(); $('attempt-stat').textContent = String(game.attempts); $('combo-stat').textContent = 'x1'; }
});

$('hint-button').addEventListener('click', async () => {
  if (!game) return;
  let result;
  try {
    result = gameMode === 'room' ? await roomAction('hint') : useHint(game);
    if (result.game) game = result.game;
  } catch (error) { showWrong(error.message); return; }
  if (result.used) showHint(challengeHint(game.currentChallenge));
});

$('alphabet-button').addEventListener('click', () => {
  const panel = $('alphabet-panel'); panel.hidden = !panel.hidden;
  $('alphabet-button').setAttribute('aria-expanded', String(!panel.hidden));
});

$('continue-button').addEventListener('click', async () => {
  if (!game) return;
  let result;
  try {
    result = gameMode === 'room' ? await roomAction('advance') : { advanced: advance(game) };
    if (result.game) game = result.game;
  } catch (error) { showWrong(error.message); return; }
  if (gameMode !== 'room' && !result.advanced) return;
  if (!game.finished) { renderGame(game, { training: gameMode === 'training' }); return; }
  renderResult(game);
  if (gameMode === 'room' && result.room) {
    showRoomResult(result.room);
    renderStandings(result.room);
  }
});

$('start-training').addEventListener('click', startTraining);
$('play-again').addEventListener('click', () => {
  if (gameMode === 'training') { startTraining(); return; }
  clearRoom(); game = null; gameMode = null; showScreen('rooms');
});
$('resume-room').addEventListener('click', () => {
  if (!game) return;
  showScreen(game.finished ? 'result' : 'game');
});

initRooms({
  onStart(room) {
    if (gameMode !== 'room' || !game || game.seed !== room.seed || game.stage !== room.game?.stage) startRoomWithCountdown(room);
    else renderStandings(room);
  },
  onUpdate(room) { showRoomResult(room); renderStandings(room); },
  onExit() { game = null; gameMode = null; showScreen('rooms'); }
});

if (/^[2-9A-HJ-NP-Z]{4}$/i.test(new URL(window.location.href).searchParams.get('s') ?? '')) {
  showScreen('rooms');
}

startHeroAnimation();
