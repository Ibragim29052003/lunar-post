import { expect, it } from 'vitest';

import { getMovement } from './input';

it('uses physical key codes for direct sectors regardless of keyboard layout', () => {
  expect(getMovement('KeyQ')).toEqual({ type: 'move', lane: 'topLeft' });
  expect(getMovement('KeyE')).toEqual({ type: 'move', lane: 'topRight' });
  expect(getMovement('KeyZ')).toEqual({ type: 'move', lane: 'bottomLeft' });
  expect(getMovement('KeyC')).toEqual({ type: 'move', lane: 'bottomRight' });
});
it('supports both arrows and WASD', () => {
  expect(getMovement('KeyW')).toEqual(getMovement('ArrowUp'));
  expect(getMovement('KeyA')).toEqual(getMovement('ArrowLeft'));
  expect(getMovement('KeyS')).toEqual(getMovement('ArrowDown'));
  expect(getMovement('KeyD')).toEqual(getMovement('ArrowRight'));
});
it('ignores unrelated keys', () => {
  expect(getMovement('KeyT')).toBeNull();
});
it.each(['constructor', '__proto__', 'toString', ''])('does not treat %s as an inherited command', (code) => {
  expect(getMovement(code)).toBeNull();
});
