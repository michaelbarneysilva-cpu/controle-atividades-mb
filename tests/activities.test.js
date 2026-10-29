import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivity, completeActivity, reopenActivity, ACTIVITY_CLASSIFICATIONS } from '../js/activities.js';

test('createActivity retorna null para descrição vazia ou só espaços', () => {
  assert.equal(createActivity(''), null);
  assert.equal(createActivity('   '), null);
});

test('createActivity cria item pendente com createdAt preenchido', () => {
  const activity = createActivity('Pagar IPTU');
  assert.equal(activity.status, 'pending');
  assert.equal(activity.classification, null);
  assert.ok(activity.createdAt);
});

test('completeActivity preenche completedAt e classification', () => {
  const activity = createActivity('Revisar contrato');
  const done = completeActivity(activity, 'rescheduled', 'médico cancelou');
  assert.equal(done.status, 'done');
  assert.equal(done.classification, 'rescheduled');
  assert.ok(done.completedAt);
});

test('completeActivity rejeita classificação desconhecida', () => {
  const activity = createActivity('x');
  assert.throws(() => completeActivity(activity, 'bogus'), /invalid classification/);
});

test('reopenActivity limpa completedAt e classification mas preserva createdAt', () => {
  const activity = createActivity('Organizar garagem');
  const done = completeActivity(activity, 'completed_partial', 'faltou ferramenta');
  const reopened = reopenActivity(done);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.completedAt, null);
  assert.equal(reopened.classification, null);
  assert.equal(reopened.createdAt, activity.createdAt);
});
