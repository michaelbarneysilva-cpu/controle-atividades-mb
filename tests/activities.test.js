import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivity, completeActivity, reopenActivity, toggleActivityPriority, updateActivity, sortActivities, ACTIVITY_CLASSIFICATIONS } from '../js/activities.js';

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

test('createActivity começa com priority false', () => {
  const activity = createActivity('Pagar conta');
  assert.equal(activity.priority, false);
});

test('toggleActivityPriority alterna o valor', () => {
  const activity = createActivity('Pagar conta');
  const marked = toggleActivityPriority(activity);
  assert.equal(marked.priority, true);
  const unmarked = toggleActivityPriority(marked);
  assert.equal(unmarked.priority, false);
});

test('toggleActivityPriority trata item antigo sem o campo como false', () => {
  const legacy = { id: '1', description: 'Antiga', note: '' };
  const marked = toggleActivityPriority(legacy);
  assert.equal(marked.priority, true);
});

test('updateActivity troca descrição e observação', () => {
  const activity = createActivity('Pagar conta');
  const updated = updateActivity(activity, { description: 'Pagar conta de luz', note: 'vence dia 10' });
  assert.equal(updated.description, 'Pagar conta de luz');
  assert.equal(updated.note, 'vence dia 10');
});

test('updateActivity retorna null para descrição vazia', () => {
  const activity = createActivity('Pagar conta');
  assert.equal(updateActivity(activity, { description: '  ', note: '' }), null);
});

test('sortActivities coloca prioritárias no topo, preservando ordem de inclusão dentro de cada grupo', () => {
  const a = createActivity('A');
  const b = toggleActivityPriority(createActivity('B'));
  const c = createActivity('C');
  const d = toggleActivityPriority(createActivity('D'));
  const sorted = sortActivities([a, b, c, d]);
  assert.deepEqual(sorted.map((x) => x.description), ['B', 'D', 'A', 'C']);
});
