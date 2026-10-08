export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const SUBSTITUTION_KEY = 'QWERTYUIOPASDFGHJKLZXCVBNM';

export function normalizeAnswer(value) {
  return String(value ?? '').trim().toUpperCase();
}

function rotate(text, shift) {
  const offset = ((shift % 26) + 26) % 26;
  return String(text).toUpperCase().replace(/[A-Z]/g, letter =>
    ALPHABET[(ALPHABET.indexOf(letter) + offset) % 26]
  );
}

export function encryptCaesar(text, shift) {
  if (!Number.isInteger(shift)) throw new TypeError('Deslocamento inválido');
  return rotate(text, shift);
}

export function decryptCaesar(text, shift) {
  return encryptCaesar(text, -shift);
}

export function substitute(text, key = SUBSTITUTION_KEY, reverse = false) {
  if (typeof key !== 'string' || key.length !== 26 || new Set(key).size !== 26 || !/^[A-Z]+$/.test(key)) {
    throw new TypeError('Alfabeto de substituição inválido');
  }
  const from = reverse ? key : ALPHABET;
  const to = reverse ? ALPHABET : key;
  return String(text).toUpperCase().replace(/[A-Z]/g, letter => to[from.indexOf(letter)]);
}

export function alphabetPair(shift) {
  return { original: ALPHABET, shifted: encryptCaesar(ALPHABET, shift) };
}

export function transformText(text, method, shift = 0) {
  if (method === 'caesar') return encryptCaesar(text, shift);
  if (method === 'substitution') return substitute(text);
  throw new TypeError('Método desconhecido');
}
