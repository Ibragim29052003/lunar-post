// @vitest-environment jsdom
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY } from '../../game/storage';

import { App } from './App';

let container: HTMLDivElement;
let mounted = false;
const frames = new Set<number>();

function mount() {
  act(() => {
    ReactDOM.render(<App />, container);
  });
  mounted = true;
}
function unmount() {
  if (mounted)
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  mounted = false;
}
function button(name: string): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')].find(
    (el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() === name,
  );
  if (!result) throw new Error(`Missing button: ${name}`);
  return result;
}
function click(name: string) {
  act(() => button(name).click());
}
function key(code: string, options: KeyboardEventInit = {}, target: EventTarget = window) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code, ...options }));
  });
}
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
function selected(name: string) {
  return button(name).getAttribute('aria-pressed') === 'true';
}
function score() {
  return container.querySelector('output')?.getAttribute('aria-label');
}
function parcelPositions() {
  return [...container.querySelectorAll('svg[role="img"] > g[opacity="1"]')].map((el) =>
    el.getAttribute('transform'),
  );
}
function pointer(name: string, type = 'touch', mouseButton = 0) {
  const event = new MouseEvent('pointerdown', { button: mouseButton, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerType', { value: type });
  act(() => {
    button(name).dispatchEvent(event);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Date, 'now').mockReturnValue(42);
  frames.clear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = window.setTimeout(() => {
      frames.delete(id);
      callback(performance.now());
    }, 16);
    frames.add(id);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id);
    window.clearTimeout(id);
  });
  vi.stubGlobal('AudioContext', undefined);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  });
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  unmount();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('complete game interface', () => {
  it('starts ready, starts a shift, and locks the mode during a shift', () => {
    mount();
    expect(button('Верхний левый сектор, клавиша Q').disabled).toBe(true);
    expect(score()).toBe('Счёт: 0');
    click('НАЧАТЬ СМЕНУ');
    expect(button('Верхний левый сектор, клавиша Q').disabled).toBe(false);
    expect(button('Игра А').disabled).toBe(true);
    expect(button('Игра Б').disabled).toBe(true);
    expect(selected('Верхний левый сектор, клавиша Q')).toBe(true);
  });

  it('supports direct physical keys, arrows, WASD and keyboard button activation', () => {
    mount();
    key('Space');
    key('KeyC');
    expect(selected('Нижний правый сектор, клавиша C')).toBe(true);
    key('ArrowUp');
    expect(selected('Верхний правый сектор, клавиша E')).toBe(true);
    key('KeyA');
    expect(selected('Верхний левый сектор, клавиша Q')).toBe(true);
    key('KeyS');
    expect(selected('Нижний левый сектор, клавиша Z')).toBe(true);
    click('Нижний правый сектор, клавиша C');
    expect(selected('Нижний правый сектор, клавиша C')).toBe(true);
  });

  it.each(['touch', 'mouse', 'pen'])('responds to %s on press, without waiting for release', (type) => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    pointer('Нижний левый сектор, клавиша Z', type);
    expect(selected('Нижний левый сектор, клавиша Z')).toBe(true);
    key('KeyC');
    act(() => {
      button('Нижний левый сектор, клавиша Z').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
    });
    expect(selected('Нижний правый сектор, клавиша C')).toBe(true);
  });

  it('ignores right mouse buttons, keyboard modifiers, and repeated start keys', () => {
    mount();
    key('Space', { repeat: true });
    expect(button('НАЧАТЬ СМЕНУ').disabled).toBe(false);
    key('Space');
    pointer('Нижний правый сектор, клавиша C', 'mouse', 2);
    key('KeyC', { ctrlKey: true });
    expect(selected('Верхний левый сектор, клавиша Q')).toBe(true);
    key('KeyP', { repeat: true });
    expect(button('Пауза').disabled).toBe(false);
  });

  it('catches a real parcel, shows a new record and delivery count, and starts fresh', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    key('KeyE');
    advance(3350);
    expect(score()).toBe('Счёт: 10');
    expect(container.querySelector('[aria-label="Рекорд: 10"]')).not.toBeNull();
    advance(30000);
    expect(container.textContent).toContain('Смена окончена.');
    expect(container.textContent).toContain('Новый личный рекорд!');
    expect(container.textContent).toContain('Посылок доставлено:');
    click('ЕЩЁ ОДНУ СМЕНУ');
    expect(score()).toBe('Счёт: 0');
    expect(container.querySelector('[aria-label="Осталось попыток: 3"]')).not.toBeNull();
  });

  it('freezes parcels and lives while paused, then continues only on demand', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    advance(1000);
    key('KeyP');
    const positions = parcelPositions();
    expect(positions).toHaveLength(1);
    advance(10000);
    expect(parcelPositions()).toEqual(positions);
    expect(container.querySelector('[aria-label="Осталось попыток: 3"]')).not.toBeNull();
    key('KeyC');
    expect(selected('Верхний левый сектор, клавиша Q')).toBe(true);
    click('ПРОДОЛЖИТЬ');
    advance(600);
    expect(parcelPositions()).not.toEqual(positions);
  });

  it('pauses for window blur and does not auto-resume when focus returns', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    act(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(button('ПРОДОЛЖИТЬ').disabled).toBe(false);
    advance(10000);
    expect(score()).toBe('Счёт: 0');
  });

  it('pauses when hidden and stays paused after the tab becomes visible', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(button('ПРОДОЛЖИТЬ').disabled).toBe(false);
  });

  it('opens modal help, blocks game keys, and closes without losing the pause', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    click('Как играть');
    const dialog = container.querySelector('dialog');
    expect(dialog?.open).toBe(true);
    key('KeyP');
    expect(button('Верхний левый сектор, клавиша Q').disabled).toBe(true);
    act(() => {
      dialog?.dispatchEvent(new Event('cancel'));
    });
    expect(dialog?.open).toBe(false);
    expect(button('ПРОДОЛЖИТЬ').disabled).toBe(false);
  });

  it('preserves records and the sound preference across remounting', () => {
    mount();
    click('Выключить звук');
    click('НАЧАТЬ СМЕНУ');
    key('KeyE');
    advance(3350);
    unmount();
    mount();
    expect(button('Включить звук').getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[aria-label="Рекорд: 10"]')).not.toBeNull();
    expect(score()).toBe('Счёт: 0');
  });

  it('updates the visible record from another tab without touching the active shift', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ classic: 200, express: 300, muted: true }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });
    expect(container.querySelector('[aria-label="Рекорд: 200"]')).not.toBeNull();
    expect(score()).toBe('Счёт: 0');
    expect(button('Включить звук').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the express record separate and starts the selected mode', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ classic: 100, express: 20, muted: false }));
    mount();
    click('Игра Б');
    expect(container.querySelector('[aria-label="Рекорд: 20"]')).not.toBeNull();
    click('НАЧАТЬ СМЕНУ');
    key('KeyP');
    expect(container.textContent).toContain('ПОЧТОВЫЙ ЭКСПРЕСС');
  });

  it('explains unavailable storage while keeping gameplay functional', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    mount();
    expect(container.textContent).toContain('Хранилище браузера недоступно.');
    click('НАЧАТЬ СМЕНУ');
    key('KeyE');
    advance(3350);
    expect(score()).toBe('Счёт: 10');
  });

  it('cleans up animation frames and notification timers on unmount', () => {
    mount();
    click('НАЧАТЬ СМЕНУ');
    key('KeyE');
    advance(3350);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(frames.size).toBe(0);
    vi.runOnlyPendingTimers();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('limits simulation time after a very long delayed animation frame', () => {
    let callback: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => {
      callback = next;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    mount();
    click('НАЧАТЬ СМЕНУ');
    act(() => {
      callback?.(10000);
    });
    expect(parcelPositions()).toHaveLength(0);
    act(() => {
      callback?.(20000);
    });
    expect(parcelPositions()).toHaveLength(0);
    act(() => {
      callback?.(30000);
    });
    expect(parcelPositions()).toHaveLength(1);
    expect(container.querySelector('[aria-label="Осталось попыток: 3"]')).not.toBeNull();
  });
  it('does not announce a tied record as a new personal record', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ classic: 10, express: 0, muted: false }));
    mount();
    key('Space');
    key('KeyE');
    advance(3350);
    advance(30000);
    expect(container.textContent).toContain('Смена окончена.');
    expect(container.textContent).not.toContain('Новый личный рекорд!');
  });
  it('leaves typing and native Space activation on a focused button alone', () => {
    mount();
    key('Space', {}, button('Выключить звук'));
    expect(button('НАЧАТЬ СМЕНУ').disabled).toBe(false);
    click('НАЧАТЬ СМЕНУ');
    const input = document.createElement('input');
    container.appendChild(input);
    key('KeyC', {}, input);
    expect(selected('Верхний левый сектор, клавиша Q')).toBe(true);
    input.remove();
  });
});

it.each(['ready', 'playing', 'paused', 'gameover', 'help'] as const)(
  'has no axe accessibility violations on the %s screen',
  async (status) => {
    mount();
    if (status !== 'ready' && status !== 'help') click('НАЧАТЬ СМЕНУ');
    if (status === 'paused') key('KeyP');
    if (status === 'gameover') advance(30000);
    if (status === 'help') click('Как играть');
    vi.useRealTimers();
    const { default: axe } = await import('axe-core');
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.map((issue) => ({ id: issue.id, targets: issue.nodes.map((node) => node.target) })),
    ).toEqual([]);
  },
);
