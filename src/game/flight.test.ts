import { describe, expect, it } from 'vitest';

import { getFlightStep } from './flight';

describe('discrete LCD movement', () => {
  it.each([3, 5, 7, 9])('supports %i positions without jumping beyond the basket', (steps) => {
    const flightMs = steps * 500;
    expect(getFlightStep({ flightMs, remainingMs: flightMs }, steps)).toBe(0);
    expect(getFlightStep({ flightMs, remainingMs: 1 }, steps)).toBe(steps - 1);
    expect(getFlightStep({ flightMs, remainingMs: 0 }, steps)).toBe(steps - 1);
    const positions = new Set<number>();
    for (let remainingMs = flightMs; remainingMs > 0; remainingMs -= 50)
      positions.add(getFlightStep({ flightMs, remainingMs }, steps));
    expect([...positions]).toEqual(Array.from({ length: steps }, (_, index) => index));
  });
  it('does not change the visible segment on every simulation tick', () => {
    expect(getFlightStep({ flightMs: 2700, remainingMs: 2600 })).toBe(
      getFlightStep({ flightMs: 2700, remainingMs: 2550 }),
    );
  });
});
