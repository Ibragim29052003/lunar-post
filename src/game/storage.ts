export type Preferences = { classic: number; express: number; muted: boolean };
export const STORAGE_KEY = 'lunar-post:v1';
export const DEFAULT_PREFERENCES: Preferences = { classic: 0, express: 0, muted: false };

function validScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function readPreferences(): Preferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return { ...DEFAULT_PREFERENCES };
    const data = value as Record<string, unknown>;
    return {
      classic: validScore(data.classic) ? data.classic : 0,
      express: validScore(data.express) ? data.express : 0,
      muted: typeof data.muted === 'boolean' ? data.muted : false,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: Preferences): boolean {
  try {
    const saved = readPreferences();
    const merged = {
      ...preferences,
      classic: Math.max(saved.classic, preferences.classic),
      express: Math.max(saved.express, preferences.express),
    };
    const serialized = JSON.stringify(merged);
    if (localStorage.getItem(STORAGE_KEY) !== serialized) localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
