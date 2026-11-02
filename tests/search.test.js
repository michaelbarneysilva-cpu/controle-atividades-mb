import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesQuery, filterByQuery } from '../js/search.js';

test('matchesQuery com query vazia sempre bate', () => {
  assert.equal(matchesQuery({ description: 'Ração', note: '' }, ''), true);
});

test('matchesQuery compara description e note, ignorando acento e caixa', () => {
  assert.equal(matchesQuery({ description: 'Ração premium', note: '' }, 'racao'), true);
  assert.equal(matchesQuery({ description: 'Tênis', note: '' }, 'TENIS'), true);
  assert.equal(matchesQuery({ description: 'Tênis', note: 'comprar na promoção' }, 'promocao'), true);
  assert.equal(matchesQuery({ description: 'Tênis', note: '' }, 'coleira'), false);
});

test('matchesQuery ignora espaço extra no início/fim da query', () => {
  assert.equal(matchesQuery({ description: 'Ração premium', note: '' }, 'racao '), true);
  assert.equal(matchesQuery({ description: 'Ração premium', note: '' }, '  ração'), true);
  assert.equal(matchesQuery({ description: 'Ração premium', note: '' }, '   '), true);
});

test('filterByQuery mantém só os itens que batem, preservando a ordem', () => {
  const items = [
    { description: 'Ração', note: '' },
    { description: 'Coleira', note: '' },
    { description: 'Ração extra', note: '' },
  ];
  const result = filterByQuery(items, 'ração');
  assert.deepEqual(result.map((i) => i.description), ['Ração', 'Ração extra']);
});
