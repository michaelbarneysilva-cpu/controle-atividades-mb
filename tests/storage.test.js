import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMemoryEngine, loadJSON, saveJSON, exportBackup, importBackup, ACTIVITIES_KEY } from '../js/storage.js';

test('loadJSON retorna fallback quando a chave não existe', () => {
  const engine = makeMemoryEngine();
  assert.deepEqual(loadJSON(engine, 'foo', []), []);
});

test('saveJSON seguido de loadJSON retorna o mesmo valor', () => {
  const engine = makeMemoryEngine();
  saveJSON(engine, 'foo', [{ a: 1 }]);
  assert.deepEqual(loadJSON(engine, 'foo', []), [{ a: 1 }]);
});

test('exportBackup junta as três coleções com version 1', () => {
  const engine = makeMemoryEngine();
  saveJSON(engine, ACTIVITIES_KEY, [{ id: '1' }]);
  const backup = exportBackup(engine);
  assert.equal(backup.version, 1);
  assert.deepEqual(backup.activities, [{ id: '1' }]);
});

test('importBackup rejeita payload inválido e preserva os dados atuais', () => {
  const engine = makeMemoryEngine();
  saveJSON(engine, ACTIVITIES_KEY, [{ id: 'original' }]);
  assert.throws(() => importBackup(engine, { version: 2 }), /invalid backup/);
  assert.deepEqual(loadJSON(engine, ACTIVITIES_KEY, []), [{ id: 'original' }]);
});

test('importBackup válido sobrescreve as três coleções', () => {
  const engine = makeMemoryEngine();
  importBackup(engine, { version: 1, activities: [{ id: 'x' }], purchases: [], settings: { theme: 'light' } });
  assert.deepEqual(loadJSON(engine, ACTIVITIES_KEY, []), [{ id: 'x' }]);
});
