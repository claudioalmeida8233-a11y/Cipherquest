const $ = id => document.getElementById(id);
let session = null;
let polling = null;
let onStart = () => {};
let onUpdate = () => {};
let onExit = () => {};
let started = false;

async function request(url, method = 'GET', data, token) {
  const headers = {};
  if (data) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Player-Token'] = token;
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  });
  const result = await response.json();
  if (!response.ok || result.error) {
    const failure = new Error(result.error || 'Não foi possível conectar à sala.');
    failure.status = response.status;
    throw failure;
  }
  return result;
}

function error(message) { $('room-error').textContent = message; }

function renderTeam(listId, players, capacity, status) {
  const list = $(listId);
  list.replaceChildren();
  for (const player of players) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = player.name;
    const statusLabel = document.createElement('small');
    statusLabel.textContent = player.finished ? `CONCLUIU · ${player.score} PTS`
      : status === 'lobby' ? 'AGUARDANDO' : `FASE ${String(player.stage || 1).padStart(2, '0')} / 20`;
    li.append(name, statusLabel);
    list.append(li);
  }
  for (let i = players.length; i < capacity; i += 1) {
    const li = document.createElement('li');
    li.textContent = 'Vaga disponível';
    li.style.color = '#8294b3';
    list.append(li);
  }
}

