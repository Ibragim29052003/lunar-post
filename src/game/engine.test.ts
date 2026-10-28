import { describe, expect, it } from 'vitest';

import { GAME_CONFIG, LANES } from './config';
import { createGame, gameReducer, getLevel, getTiming, moveDirection, tickGame } from './engine';
import type { GameState } from './engine';

function playing(overrides: Partial<GameState> = {}): GameState {
  return { ...createGame(), status: 'playing', spawnInMs: 10000, ...overrides };
}

const arriving = (lane: GameState['lane'] = 'topLeft') => ({
  id: 1,
  lane,
  remainingMs: GAME_CONFIG.tickMs,
  flightMs: 2700,
});

describe('delivery and scoring', () => {
  it('catches a parcel in the selected sector and removes it once', () => {
    const before = playing({ parcels: [arriving()] });
    const after = tickGame(before);
    expect(after).toMatchObject({
      score: 10,
      caught: 1,
      combo: 1,
      lives: 3,
      parcels: [],
      event: { type: 'catch' },
    });
    expect(tickGame(after).score).toBe(10);
    expect(before.parcels).toHaveLength(1);
    expect(before.score).toBe(0);
  });

  it.each(LANES)('catches parcels in %s', (lane) => {
    expect(tickGame(playing({ lane, parcels: [arriving(lane)] })).score).toBe(10);
  });

  it('awards a bonus on every fifth consecutive delivery', () => {
    const after = tickGame(playing({ score: 40, caught: 4, combo: 4, parcels: [arriving()] }));
    expect(after).toMatchObject({ score: 55, caught: 5, combo: 5, bestCombo: 5, event: { type: 'bonus' } });
  });

  it('loses a life and resets the streak when the basket is elsewhere', () => {
    const after = tickGame(playing({ score: 70, combo: 7, bestCombo: 7, parcels: [arriving('topRight')] }));
    expect(after).toMatchObject({ score: 70, lives: 2, combo: 0, bestCombo: 7, event: { type: 'miss' } });
  });

  it('ends immediately on the third miss and ignores later ticks and movement', () => {
    const after = tickGame(playing({ lives: 1, parcels: [arriving('topRight')] }));
    expect(after).toMatchObject({ status: 'gameover', lives: 0, parcels: [], event: { type: 'gameover' } });
    expect(tickGame(after)).toBe(after);
    expect(gameReducer(after, { type: 'move', lane: 'bottomRight' })).toBe(after);
  });

  it('does not resolve a parcel before its deadline', () => {
    const after = tickGame(playing({ parcels: [{ ...arriving(), remainingMs: 100 }] }));
    expect(after.score).toBe(0);
    expect(after.parcels[0]?.remainingMs).toBe(50);
  });
});

