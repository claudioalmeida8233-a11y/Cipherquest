import { transformText } from './crypto.js';

export const LEVELS = ['Iniciante', 'Analista', 'Criptógrafo', 'Especialista', 'Mestre'];

const WORDS = [
  ['CASA', 'DADO', 'REDE', 'LUZ', 'JOGO', 'SINAL', 'CHAVE', 'TEXTO', 'LUA', 'SOL',
    'MAPA', 'PISTA', 'PORTA', 'LIVRO', 'LINHA', 'FORMA', 'TEMPO', 'SENHA', 'LETRA', 'PONTO'],
  ['ESCOLA', 'BRASIL', 'ALUNO', 'CODIGO', 'CIENCIA', 'LOGICA', 'FUTURO', 'MENSAGEM', 'BRUNO', 'INTERNET',
    'COMPUTADOR', 'TECNOLOGIA', 'PROGRAMA', 'PLANETA', 'SEGREDO', 'DESAFIO', 'ANALISTA', 'SISTEMA', 'PADRAO', 'CIRCUITO'],
  ['DADOS EM REDE', 'CHAVE SECRETA', 'PENSE ANTES', 'DECIFRE O CODIGO', 'CONHECER E PODER',
    'PENSE COM CALMA', 'OBSERVE A LETRA', 'SIGA A PISTA', 'TESTE O CODIGO', 'MENSAGEM OCULTA',
    'LEIA O SINAL', 'CHAVE DO JOGO', 'CADA LETRA CONTA', 'ENCONTRE A REGRA', 'APRENDA A CIFRA',
    'TROQUE AS LETRAS', 'DECIFRE A FRASE', 'O PADRAO MUDA', 'BUSQUE A RESPOSTA', 'ALFABETO SECRETO'],
  ['SEGURANCA DIGITAL', 'PADROES REVELAM PISTAS', 'PROTEJA SEUS DADOS', 'A MENSAGEM IMPORTA', 'COMPUTADOR EM REDE',
    'A CHAVE ESTA NO TEXTO', 'CADA SINAL TEM SENTIDO', 'O CODIGO GUARDA PISTAS', 'OBSERVE CADA DETALHE',
    'UMA REGRA MUDA TUDO', 'A RESPOSTA ESTA AQUI', 'DESCUBRA A NOVA CHAVE', 'A LOGICA ABRE CAMINHOS',
    'PENSAR REVELA PADROES', 'DADOS PRECISAM DE CUIDADO', 'LETRAS FORMAM MENSAGENS',
    'BUSQUE O PROXIMO SINAL', 'UMA PISTA LEVA A OUTRA', 'TESTE ANTES DE DECIDIR', 'O ALFABETO GIRA SEMPRE'],
  ['TECNOLOGIA E LOGICA', 'TRANSFORME A MENSAGEM', 'DESCUBRA O PADRAO', 'INFORMACAO TEM VALOR', 'PROGRAMACAO E CIENCIA',
    'CADA TRANSFORMACAO TEM UMA REGRA', 'A CHAVE REVELA O CAMINHO', 'INTERPRETE ANTES DE RESPONDER',
    'A MENSAGEM MUDA DE FORMA', 'OBSERVE O SENTIDO DA CIFRA', 'UM ERRO PODE VIRAR PISTA',
    'CONHECIMENTO PROTEGE DADOS', 'PENSAMENTO COMPUTACIONAL', 'PADROES LIGAM AS MENSAGENS',
    'UMA LETRA MUDA O RESULTADO', 'DESCUBRA O SENTIDO ORIGINAL', 'A RESPOSTA PEDE ATENCAO',
    'O CODIGO ESCONDE UMA IDEIA', 'ANALISE O TEXTO COM CUIDADO', 'A LOGICA COMPLETA A MISSAO']
];

function seededRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function challengeKey({ level, mode, shift, original }) {
  return `${level}|${mode}|${shift}|${original}`;
}

const MODE_PATTERNS = [
  ['encrypt', 'encrypt', 'decrypt', 'decrypt'],
  ['encrypt', 'decrypt', 'encrypt', 'decrypt'],
  ['encrypt', 'decrypt', 'decrypt', 'encrypt'],
  ['decrypt', 'encrypt', 'encrypt', 'decrypt'],
  ['decrypt', 'encrypt', 'decrypt', 'encrypt'],
  ['decrypt', 'decrypt', 'encrypt', 'encrypt']
];

export function createCampaign(seed = Date.now(), reservedKeys = new Set()) {
  const random = seededRandom(seed);
  const used = new Set(reservedKeys);
  const campaign = [];

  for (let level = 1; level <= LEVELS.length; level += 1) {
    const words = WORDS[level - 1];
    const shifts = shuffle([1, 2, 3, -1], random);
    const patterns = shuffle(MODE_PATTERNS, random);
    const candidates = patterns.map(modes => ({
      modes,
      pools: shifts.map((shift, index) => words.filter(original =>
        !used.has(challengeKey({ level, mode: modes[index], shift, original }))))
    })).filter(({ pools }) => pools.every(pool => pool.length > 0));
    if (candidates.length === 0) return null;

    // Use os pares com mais opções restantes para preservar vagas para novas salas.
    candidates.sort((a, b) => b.pools.reduce((sum, pool) => sum + pool.length, 0)
      - a.pools.reduce((sum, pool) => sum + pool.length, 0));
    const { modes, pools } = candidates[0];
    for (let index = 0; index < 4; index += 1) {
      const original = pools[index][Math.floor(random() * pools[index].length)];
      const challenge = { id: campaign.length + 1, level, mode: modes[index], method: 'caesar',
        shift: shifts[index], original, encrypted: transformText(original, 'caesar', shifts[index]) };
      used.add(challengeKey(challenge));
      campaign.push(challenge);
    }
  }
  return campaign;
}

export function createTraining() {
  return [
    { id: 1, level: 1, mode: 'encrypt', method: 'caesar', shift: 1, original: 'CASA' },
    { id: 2, level: 1, mode: 'decrypt', method: 'caesar', shift: 3, original: 'ESCOLA' },
    { id: 3, level: 1, mode: 'encrypt', method: 'substitution', original: 'REDE' },
    { id: 4, level: 1, mode: 'decrypt', method: 'substitution', original: 'DADOS' }
  ].map(challenge => ({ ...challenge, encrypted: transformText(challenge.original, challenge.method, challenge.shift) }));
}

export function methodLabel(challenge) {
  return challenge.method === 'caesar'
    ? `Cifra de César ${challenge.shift > 0 ? '+' : ''}${challenge.shift}`
    : 'Substituição simples';
}

export function challengeHint(challenge) {
  if (challenge.method === 'substitution') return 'Compare o alfabeto original com o alfabeto de substituição. Cada letra tem uma correspondente fixa.';
  const direction = challenge.shift > 0 ? 'avança' : 'volta';
  const action = challenge.mode === 'encrypt' ? direction : (direction === 'avança' ? 'volta' : 'avança');
  return `Para ${challenge.mode === 'encrypt' ? 'criptografar' : 'descriptografar'}, cada letra ${action} ${Math.abs(challenge.shift)} ${Math.abs(challenge.shift) === 1 ? 'posição' : 'posições'} no alfabeto.`;
}
