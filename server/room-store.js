import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { challengeKey, createCampaign } from '../js/challenges.js';
import { createGame, submitAnswer, useHint, advance } from '../js/game.js';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function newRoomCode() {
  return Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

function validName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 24;
}

export class RoomStore {
  constructor({ filePath = null, now = Date.now, lobbyTimeoutMs = 120_000 } = {}) {
    this.filePath = filePath;
    this.now = now;
    this.lobbyTimeoutMs = lobbyTimeoutMs;
    this.rooms = new Map();
    if (filePath) {
      try {
        for (const room of JSON.parse(readFileSync(filePath, 'utf8'))) {
          for (const player of room.players) player.lastSeen = now();
          this.rooms.set(room.code, room);
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }

  save() {
    if (!this.filePath) return;
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    writeFileSync(temporary, JSON.stringify([...this.rooms.values()]));
    renameSync(temporary, this.filePath);
  }

  sweepLobby(room) {
    if (room.status !== 'lobby') return;
    const players = room.players.filter(player => this.now() - player.lastSeen < this.lobbyTimeoutMs);
    if (players.length === room.players.length) return;
    room.players = players;
    if (players.length === 0) this.rooms.delete(room.code);
    else if (!players.some(player => player.token === room.creatorToken)) room.creatorToken = players[0].token;
    this.save();
  }

  beginIfReady(room) {
    if (room.status !== 'lobby') return;
    if (![1, 2].every(table => room.players.filter(player => player.team === table).length === room.capacity)) return;
    room.status = 'playing';
    room.startedAt = this.now();
    for (const player of room.players) player.game = createGame(room.seed, room.campaign);
    this.save();
  }

  create(name, capacity = 4) {
    this.prune();
    if (!validName(name)) return { error: 'Informe um nome de 2 a 24 caracteres.' };
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 6) return { error: 'Escolha de 2 a 6 vagas por mesa.' };
    const reserved = new Set([...this.rooms.values()].filter(room => room.status !== 'finished')
      .flatMap(room => room.campaign.map(challengeKey)));
    const seed = randomBytes(4).readUInt32BE();
    const campaign = createCampaign(seed, reserved);
    if (!campaign) return { error: 'Não há desafios exclusivos disponíveis para outra sala agora.' };
    let code;
    do { code = newRoomCode(); } while (this.rooms.has(code));
    const token = randomUUID();
    const room = { code, capacity, status: 'lobby', creatorToken: token,
      players: [{ token, name: name.trim(), team: 1, finished: false, score: 0, lastSeen: this.now() }],
      seed, campaign, winner: null, createdAt: this.now() };
    this.rooms.set(code, room);
    this.save();
    return { code, token, team: 1 };
  }

  join(code, name, team) {
    const room = this.rooms.get(String(code).toUpperCase());
    if (!room) return { error: 'Sala não encontrada.' };
    this.sweepLobby(room);
    if (!this.rooms.has(room.code)) return { error: 'Sala não encontrada.' };
    if (room.status !== 'lobby') return { error: 'A partida já começou.' };
    if (!validName(name)) return { error: 'Informe um nome de 2 a 24 caracteres.' };
    if (team !== 1 && team !== 2) return { error: 'Escolha uma mesa.' };
    if (room.players.filter(p => p.team === team).length >= room.capacity) return { error: `Mesa 0${team} está cheia.` };
    const token = randomUUID();
    room.players.push({ token, name: name.trim(), team, finished: false, score: 0, lastSeen: this.now() });
    this.beginIfReady(room);
    this.save();
    return { code: room.code, token, team };
  }

  playerForAction(code, token) {
    const room = this.rooms.get(String(code).toUpperCase());
    if (!room || room.status === 'lobby') return { error: 'Partida não iniciada.' };
    const player = room.players.find(item => item.token === token);
    if (!player) return { error: 'Participante não encontrado.' };
    player.lastSeen = this.now();
    return { room, player };
  }

  answer(code, token, answer) {
    const { room, player, error } = this.playerForAction(code, token);
    if (error) return { error };
    const result = submitAnswer(player.game, answer);
    if (!result.invalid && !result.ignored) this.save();
    return { ...result, game: player.game };
  }

  hint(code, token) {
    const { player, error } = this.playerForAction(code, token);
    if (error) return { error };
    const result = useHint(player.game);
    if (result.used) this.save();
    return { ...result, game: player.game };
  }

  advance(code, token) {
    const { room, player, error } = this.playerForAction(code, token);
    if (error) return { error };
    if (!advance(player.game)) return { error: 'Conclua a fase antes de avançar.' };
    if (player.game.finished && !player.finished) {
      player.finished = true;
      player.score = player.game.score;
      if (!room.winner && room.players.filter(item => item.team === player.team).every(item => item.finished)) room.winner = player.team;
      if (room.players.every(item => item.finished)) room.status = 'finished';
    }
    this.save();
    return { game: player.game, room: this.snapshot(code, token) };
  }

  finish(code, token, stats) {
    const room = this.rooms.get(String(code).toUpperCase());
    if (!room || room.status === 'lobby') return { error: 'Partida não iniciada.' };
    const player = room.players.find(p => p.token === token);
    if (!player) return { error: 'Participante não encontrado.' };
    if (!player.finished) {
      player.finished = true;
      player.score = Number.isFinite(stats?.score) ? Math.max(0, Math.floor(stats.score)) : 0;
      if (!room.winner && room.players.filter(p => p.team === player.team).every(p => p.finished)) {
        room.winner = player.team;
      }
      if (room.players.every(p => p.finished)) room.status = 'finished';
      this.save();
    }
    return this.snapshot(room.code);
  }

  leave(code, token) {
    const room = this.rooms.get(String(code).toUpperCase());
    if (!room) return { error: 'Sala não encontrada.' };
    if (room.status !== 'lobby') return { error: 'A partida já começou.' };
    if (token === room.creatorToken) return { error: 'O criador deve excluir a sala.' };
    const index = room.players.findIndex(player => player.token === token);
    if (index < 0) return { error: 'Participante não encontrado.' };
    room.players.splice(index, 1);
    this.save();
    return this.snapshot(room.code);
  }

  delete(code, token) {
    const key = String(code).toUpperCase();
    const room = this.rooms.get(key);
    if (!room) return { error: 'Sala não encontrada.' };
    if (token !== room.creatorToken) return { error: 'Apenas o criador pode excluir a sala.' };
    if (room.status !== 'lobby') return { error: 'A partida já começou.' };
    this.rooms.delete(key);
    this.save();
    return { deleted: true };
  }

  snapshot(code, token) {
    const room = this.rooms.get(String(code).toUpperCase());
    if (!room) return { error: 'Sala não encontrada.' };
    this.sweepLobby(room);
    if (!this.rooms.has(room.code)) return { error: 'Sala não encontrada.' };
    const viewer = room.players.find(player => player.token === token);
    if (viewer) viewer.lastSeen = this.now();
    const viewerRole = token === room.creatorToken ? 'creator'
      : room.players.some(player => player.token === token) ? 'player' : null;
    return { code: room.code, capacity: room.capacity, remaining: room.capacity * 2 - room.players.length,
      status: room.status, seed: room.seed, campaign: room.campaign, winner: room.winner, viewerRole,
      startedAt: room.startedAt ?? null, game: viewer?.game ?? null,
      players: room.players.map(({ name, team, finished, score, game }) => ({ name, team, finished, score,
        stage: game ? Math.min(game.stage, game.challenges.length) : 0 })) };
  }

  prune() {
    let changed = false;
    for (const [code, room] of this.rooms) {
      this.sweepLobby(room);
      if (this.now() - room.createdAt > 6 * 60 * 60 * 1000) { this.rooms.delete(code); changed = true; }
    }
    if (changed) this.save();
  }
}
