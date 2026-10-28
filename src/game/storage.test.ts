import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PREFERENCES, readPreferences, savePreferences, STORAGE_KEY } from './storage';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('local preferences', () => {
  it('uses defaults when there is no saved state', () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
  it('persists independent records and sound preferences', () => {
    const preferences = { classic: 210, express: 95, muted: true };
    savePreferences(preferences);
    expect(readPreferences()).toEqual(preferences);
  });
  it('recovers from malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
  it('validates stored data instead of trusting arbitrary values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ classic: -20, express: '99', muted: 'yes' }));
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ classic: 5.5, express: 30, muted: false }));
    expect(readPreferences()).toEqual({ classic: 0, express: 30, muted: false });
  });
  it('continues to work when storage access is denied', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Denied');
      },
      setItem: () => {
        throw new Error('Quota');
      },
    });
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(() => savePreferences(DEFAULT_PREFERENCES)).not.toThrow();
  });
});

it('does not overwrite a higher record from another tab with an older value', () => {
  savePreferences({ classic: 250, express: 80, muted: false });
  expect(savePreferences({ classic: 10, express: 100, muted: true })).toBe(true);
  expect(readPreferences()).toEqual({ classic: 250, express: 100, muted: true });
});
it('reports failed persistence without throwing', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {
      throw new Error('Quota');
    },
  });
  expect(savePreferences(DEFAULT_PREFERENCES)).toBe(false);
});
