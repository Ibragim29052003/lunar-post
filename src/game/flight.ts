import { GAME_CONFIG } from './config';
import type { Parcel } from './engine';

export function getFlightStep(
  parcel: Pick<Parcel, 'remainingMs' | 'flightMs'>,
  steps: number = GAME_CONFIG.flightSteps,
): number {
  return Math.max(0, Math.min(steps - 1, Math.floor((1 - parcel.remainingMs / parcel.flightMs) * steps)));
}