function renderLobby(room) {
  $('room-forms').hidden = true;
  $('lobby').hidden = false;
  $('lobby-code').textContent = room.code;
  const link = new URL(window.location.href);
  link.searchParams.set('s', room.code);
  $('share-link').value = link.href;
  $('share-link').setAttribute('aria-label', `Link para entrar na sala ${room.code}`);
  renderQr(link.href);
  const mine = room.players.find(player => player.name === session.name && player.team === session.team);
  const missing = Number.isInteger(room.remaining) ? room.remaining : room.capacity * 2 - room.players.length;
  const role = room.viewerRole === undefined ? session.role ?? null : room.viewerRole;
  $('lobby-status').textContent = room.status === 'lobby'
    ? missing === room.capacity * 2 - 1
      ? 'Sala criada! Compartilhe o código com seu grupo.'
      : `Aguardando ${missing} ${missing === 1 ? 'jogador' : 'jogadores'} nesta sala. A partida começa automaticamente quando as duas mesas estiverem completas.`
    : room.winner ? `Mesa 0${room.winner} venceu a disputa!` : 'Partida em andamento.';
  $('room-timer').hidden = room.status === 'lobby';
  if (room.startedAt) {
    const seconds = Math.max(0, Math.floor((Date.now() - room.startedAt) / 1000));
    $('room-timer').textContent = `TEMPO DE SALA ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  renderTeam('team-one', room.players.filter(player => player.team === 1), room.capacity, room.status);
  renderTeam('team-two', room.players.filter(player => player.team === 2), room.capacity, room.status);
  $('resume-room').hidden = room.status === 'lobby';
  $('leave-room').hidden = room.status !== 'lobby' || role !== 'player';
  $('delete-room').hidden = room.status !== 'lobby' || role !== 'creator';
  if (room.status !== 'lobby' && $('delete-room-dialog').open) $('delete-room-dialog').close();
  if (!mine && !role) error('Seu nome não foi encontrado na lista. Verifique a sala.');
}

let qrModule;
async function renderQr(link) {
  const container = $('room-qr');
  if (container.dataset.link === link) return;
  container.dataset.link = link;
  try {
    qrModule ||= import('./vendor/qrcode.mjs');
    const { default: qrcode } = await qrModule;
    if (container.dataset.link !== link) return;
    const code = qrcode(0, 'M');
    code.addData(link);
    code.make();
    const size = code.getModuleCount();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * 4;
    const context = canvas.getContext('2d');
    for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) {
      context.fillStyle = code.isDark(row, col) ? '#0a1022' : '#fff';
      context.fillRect(col * 4, row * 4, 4, 4);
    }
    container.replaceChildren(canvas);
  } catch { container.textContent = 'Use o link ou o código para entrar.'; }
}

async function refresh() {
  if (!session) return;
  const currentSession = session;
  try {
    const room = await request(`/api/rooms/${currentSession.code}`, 'GET', undefined, currentSession.token);
    document.body.classList.remove('connection-offline');
    $('connection-status').textContent = 'ONLINE';
    if (session !== currentSession) return;
    if (!room.viewerRole) {
      clearRoom();
      onExit();
      error('Sua vaga foi liberada após um tempo sem conexão. Entre novamente na sala.');
      return;
    }
    renderLobby(room);
    onUpdate(room);
    if (room.status !== 'lobby' && !started) {
      started = true;
      onStart(room);
    }
  } catch (err) {
    if (session !== currentSession) return;
    if (err.status === 404) {
      clearRoom();
      onExit();
      error('Esta sala foi excluída. Você pode entrar em outra sala.');
    } else { document.body.classList.add('connection-offline'); $('connection-status').textContent = 'RECONECTANDO'; error('Conexão instável. Tentando reconectar automaticamente…'); }
  }
}

function setSession(data, name) {
  session = { ...data, name };
  sessionStorage.setItem('cipherquest-player-name', name);
  sessionStorage.setItem('cipherquest-room', JSON.stringify(session));
  started = false;
  error('');
  clearInterval(polling);
  polling = setInterval(refresh, 1800);
  refresh();
}

export function initRooms(callbacks) {
  onStart = callbacks.onStart;
  onUpdate = callbacks.onUpdate;
  onExit = callbacks.onExit ?? (() => {});
  $('create-room-form').addEventListener('submit', async event => {
    event.preventDefault();
    error('');
    const name = $('create-name').value.trim();
    try {
      setSession(await request('/api/rooms', 'POST', {
        name, capacity: Number($('room-capacity').value)
      }), name);
    } catch (err) { error(err.message); }
  });
  $('join-room-form').addEventListener('submit', async event => {
    event.preventDefault();
    error('');
    const name = $('join-name').value.trim();
    const code = $('join-code').value.trim().toUpperCase();
    const team = Number($('join-team').value);
    try {
      setSession(await request(`/api/rooms/${encodeURIComponent(code)}/join`, 'POST', { name, team }), name);
    } catch (err) { error(err.message); }
  });
  $('copy-code').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      $('copy-code').textContent = 'COPIADO ✓';
    } catch { error(`Copie o código: ${session.code}`); }
  });
  $('copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('share-link').value);
      $('copy-link').textContent = 'LINK COPIADO ✓';
    } catch { $('share-link').select(); error('Selecione e copie o link da sala.'); }
  });
  $('leave-room').addEventListener('click', async () => {
    if (!session) return;
    const button = $('leave-room');
    button.disabled = true;
    try {
      await request(`/api/rooms/${session.code}/leave`, 'POST', { token: session.token });
      clearRoom();
      onExit();
    } catch (err) { error(err.message); }
    finally { button.disabled = false; }
  });
  $('delete-room').addEventListener('click', () => {
    if (session) $('delete-room-dialog').showModal();
  });
  $('cancel-delete-room').addEventListener('click', () => $('delete-room-dialog').close());
  $('confirm-delete-room').addEventListener('click', async () => {
    if (!session) return;
    const button = $('confirm-delete-room');
    button.disabled = true;
    try {
      await request(`/api/rooms/${session.code}`, 'DELETE', { token: session.token });
      $('delete-room-dialog').close();
      clearRoom();
      onExit();
    } catch (err) { error(err.message); }
    finally { button.disabled = false; }
  });
  try {
    const codeFromLink = new URL(window.location.href).searchParams.get('s');
    if (codeFromLink && /^[2-9A-HJ-NP-Z]{4}$/i.test(codeFromLink)) {
      $('join-code').value = codeFromLink.toUpperCase();
      showJoinForm();
    }
    const saved = JSON.parse(sessionStorage.getItem('cipherquest-room') || 'null');
    if (saved?.code && saved?.token) {
      session = saved;
      polling = setInterval(refresh, 1800);
      refresh();
    }
  } catch { sessionStorage.removeItem('cipherquest-room'); }
}

export function hasRoom() { return Boolean(session); }

function showJoinForm() { $('join-name').focus(); }

export async function roomAction(action, payload = {}) {
  if (!session) throw new Error('Entre em uma sala para jogar.');
  return request(`/api/rooms/${session.code}/${action}`, 'POST', { token: session.token, ...payload });
}

export async function finishRoom(score) {
  if (!session) return null;
  try {
    return await request(`/api/rooms/${session.code}/finish`, 'POST', {
      token: session.token, stats: { score }
    });
  } catch (err) { error(err.message); return null; }
}

export function clearRoom() {
  if ($('delete-room-dialog').open) $('delete-room-dialog').close();
  session = null;
  started = false;
  clearInterval(polling);
  polling = null;
  sessionStorage.removeItem('cipherquest-room');
  sessionStorage.removeItem('cipherquest-player-name');
  $('room-forms').hidden = false;
  $('lobby').hidden = true;
  $('leave-room').hidden = true;
  $('delete-room').hidden = true;
  $('copy-code').textContent = 'COPIAR CÓDIGO';
  error('');
}
