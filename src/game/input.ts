import { LANES, LANE_INFO } from './config';
import type { Direction, Lane } from './config';

const DIRECT_KEYS = new Map<string, Lane>(LANES.map((lane) => [`Key${LANE_INFO[lane].key}`, lane] as const));
const DIRECTION_KEYS = new Map<string, Direction>([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
  ['KeyW', 'up'],
  ['KeyS', 'down'],
  ['KeyA', 'left'],
  ['KeyD', 'right'],
]);

export function getMovement(code: string) {
  const lane = DIRECT_KEYS.get(code);
  const direction = DIRECTION_KEYS.get(code);
  if (lane) return { type: 'move' as const, lane };
  if (direction) return { type: 'direction' as const, direction };
  return null;
}
