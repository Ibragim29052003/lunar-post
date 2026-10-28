import classNames from 'classnames';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createAudio } from '../../game/audio';
import { GAME_CONFIG, LANE_INFO } from '../../game/config';
import type { Lane, Mode } from '../../game/config';
import { getLevel } from '../../game/engine';
import { readPreferences, savePreferences, STORAGE_KEY } from '../../game/storage';
import { useGame } from '../../game/useGame';
import { GameScene } from '../GameScene';
import { Digits } from '../Digits';
import { HelpDialog } from '../HelpDialog';
import { Icon } from '../Icon';

import styles from './App.module.less';

const padded = (value: number, length = 4) => String(value).padStart(length, '0');

function DirectionButton({
  lane,
  active,
  disabled,
  onMove,
}: {
  lane: Lane;
  active: boolean;
  disabled: boolean;
  onMove: (lane: Lane) => void;
}) {
  const info = LANE_INFO[lane];
  return (
    <div className={styles.directionControl}>
      <span className={styles.sectorLabel}>СЕКТОР {info.sector}</span>
      <button
        type="button"
        className={classNames(styles.directionButton, { [styles.pressed ?? '']: active })}
        aria-label={`${info.label}, клавиша ${info.key}`}
        aria-pressed={active}
        disabled={disabled}
        onPointerDown={(event) => {
          if (event.button === 0) {
            event.preventDefault();
            onMove(lane);
          }
        }}
        onClick={(event) => {
          if (event.detail === 0) onMove(lane);
        }}
      >
        <span aria-hidden="true">{info.arrow}</span>
      </button>
      <kbd>{info.key}</kbd>
    </div>
  );
}

