export const ACTIVITIES_KEY = 'activities-v1';
export const PURCHASES_KEY = 'purchases-v1';
export const SETTINGS_KEY = 'settings-v1';

export function makeMemoryEngine() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

export function loadJSON(engine, key, fallback) {
  const raw = engine.getItem(key);
  if (raw === null || raw === undefined) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(engine, key, value) {
  engine.setItem(key, JSON.stringify(value));
}

export function exportBackup(engine) {
  return {
    version: 1,
    activities: loadJSON(engine, ACTIVITIES_KEY, []),
    purchases: loadJSON(engine, PURCHASES_KEY, []),
    settings: loadJSON(engine, SETTINGS_KEY, {}),
  };
}

export function importBackup(engine, backupData) {
  const isValid =
    backupData &&
    backupData.version === 1 &&
    Array.isArray(backupData.activities) &&
    Array.isArray(backupData.purchases) &&
    typeof backupData.settings === 'object' &&
    backupData.settings !== null;

  if (!isValid) {
    throw new Error('invalid backup');
  }

  saveJSON(engine, ACTIVITIES_KEY, backupData.activities);
  saveJSON(engine, PURCHASES_KEY, backupData.purchases);
  saveJSON(engine, SETTINGS_KEY, backupData.settings);
}
