import test from 'node:test';
import assert from 'node:assert/strict';
import { createPurchase, setPurchaseStatus, reopenPurchase, groupByDestino, PURCHASE_DESTINATIONS, togglePurchasePriority, updatePurchase, splitByPriority, sortPurchases } from '../js/purchases.js';

test('createPurchase retorna null para descrição vazia', () => {
  assert.equal(createPurchase('', 'outros'), null);
});

test('createPurchase sem valor assume 0 centavos', () => {
  const purchase = createPurchase('Ração premium', 'cachorros');
  assert.equal(purchase.valueCents, 0);
  assert.equal(purchase.status, 'pending');
});

test('setPurchaseStatus para ok preenche closedAt; reopenPurchase limpa', () => {
  const purchase = createPurchase('Coleira', 'cachorros');
  const done = setPurchaseStatus(purchase, 'ok');
  assert.ok(done.closedAt);
  const reopened = reopenPurchase(done);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.closedAt, null);
});

test('groupByDestino agrupa só os destinos presentes, na ordem do enum', () => {
  const items = [
    createPurchase('Tênis', 'michael_pessoal'),
    createPurchase('Remédio', 'mae'),
    createPurchase('Ração', 'cachorros'),
  ];
  const groups = groupByDestino(items);
  assert.deepEqual([...groups.keys()], ['michael_pessoal', 'mae', 'cachorros']);
});

test('createPurchase começa com priority false e quantity 1 por padrão', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  assert.equal(purchase.priority, false);
  assert.equal(purchase.quantity, 1);
});

test('createPurchase aceita quantity explícita e ignora valor inválido', () => {
  assert.equal(createPurchase('Ração', 'cachorros', 0, 3).quantity, 3);
  assert.equal(createPurchase('Ração', 'cachorros', 0, 0).quantity, 1);
  assert.equal(createPurchase('Ração', 'cachorros', 0, -2).quantity, 1);
});

test('togglePurchasePriority alterna o valor, tratando item antigo sem o campo como false', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  const marked = togglePurchasePriority(purchase);
  assert.equal(marked.priority, true);
  assert.equal(togglePurchasePriority(marked).priority, false);
});

test('updatePurchase troca descrição, destino, valor, quantidade e observação', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  const updated = updatePurchase(purchase, {
    description: 'Ração premium',
    destino: 'michael_casa',
    valueCents: 5000,
    quantity: 2,
    note: 'marca nova',
  });
  assert.equal(updated.description, 'Ração premium');
  assert.equal(updated.destino, 'michael_casa');
  assert.equal(updated.valueCents, 5000);
  assert.equal(updated.quantity, 2);
  assert.equal(updated.note, 'marca nova');
});

test('updatePurchase retorna null para descrição vazia ou destino inválido', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  assert.equal(updatePurchase(purchase, { description: '', destino: 'cachorros', valueCents: 0, quantity: 1, note: '' }), null);
  assert.equal(updatePurchase(purchase, { description: 'Ração', destino: 'invalido', valueCents: 0, quantity: 1, note: '' }), null);
});

test('splitByPriority separa prioritários dos demais, preservando ordem', () => {
  const a = createPurchase('A', 'outros');
  const b = togglePurchasePriority(createPurchase('B', 'outros'));
  const c = createPurchase('C', 'outros');
  const { priority, rest } = splitByPriority([a, b, c]);
  assert.deepEqual(priority.map((x) => x.description), ['B']);
  assert.deepEqual(rest.map((x) => x.description), ['A', 'C']);
});

test('sortPurchases coloca prioritárias no topo, preservando ordem de inclusão', () => {
  const a = createPurchase('A', 'outros');
  const b = togglePurchasePriority(createPurchase('B', 'outros'));
  const sorted = sortPurchases([a, b]);
  assert.deepEqual(sorted.map((x) => x.description), ['B', 'A']);
});