export const App = () => {
  const [mode, setMode] = useState<Mode>('classic');
  const [preferences, setPreferences] = useState(readPreferences);
  const [helpOpen, setHelpOpen] = useState(false);
  const [audio] = useState(createAudio);
  const [flash, setFlash] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const recordBefore = useRef(0);
  const deviceRef = useRef<HTMLElement>(null);
  const onInteraction = useCallback(() => audio.unlock(), [audio]);
  const { state, start, move, pause, togglePause } = useGame(mode, helpOpen, onInteraction);
  const inSession = state.status === 'playing' || state.status === 'paused';
  const displayMode = inSession || state.status === 'gameover' ? state.mode : mode;
  const record = preferences[displayMode];

  useEffect(() => {
    audio.setEnabled(!preferences.muted);
  }, [audio, preferences.muted]);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => {
    setStorageAvailable(savePreferences(preferences));
  }, [preferences]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const saved = readPreferences();
      setPreferences((previous) => {
        const merged = {
          ...saved,
          classic: Math.max(previous.classic, saved.classic),
          express: Math.max(previous.express, saved.express),
        };
        return merged.classic === previous.classic &&
          merged.express === previous.express &&
          merged.muted === previous.muted
          ? previous
          : merged;
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    setPreferences((previous) =>
      state.score > previous[state.mode] ? { ...previous, [state.mode]: state.score } : previous,
    );
  }, [state.mode, state.score]);
  useEffect(() => {
    if (state.status === 'playing' && state.elapsedMs === 0) {
      recordBefore.current = preferences[state.mode];
      audio.play('start');
    }
  }, [audio, preferences, state.elapsedMs, state.mode, state.status]);
  useEffect(() => {
    if (state.status === 'playing') deviceRef.current?.scrollIntoView?.({ block: 'center' });
  }, [state.status]);
  useEffect(() => {
    if (!state.event) {
      setFlash(null);
      return undefined;
    }
    audio.play(state.event.type);
    setFlash(state.event.type);
    const timeout = window.setTimeout(() => setFlash(null), 550);
    return () => window.clearTimeout(timeout);
  }, [audio, state.event]);

  const begin = () => {
    start();
  };
  const openHelp = () => {
    pause();
    setHelpOpen(true);
  };
  const toggleSound = () => {
    audio.setEnabled(preferences.muted);
    if (preferences.muted) audio.unlock();
    setPreferences((previous) => ({ ...previous, muted: !previous.muted }));
  };
  const announcement =
    state.status === 'gameover'
      ? `Смена окончена. Итоговый счёт: ${state.score}. Доставлено посылок: ${state.caught}.`
      : state.status === 'paused'
        ? 'Игра на паузе.'
        : state.event?.type === 'miss'
          ? `Посылка потеряна. Осталось попыток: ${state.lives}.`
          : '';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="#game" className={styles.wordmark}>
          <Icon name="orbit" size={34} />
          <span>
            ЭЛЕКТРОННЫЕ
            <br />
            ИСТОРИИ
          </span>
        </a>
        <span className={styles.edition}>
          КАРМАННАЯ КОЛЛЕКЦИЯ <span>/</span> № 001
        </span>
        <button type="button" className={styles.helpButton} onClick={openHelp}>
          Как играть <Icon name="arrow" size={18} />
        </button>
      </header>

      <section className={styles.intro} aria-labelledby="page-title">
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.redDot} /> ПРИВЕТ ИЗ БУДУЩЕГО ПРОШЛОГО
          </p>
          <h1 id="page-title">
            Лунная почта<span>.</span>
          </h1>
          <p className={styles.description}>
            До Земли — 384 400 километров.
            <br />
            До нового рекорда — одна посылка.
          </p>
        </div>
        <div className={styles.stamp} aria-label="Вдохновлено играми восьмидесятых">
          <span>СДЕЛАНО</span>
          <Icon name="orbit" size={44} />
          <span>С ОГЛЯДКОЙ НА 80-е</span>
        </div>
      </section>

      <section ref={deviceRef} id="game" className={styles.device} aria-label="Игровой прибор Лунная почта">
        <i className={classNames(styles.screw, styles.screwTL)} aria-hidden="true" />
        <i className={classNames(styles.screw, styles.screwTR)} aria-hidden="true" />
        <i className={classNames(styles.screw, styles.screwBL)} aria-hidden="true" />
        <i className={classNames(styles.screw, styles.screwBR)} aria-hidden="true" />
        <div className={styles.deviceTop}>
          <span className={styles.brand}>
            <Icon name="orbit" size={25} /> ЭЛЕКТРОНИКА
          </span>
          <span className={styles.model}>
            ИМ–26 <span>·</span> ЛУННАЯ СЕРИЯ
          </span>
        </div>
        <div className={styles.deviceBody}>
          <div className={styles.controlColumn}>
            <DirectionButton
              lane="topLeft"
              active={inSession && state.lane === 'topLeft'}
              disabled={state.status !== 'playing'}
              onMove={move}
            />
            <DirectionButton
              lane="bottomLeft"
              active={inSession && state.lane === 'bottomLeft'}
              disabled={state.status !== 'playing'}
              onMove={move}
            />
          </div>
          <div className={styles.screenFrame}>
            <div
              className={classNames(styles.lcd, {
                [styles.missed ?? '']: flash === 'miss' || flash === 'gameover',
              })}
            >
              <div className={styles.scoreboard}>
                <div>
                  <span className={styles.lcdLabel}>СЧЁТ</span>
                  <output aria-label={`Счёт: ${state.score}`} className={styles.score}>
                    <Digits value={state.score} />
                  </output>
                </div>
                <div className={styles.record}>
                  <span className={styles.lcdLabel}>РЕКОРД {displayMode === 'classic' ? 'А' : 'Б'}</span>
                  <output className={styles.recordDigits} aria-label={`Рекорд: ${record}`} aria-live="off">
                    <Digits value={record} />
                  </output>
                </div>
                <div className={styles.attempts} aria-label={`Осталось попыток: ${state.lives}`}>
                  <span className={styles.lcdLabel}>СВЯЗЬ</span>
                  <div aria-hidden="true">
                    {Array.from({ length: GAME_CONFIG.lives }, (_, index) => index + 1).map((life) => (
                      <span key={life} className={life > state.lives ? styles.lostLife : ''}>
                        <Icon name="parcel" size={21} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.field}>
                <div className={classNames(styles.scene, { [styles.sceneIdle ?? '']: !inSession })}>
                  <GameScene state={state} />
                </div>
                {(flash === 'catch' || flash === 'bonus') && state.status === 'playing' && (
                  <span key={state.event?.id} className={styles.catchPoints} aria-hidden="true">
                    +{GAME_CONFIG.points + (flash === 'bonus' ? GAME_CONFIG.comboBonus : 0)}
                    {flash === 'bonus' ? ' · СЕРИЯ!' : ''}
                  </span>
                )}
                {state.status !== 'playing' && (
                  <div className={styles.overlay}>
                    <span className={styles.overlayEyebrow}>
                      {state.status === 'ready'
                        ? 'ПРИЁМ, КОСМОНАВТ!'
                        : state.status === 'paused'
                          ? 'ОРБИТА ПОДОЖДЁТ'
                          : 'ВОЗВРАЩАЕМСЯ НА ЗЕМЛЮ'}
                    </span>
                    {state.status === 'ready' ? (
                      <>
                        <div className={styles.overlayIcon}>
                          <Icon name="parcel" size={38} />
                        </div>
                        <h2>Вас ждут на Луне.</h2>
                        <p>
                          Ловите посылки. Держите связь.
                          <br />
                          Не подведите землян.
                        </p>
                      </>
                    ) : state.status === 'paused' ? (
                      <>
                        <div className={styles.overlayIcon}>
                          <Icon name="pause" size={34} />
                        </div>
                        <h2>Небольшая пауза.</h2>
                        <p>Ваши посылки никуда не улетят.</p>
                      </>
                    ) : (
                      <>
                        <h2>Смена окончена.</h2>
                        <output
                          className={styles.finalScore}
                          aria-label={`${state.score} очков`}
                          aria-live="off"
                        >
                          <Digits value={state.score} />
                        </output>
                        <p>
                          {state.score > recordBefore.current && (
                            <>
                              Новый личный рекорд!
                              <br />
                            </>
                          )}
                          Посылок доставлено: {state.caught}
                          <br />
                          Лучшая серия: {state.bestCombo}
                        </p>
                      </>
                    )}
                    <button
                      type="button"
                      className={styles.startButton}
                      onClick={state.status === 'paused' ? togglePause : begin}
                    >
                      <Icon name="play" size={15} />{' '}
                      {state.status === 'ready'
                        ? 'НАЧАТЬ СМЕНУ'
                        : state.status === 'paused'
                          ? 'ПРОДОЛЖИТЬ'
                          : 'ЕЩЁ ОДНУ СМЕНУ'}
                    </button>
                    <span className={styles.spaceHint}>
                      {state.status === 'ready'
                        ? 'или нажмите пробел'
                        : state.status === 'paused'
                          ? 'пробел / P / Esc'
                          : 'Луна всё ещё нуждается в вас'}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.telemetry}>
                <span>ОРБИТА {padded(getLevel(state.caught), 2)}</span>
                <span>
                  {state.status === 'playing'
                    ? `СЕРИЯ ${padded(state.combo, 2)}`
                    : GAME_CONFIG.modes[displayMode].name.toUpperCase()}
                </span>
                <span className={styles.signal}>
                  <i />
                  {state.status === 'playing' ? 'НА СВЯЗИ' : state.status === 'paused' ? 'ПАУЗА' : 'ОЖИДАНИЕ'}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.controlColumn}>
            <DirectionButton
              lane="topRight"
              active={inSession && state.lane === 'topRight'}
              disabled={state.status !== 'playing'}
              onMove={move}
            />
            <DirectionButton
              lane="bottomRight"
              active={inSession && state.lane === 'bottomRight'}
              disabled={state.status !== 'playing'}
              onMove={move}
            />
          </div>
        </div>
        <div className={styles.deviceBottom}>
          <div className={styles.modeSwitch} aria-label="Режим игры">
            {(['classic', 'express'] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                disabled={inSession}
                onClick={() => setMode(value)}
                title={GAME_CONFIG.modes[value].name}
              >
                <i />
                {GAME_CONFIG.modes[value].label}
              </button>
            ))}
          </div>
          <div className={styles.deviceTitle}>
            ЛУННАЯ ПОЧТА<span>МИКРОПРОЦЕССОРНАЯ ИГРА</span>
          </div>
          <div className={styles.utilityButtons}>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={preferences.muted ? 'Включить звук' : 'Выключить звук'}
              aria-pressed={!preferences.muted}
              title="Звук"
            >
              <Icon name={preferences.muted ? 'muted' : 'sound'} size={18} />
            </button>
            <button
              type="button"
              onClick={togglePause}
              disabled={!inSession}
              aria-label={state.status === 'paused' ? 'Продолжить игру' : 'Пауза'}
              title="Пауза · P / Esc"
            >
              <Icon name={state.status === 'paused' ? 'play' : 'pause'} size={17} />
            </button>
          </div>
        </div>
        <div className={styles.speaker} aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </section>

      <div className={styles.belowDevice}>
        <span>
          <span className={styles.keyGroup}>
            <kbd>Q</kbd>
            <kbd>E</kbd>
            <kbd>Z</kbd>
            <kbd>C</kbd>
          </span>{' '}
          или стрелки для управления
        </span>
        <span className={styles.touchHint}>На телефоне — кнопки на корпусе</span>
        <span>
          <span className={styles.redDot} /> Лимит пропусков: {GAME_CONFIG.lives}
        </span>
      </div>
      {!storageAvailable && (
        <p className={styles.storageNote} role="status">
          Хранилище браузера недоступно. Рекорд сохранится только до закрытия страницы.
        </p>
      )}
      <section className={styles.rules} aria-label="Краткие правила">
        <div>
          <span>01 / ПРИМИТЕ СМЕНУ</span>
          <p>
            Четыре станции.
            <br />
            Один очень нужный почтальон.
          </p>
        </div>
        <div>
          <span>02 / ДЕРЖИТЕ ТЕМП</span>
          <p>
            Ловите всё, что летит.
            <br />
            {GAME_CONFIG.comboEvery} подряд — приятный бонус.
          </p>
        </div>
        <div>
          <span>03 / ОСТАВЬТЕ СЛЕД</span>
          <p>
            Побейте свой рекорд.
            <br />
            Земля будет вами гордиться.
          </p>
        </div>
      </section>
      <footer className={styles.footer}>
        <span>Вдохновлено «Электроникой». С любовью к деталям.</span>
        <span>
          ЗЕМЛЯ <span className={styles.routeLine}>··········</span> ЛУНА <Icon name="orbit" size={17} />
        </span>
      </footer>
      <div className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
};
