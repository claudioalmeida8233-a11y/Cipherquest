import test from 'node:test';
import assert from 'node:assert/strict';
import { maskedReveal } from '../js/hero.js';

test('revelação para em três letras e preserva espaços', () => {
  assert.equal(maskedReveal('HVFROD', 0), '******');
  assert.equal(maskedReveal('HVFROD', 2), 'HV****');
  assert.equal(maskedReveal('HVFROD', 3), 'HVF***');
  assert.equal(maskedReveal('HVFROD', 6), 'HVF***');
  assert.equal(maskedReveal('BC DE', 2), 'BC **');
  assert.equal(maskedReveal('BC DE', 6), 'BC D*');
});
