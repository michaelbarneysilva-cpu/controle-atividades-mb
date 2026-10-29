import test from 'node:test';
import assert from 'node:assert/strict';
import { digitsToCents, centsToBRL, appendDigit, backspaceDigit } from '../js/money.js';

test('digitsToCents converte string vazia em 0', () => {
  assert.equal(digitsToCents(''), 0);
});

test('centsToBRL formata valores simples e grandes', () => {
  assert.equal(centsToBRL(0), 'R$ 0,00');
  assert.equal(centsToBRL(5), 'R$ 0,05');
  assert.equal(centsToBRL(18790), 'R$ 187,90');
  assert.equal(centsToBRL(123456), 'R$ 1.234,56');
});

test('appendDigit e backspaceDigit nunca geram negativo ou NaN', () => {
  let digits = '';
  digits = appendDigit(digits, '5');
  assert.equal(centsToBRL(digitsToCents(digits)), 'R$ 0,05');
  digits = backspaceDigit(digits);
  assert.equal(digits, '');
  digits = backspaceDigit(digits);
  assert.equal(digits, '');
});
