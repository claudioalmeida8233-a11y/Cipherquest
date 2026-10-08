import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptCaesar, decryptCaesar, substitute, normalizeAnswer, alphabetPair } from '../js/crypto.js';

test('César avança, volta e faz contorno do alfabeto', () => {
  assert.equal(encryptCaesar('BRUNO', 3), 'EUXQR');
  assert.equal(decryptCaesar('EUXQR', 3), 'BRUNO');
  assert.equal(encryptCaesar('AZ', -1), 'ZY');
  assert.equal(encryptCaesar('Z A!', 2), 'B C!');
});

test('substituição simples funciona nas duas direções', () => {
  assert.equal(substitute('ABC', 'QWERTYUIOPASDFGHJKLZXCVBNM'), 'QWE');
  assert.equal(substitute('QWE', 'QWERTYUIOPASDFGHJKLZXCVBNM', true), 'ABC');
});

test('normalização preserva espaços internos e remove bordas', () => {
  assert.equal(normalizeAnswer('  bruno  '), 'BRUNO');
  assert.notEqual(normalizeAnswer('A  B'), normalizeAnswer('A B'));
  assert.equal(alphabetPair(3).shifted.slice(0, 3), 'DEF');
});
