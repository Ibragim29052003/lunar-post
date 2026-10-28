import { useCallback, useEffect, useReducer } from 'react';

import { GAME_CONFIG } from './config';
import type { Lane, Mode } from './config';
import { createGame, gameReducer } from './engine';
import { getMovement } from './input';

export function useGame(mode: Mode, helpOpen: boolean, onInteraction: () => void) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createGame());
  const start = useCallback(() => {
    onInteraction();
    dispatch({ type: 'start', mode, seed: Date.now() });
  }, [mode, onInteraction]);
  const move = useCallback(
    (lane: Lane) => {
      onInteraction();
      dispatch({ type: 'move', lane });
    },
    [onInteraction],
  );
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const togglePause = useCallback(() => {
    onInteraction();
    dispatch({ type: state.status === 'paused' ? 'resume' : 'pause' });
  }, [state.status, onInteraction]);

  useEffect(() => {
    if (state.status !== 'playing') return undefined;
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    const loop = (now: number) => {
      accumulator += Math.min(now - previous, GAME_CONFIG.maxFrameMs);
      previous = now;
      const steps = Math.floor(accumulator / GAME_CONFIG.tickMs);
      if (steps > 0) {
        accumulator -= steps * GAME_CONFIG.tickMs;
        dispatch({ type: 'tick', steps });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (helpOpen || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))
      )
        return;
      const movement = getMovement(event.code);
      if (movement && state.status === 'playing') {
        event.preventDefault();
        onInteraction();
        dispatch(movement);
      }
      if (event.code === 'Escape' || event.code === 'KeyP') {
        if (state.status === 'playing' || state.status === 'paused') {
          event.preventDefault();
          if (!event.repeat) togglePause();
        }
      }
      if (event.code === 'Space') {
        if (target instanceof HTMLButtonElement) return;
        event.preventDefault();
        if (event.repeat) return;
        if (state.status === 'ready' || state.status === 'gameover') start();
        else togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, onInteraction, start, state.status, togglePause]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pause]);

  return { state, start, move, pause, togglePause };
}
