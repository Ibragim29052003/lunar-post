import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAudio } from './audio';

function stubAudio(initialState = 'running') {
  const gains: {
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  const oscillators: {
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }[] = [];
  const context = {
    state: initialState,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      await Promise.resolve();
      context.state = 'running';
    }),
    close: vi.fn(async () => {
      context.state = 'closed';
    }),
    createGain: vi.fn(() => {
      const node = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(node);
      return node;
    }),
    createOscillator: vi.fn(() => {
      const node = {
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as (() => void) | null,
      };
      oscillators.push(node);
      return node;
    }),
  };
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return context;
      }
    },
  );
  return { context, gains, oscillators };
}
afterEach(() => vi.unstubAllGlobals());

describe('optional Web Audio', () => {
  it('does not create a context before a user interaction', () => {
    const { context } = stubAudio();
    const audio = createAudio();
    audio.play('start');
    expect(context.createGain).not.toHaveBeenCalled();
  });
  it('schedules the complete catch sound and releases ended nodes', () => {
    const { oscillators, gains } = stubAudio();
    const audio = createAudio();
    audio.unlock();
    audio.play('catch');
    expect(oscillators).toHaveLength(2);
    expect(oscillators[0]?.frequency.value).toBe(740);
    oscillators[0]?.onended?.();
    expect(oscillators[0]?.disconnect).toHaveBeenCalledOnce();
    expect(gains[1]?.disconnect).toHaveBeenCalledOnce();
    audio.dispose();
  });
  it('plays the first sound after an asynchronous browser audio unlock', async () => {
    const { context, oscillators } = stubAudio('suspended');
    let allow: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      allow = () => {
        context.state = 'running';
        resolve();
      };
    });
    context.resume.mockReturnValue(ready);
    const audio = createAudio();
    audio.unlock();
    audio.play('start');
    expect(oscillators).toHaveLength(0);
    allow?.();
    await ready;
    await Promise.resolve();
    expect(oscillators).toHaveLength(3);
    audio.dispose();
  });
  it('mutes scheduled audio immediately and cancels a pending unlock sound', async () => {
    const { context, gains, oscillators } = stubAudio('suspended');
    const audio = createAudio();
    audio.unlock();
    audio.play('start');
    audio.setEnabled(false);
    await Promise.resolve();
    expect(gains[0]?.gain.value).toBe(0);
    expect(oscillators).toHaveLength(0);
    audio.play('catch');
    expect(oscillators).toHaveLength(0);
    audio.dispose();
    expect(context.close).toHaveBeenCalledOnce();
  });
  it('silences notes already scheduled before the mute button is pressed', () => {
    const { gains, oscillators } = stubAudio();
    const audio = createAudio();
    audio.unlock();
    audio.play('start');
    expect(oscillators).toHaveLength(3);
    audio.setEnabled(false);
    expect(gains[0]?.gain.value).toBe(0);
    audio.play('catch');
    expect(oscillators).toHaveLength(3);
    audio.dispose();
  });
  it('does not play after disposal while audio resume is still pending', async () => {
    const { oscillators } = stubAudio('suspended');
    const audio = createAudio();
    audio.unlock();
    audio.play('start');
    audio.dispose();
    await Promise.resolve();
    expect(oscillators).toHaveLength(0);
  });
  it('tolerates unavailable audio and rejected browser permissions', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const silent = createAudio();
    expect(() => {
      silent.unlock();
      silent.play('miss');
      silent.dispose();
    }).not.toThrow();
    const { context, oscillators } = stubAudio('suspended');
    context.resume.mockRejectedValue(new Error('Not allowed'));
    const audio = createAudio();
    audio.unlock();
    audio.play('start');
    await Promise.resolve();
    await Promise.resolve();
    expect(oscillators).toHaveLength(0);
    audio.dispose();
  });
});
