import { useEffect, useRef } from 'react';

import { GAME_CONFIG } from '../game/config';

import { Icon } from './Icon';
import styles from './App/App.module.less';

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.addEventListener('cancel', onClose);
    dialog?.addEventListener('close', onClose);
    return () => {
      dialog?.removeEventListener('cancel', onClose);
      dialog?.removeEventListener('close', onClose);
    };
  }, [onClose]);
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="help-title">
      <div className={styles.dialogHeader}>
        <span className={styles.eyebrow}>ИНСТРУКЦИЯ К ПРИБОРУ</span>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Закрыть инструкцию">
          <Icon name="close" />
        </button>
      </div>
      <h2 id="help-title">
        Ваша первая смена
        <br />
        на Луне.
      </h2>
      <p>
        Четыре станции отправляют посылки. Переводите корзину космонавта в нужный сектор и держите её там,
        пока посылка не прилетит.
      </p>
      <div className={styles.helpKeys}>
        <kbd>Q ↖</kbd>
        <kbd>E ↗</kbd>
        <kbd>Z ↙</kbd>
        <kbd>C ↘</kbd>
      </div>
      <p>
        Стрелки и WASD меняют сторону или высоту корзины. Q, E, Z, C сразу выбирают угол — в любой раскладке.
        На телефоне нажимайте круглые кнопки прибора.
      </p>
      <ul>
        <li>
          Каждая посылка — {GAME_CONFIG.points} очков. Каждые {GAME_CONFIG.comboEvery} подряд — ещё{' '}
          {GAME_CONFIG.comboBonus}.
        </li>
        <li>Доставок до ускорения орбиты: {GAME_CONFIG.catchesPerLevel}.</li>
        <li>Лимит пропусков за смену: {GAME_CONFIG.lives}.</li>
        <li>Игра А — обычный темп. Игра Б — быстрый экспресс.</li>
      </ul>
      <p>
        <kbd>Пробел</kbd> — старт или пауза, <kbd>P</kbd> / <kbd>Esc</kbd> — пауза. При уходе со вкладки игра
        сама приостановится.
      </p>
      <p className={styles.helpNote}>
        Рекорды двух режимов сохраняются в этом браузере. Звук можно отключить кнопкой на корпусе.
      </p>
      <button type="button" className={styles.primaryButton} onClick={onClose}>
        Всё ясно, я на смену <Icon name="arrow" />
      </button>
    </dialog>
  );
}
