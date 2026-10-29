import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMemoryEngine } from '../js/storage.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../js/settings.js';

test('loadSettings sem dados salvos retorna os defaults', () => {
  const engine = makeMemoryEngine();
  assert.deepEqual(loadSettings(engine), DEFAULT_SETTINGS);
});

test('saveSettings persiste e uma nova chamada a loadSettings reflete a mudança', () => {
  const engine = makeMemoryEngine();
  saveSettings(engine, { theme: 'light' });
  const reloaded = loadSettings(engine);
  assert.equal(reloaded.theme, 'light');
  assert.equal(reloaded.accent, DEFAULT_SETTINGS.accent);
});
