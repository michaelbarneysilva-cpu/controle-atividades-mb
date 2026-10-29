import test from 'node:test';
import assert from 'node:assert/strict';
import { createPurchase, setPurchaseStatus, reopenPurchase, groupByDestino, PURCHASE_DESTINATIONS } from '../js/purchases.js';

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
