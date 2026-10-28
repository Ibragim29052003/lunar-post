export const LANES = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
export type Lane = (typeof LANES)[number];
export type Mode = 'classic' | 'express';
export type Direction = 'up' | 'down' | 'left' | 'right';

export const GAME_CONFIG = {
  tickMs: 50,
  maxFrameMs: 250,
  lives: 3,
  flightSteps: 5,
  points: 10,
  comboEvery: 5,
  comboBonus: 5,
  catchesPerLevel: 8,
  maxLevel: 10,
  initialSpawnMs: 600,
  modes: {
    classic: { label: 'Игра А', name: 'Спокойная орбита', stepMs: 540, spawnMs: 1650 },
    express: { label: 'Игра Б', name: 'Почтовый экспресс', stepMs: 440, spawnMs: 1250 },
  },
  minimumStepMs: 250,
  minimumSpawnMs: 700,
  stepSpeedupMs: 25,
  spawnSpeedupMs: 90,
  minimumArrivalGapMs: 500,
} as const;

export const LANE_INFO: Record<Lane, { label: string; arrow: string; key: string; sector: string }> = {
  topLeft: { label: 'Верхний левый сектор', arrow: '↖', key: 'Q', sector: '01' },
  topRight: { label: 'Верхний правый сектор', arrow: '↗', key: 'E', sector: '02' },
  bottomLeft: { label: 'Нижний левый сектор', arrow: '↙', key: 'Z', sector: '03' },
  bottomRight: { label: 'Нижний правый сектор', arrow: '↘', key: 'C', sector: '04' },
};
