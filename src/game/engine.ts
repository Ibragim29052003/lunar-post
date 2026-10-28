import { GAME_CONFIG, LANES } from './config';
import type { Direction, Lane, Mode } from './config';

export type GameStatus = 'ready' | 'playing' | 'paused' | 'gameover';
export type GameEvent = { id: number; type: 'catch' | 'bonus' | 'miss' | 'gameover'; lane: Lane };
export type Parcel = { id: number; lane: Lane; remainingMs: number; flightMs: number };
export type GameState = {
  status: GameStatus;
  mode: Mode;
  lane: Lane;
  score: number;
  lives: number;
  caught: number;
  combo: number;
  bestCombo: number;
  elapsedMs: number;
  spawnInMs: number;
  nextId: number;
  seed: number;
  parcels: Parcel[];
  event: GameEvent | null;
};

export type GameAction =
  | { type: 'start'; mode: Mode; seed: number }
  | { type: 'tick'; steps: number }
  | { type: 'move'; lane: Lane }
  | { type: 'direction'; direction: Direction }
  | { type: 'pause' }
  | { type: 'resume' };

export function createGame(mode: Mode = 'classic', seed = 1): GameState {
  return {
    status: 'ready',
    mode,
    lane: 'topLeft',
    score: 0,
    lives: GAME_CONFIG.lives,
    caught: 0,
    combo: 0,
    bestCombo: 0,
    elapsedMs: 0,
    spawnInMs: GAME_CONFIG.initialSpawnMs,
    nextId: 1,
    seed: seed >>> 0,
    parcels: [],
    event: null,
  };
}

export function getLevel(caught: number): number {
  return Math.min(GAME_CONFIG.maxLevel, Math.floor(caught / GAME_CONFIG.catchesPerLevel) + 1);
}

export function getTiming(mode: Mode, caught: number) {
  const level = getLevel(caught) - 1;
  const settings = GAME_CONFIG.modes[mode];
  return {
    flightMs:
      Math.max(GAME_CONFIG.minimumStepMs, settings.stepMs - level * GAME_CONFIG.stepSpeedupMs) *
      GAME_CONFIG.flightSteps,
    spawnMs: Math.max(GAME_CONFIG.minimumSpawnMs, settings.spawnMs - level * GAME_CONFIG.spawnSpeedupMs),
  };
}

export function moveDirection(lane: Lane, direction: Direction): Lane {
  const left = lane === 'topLeft' || lane === 'bottomLeft';
  const top = lane === 'topLeft' || lane === 'topRight';
  switch (direction) {
    case 'up':
      return left ? 'topLeft' : 'topRight';
    case 'down':
      return left ? 'bottomLeft' : 'bottomRight';
    case 'left':
      return top ? 'topLeft' : 'bottomLeft';
    case 'right':
      return top ? 'topRight' : 'bottomRight';
  }
}

// A seeded generator makes an entire session reproducible in tests.
function nextRandom(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function tickGame(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  const next = { ...state, elapsedMs: state.elapsedMs + GAME_CONFIG.tickMs, parcels: [] as Parcel[] };
  for (const parcel of state.parcels) {
    const remainingMs = parcel.remainingMs - GAME_CONFIG.tickMs;
    if (remainingMs > 0) {
      next.parcels.push({ ...parcel, remainingMs });
      continue;
    }
    const caught = parcel.lane === next.lane;
    next.combo = caught ? next.combo + 1 : 0;
    const bonus = caught && next.combo % GAME_CONFIG.comboEvery === 0;
    next.score += caught ? GAME_CONFIG.points + (bonus ? GAME_CONFIG.comboBonus : 0) : 0;
    next.caught += caught ? 1 : 0;
    next.bestCombo = Math.max(next.bestCombo, next.combo);
    next.lives -= caught ? 0 : 1;
    next.event = {
      id: (next.event?.id ?? 0) + 1,
      type: caught ? (bonus ? 'bonus' : 'catch') : next.lives === 0 ? 'gameover' : 'miss',
      lane: parcel.lane,
    };
    if (next.lives === 0) return { ...next, status: 'gameover', parcels: [] };
  }
  next.spawnInMs -= GAME_CONFIG.tickMs;
  if (next.spawnInMs <= 0) {
    next.seed = nextRandom(next.seed);
    const lane = LANES[Math.floor((next.seed / 4294967296) * LANES.length)] ?? 'topLeft';
    const timing = getTiming(next.mode, next.caught);
    // Freeze travel time at spawn, and leave at least 500 ms between arrivals.
    const previous = next.parcels[next.parcels.length - 1];
    const flightMs = Math.max(
      timing.flightMs,
      (previous?.remainingMs ?? 0) + GAME_CONFIG.minimumArrivalGapMs,
    );
    next.parcels.push({ id: next.nextId, lane, remainingMs: flightMs, flightMs });
    next.nextId += 1;
    next.spawnInMs += timing.spawnMs;
  }
  return next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return { ...createGame(action.mode, action.seed), status: 'playing' };
    case 'tick': {
      let next = state;
      for (let i = 0; i < action.steps; i += 1) next = tickGame(next);
      return next;
    }
    case 'move':
      return state.status === 'playing' ? { ...state, lane: action.lane } : state;
    case 'direction':
      return state.status === 'playing'
        ? { ...state, lane: moveDirection(state.lane, action.direction) }
        : state;
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state;
  }
}