describe('session lifecycle', () => {
  it.each(['ready', 'paused', 'gameover'] as const)('freezes time in %s', (status) => {
    const before = playing({ status, parcels: [arriving()] });
    expect(tickGame(before)).toBe(before);
  });

  it('pauses and resumes without changing progress', () => {
    const before = playing({ score: 20, elapsedMs: 4000, parcels: [arriving()] });
    const paused = gameReducer(before, { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(paused.status).toBe('paused');
    expect(resumed).toEqual(before);
  });

  it('starts a completely fresh session, including after game over', () => {
    const before = playing({ status: 'gameover', score: 500, caught: 40, lives: 0 });
    const after = gameReducer(before, { type: 'start', mode: 'express', seed: 42 });
    expect(after).toEqual({ ...createGame('express', 42), status: 'playing' });
  });

  it('fixed steps do not depend on animation frame grouping', () => {
    const before = playing();
    let after = before;
    for (let step = 0; step < 4; step += 1) after = tickGame(after);
    expect(gameReducer(before, { type: 'tick', steps: 4 })).toEqual(after);
  });
});

describe('spawning and difficulty', () => {
  it('spawns reproducibly after the initial countdown', () => {
    const start = gameReducer(createGame(), { type: 'start', mode: 'classic', seed: 42 });
    const first = gameReducer(start, { type: 'tick', steps: 12 });
    expect(first.parcels).toHaveLength(1);
    expect(first.parcels[0]?.flightMs).toBe(2700);
    expect(gameReducer(start, { type: 'tick', steps: 12 })).toEqual(first);
  });

  it('makes express faster, and caps maximum difficulty', () => {
    expect(getTiming('express', 0).flightMs).toBeLessThan(getTiming('classic', 0).flightMs);
    expect(getLevel(7)).toBe(1);
    expect(getLevel(8)).toBe(2);
    expect(getLevel(10000)).toBe(10);
    expect(getTiming('express', 10000).spawnMs).toBeGreaterThanOrEqual(700);
    expect(getTiming('express', 10000).flightMs).toBeGreaterThanOrEqual(1250);
  });

  it('never moves an in-flight parcel forward when the level changes', () => {
    const parcel = { ...arriving('topRight'), remainingMs: 1800 };
    const after = tickGame(playing({ caught: 7, parcels: [arriving(), parcel] }));
    expect(after.caught).toBe(8);
    expect(after.parcels[0]).toMatchObject({ remainingMs: 1750, flightMs: 2700 });
  });

  it.each(['classic', 'express'] as const)(
    'allows a perfect player to survive 100 deliveries in %s',
    (mode) => {
      let state = gameReducer(createGame(), { type: 'start', mode, seed: 123456 });
      let previousDeadline = -Infinity;
      for (let step = 0; step < 20000 && state.caught < 100; step += 1) {
        const next = [...state.parcels].sort((a, b) => a.remainingMs - b.remainingMs)[0];
        if (next) state = gameReducer(state, { type: 'move', lane: next.lane });
        const due = state.parcels.find((parcel) => parcel.remainingMs <= GAME_CONFIG.tickMs);
        if (due) {
          expect(state.elapsedMs - previousDeadline).toBeGreaterThanOrEqual(500);
          previousDeadline = state.elapsedMs;
        }
        state = tickGame(state);
      }
      expect(state.caught).toBe(100);
      expect(state.lives).toBe(3);
      expect(state.score).toBe(1100);
    },
  );
});

describe('direction controls', () => {
  it('changes only the requested axis', () => {
    expect(moveDirection('topLeft', 'right')).toBe('topRight');
    expect(moveDirection('topRight', 'down')).toBe('bottomRight');
    expect(moveDirection('bottomRight', 'left')).toBe('bottomLeft');
    expect(moveDirection('bottomLeft', 'up')).toBe('topLeft');
    expect(moveDirection('topLeft', 'up')).toBe('topLeft');
  });
});

it.each(Array.from({ length: 24 }, (_, index) => index * 1234567))(
  'survives 200 perfect deliveries in both modes for seed %i',
  (seed) => {
    for (const mode of ['classic', 'express'] as const) {
      let state = gameReducer(createGame(), { type: 'start', mode, seed });
      for (let step = 0; step < 40000 && state.caught < 200; step += 1) {
        const next = state.parcels[0];
        if (next) state = gameReducer(state, { type: 'move', lane: next.lane });
        state = tickGame(state);
        expect(state.parcels.length).toBeLessThanOrEqual(5);
      }
      expect(state.caught).toBe(200);
      expect(state.lives).toBe(3);
      expect(state.bestCombo).toBe(200);
      expect(state.score).toBe(2200);
    }
  },
);
it('does not mutate frozen state or existing in-flight parcels', () => {
  const parcel = Object.freeze({ ...arriving(), remainingMs: 1500 });
  const before = playing({ parcels: [parcel] });
  Object.freeze(before.parcels);
  Object.freeze(before);
  const after = tickGame(before);
  expect(after.parcels[0]?.remainingMs).toBe(1450);
  expect(before.parcels[0]?.remainingMs).toBe(1500);
});
