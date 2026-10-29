import { loadJSON, saveJSON, SETTINGS_KEY } from './storage.js';

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'blue',
  groupPurchasesByDestino: true,
};

export function loadSettings(engine) {
  const saved = loadJSON(engine, SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(engine, patch) {
  const updated = { ...loadSettings(engine), ...patch };
  saveJSON(engine, SETTINGS_KEY, updated);
  return updated;
}
