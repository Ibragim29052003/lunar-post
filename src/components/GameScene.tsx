import { memo } from 'react';

import { GAME_CONFIG, LANES } from '../game/config';
import type { Lane } from '../game/config';
import type { GameState } from '../game/engine';
import { getFlightStep } from '../game/flight';

const TRACKS: Record<Lane, { x: number; y: number; endX: number; endY: number }> = {
  topLeft: { x: 57, y: 73, endX: 233, endY: 151 },
  topRight: { x: 543, y: 73, endX: 367, endY: 151 },
  bottomLeft: { x: 57, y: 270, endX: 233, endY: 220 },
  bottomRight: { x: 543, y: 270, endX: 367, endY: 220 },
};

function ParcelShape({ x, y, ghost = false }: { x: number; y: number; ghost?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-12)`} opacity={ghost ? 0.095 : 1}>
      <rect
        x="-9"
        y="-8"
        width="18"
        height="16"
        rx="1"
        fill={ghost ? 'none' : 'var(--lcd)'}
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path d="M-9-8 0-1 9-8M0-8v6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </g>
  );
}

function Station({ x, y, mirror, number }: { x: number; y: number; mirror: boolean; number: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${mirror ? -1 : 1} 1)`}>
      <path
        d="M-24 16h45v19h-45zM-16 16V-7h28v23M-11-7v-8H7v8M-2-15v-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M-21 21h39M-21 28h39M-11 0h18v10h-18z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="-2" cy="-26" r="3" fill="currentColor" />
      <text x="-10" y="49" fontSize="10" transform={mirror ? 'scale(-1 1)' : undefined}>
        {number}
      </text>
    </g>
  );
}

function GameSceneView({ state }: { state: GameState }) {
  const active = TRACKS[state.lane];
  const lastStep = Math.max(1, GAME_CONFIG.flightSteps - 1);
  const left = state.lane === 'topLeft' || state.lane === 'bottomLeft';
  return (
    <svg
      viewBox="0 0 600 340"
      role="img"
      aria-label="Космонавт ловит посылки из четырёх лунных станций"
      style={{ display: 'block', width: '100%' }}
    >
      <defs>
        <pattern id="stars" width="81" height="69" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="17" r="1" fill="currentColor" opacity=".3" />
          <path d="M63 41h6m-3-3v6" stroke="currentColor" opacity=".2" />
        </pattern>
      </defs>
      <rect width="600" height="340" fill="url(#stars)" />
      <g fill="none" stroke="currentColor" opacity=".22">
        <ellipse cx="300" cy="177" rx="239" ry="106" strokeDasharray="3 8" />
        <circle cx="300" cy="51" r="27" strokeWidth="1.8" />
        <path d="m284 32 10 9-5 11 17 8 3 14m-4-48 8 16 12 6" strokeWidth="1.5" />
        <path d="M279 82h42M300 88v8" />
      </g>
      <text x="300" y="113" textAnchor="middle" fontSize="9" letterSpacing="3" opacity=".45">
        ЗЕМЛЯ НА СВЯЗИ
      </text>
      <g opacity=".55">
        <Station x={48} y={31} mirror={false} number="01" />
        <Station x={552} y={31} mirror number="02" />
        <Station x={48} y={231} mirror={false} number="03" />
        <Station x={552} y={231} mirror number="04" />
      </g>
      {LANES.map((lane) => {
        const track = TRACKS[lane];
        return (
          <g key={lane}>
            <path
              d={`M${track.x} ${track.y + 16} ${track.endX} ${track.endY + 16}`}
              stroke="currentColor"
              strokeWidth="1"
              opacity=".14"
              strokeDasharray="2 5"
            />
            {Array.from({ length: GAME_CONFIG.flightSteps }, (_, i) => (
              <ParcelShape
                key={i}
                x={track.x + ((track.endX - track.x) * i) / lastStep}
                y={track.y + ((track.endY - track.y) * i) / lastStep}
                ghost
              />
            ))}
            <path
              d={`M${lane.includes('Left') ? 281 : 319} 195 ${track.endX} ${track.endY + 10}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              opacity=".07"
            />
            <path
              d={`M${track.endX - 16} ${track.endY + 6}v16h32v-16`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              opacity=".1"
            />
          </g>
        );
      })}
      {state.parcels.map((parcel) => {
        const track = TRACKS[parcel.lane];
        const step = getFlightStep(parcel);
        return (
          <ParcelShape
            key={parcel.id}
            x={track.x + ((track.endX - track.x) * step) / lastStep}
            y={track.y + ((track.endY - track.y) * step) / lastStep}
          />
        );
      })}
      <g stroke="currentColor" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M277 200q-26 27-4 53t-22 28" strokeWidth="2" opacity=".5" />
        <rect x={left ? 319 : 266} y="184" width="15" height="39" rx="3" strokeWidth="2.5" />
        <path d="M286 180h28l8 49h-44z" fill="var(--lcd)" strokeWidth="3" />
        <path d="m287 229-10 27h16l9-25m12-2 14 26h-16l-9-24" strokeWidth="4" />
        <circle cx="300" cy="155" r="29" fill="var(--lcd)" strokeWidth="3" />
        <rect x="281" y="143" width="38" height="23" rx="10" fill="currentColor" strokeWidth="1" />
        <path d="m289 149 8-2m10 0h3" stroke="var(--lcd)" strokeWidth="2" />
        <path d="M292 194h16v16h-16zM295 214h10" strokeWidth="2" />
        <path d={`M${left ? 283 : 317} 194 ${active.endX} ${active.endY + 14}`} strokeWidth="10" />
        <path d={`M${left ? 318 : 282} 194 ${left ? 331 : 269} 213`} strokeWidth="9" />
        <path d={`M${active.endX - 18} ${active.endY + 3}v20h36v-20m-36 7h36`} strokeWidth="3" />
      </g>
      <g fill="none" stroke="currentColor" opacity=".3">
        <path d="M129 340q171-98 342 0" strokeWidth="2" />
        <ellipse cx="263" cy="319" rx="22" ry="6" />
        <ellipse cx="351" cy="331" rx="36" ry="8" />
        <ellipse cx="324" cy="305" rx="10" ry="3" />
        <path d="M387 316v-36m0 1h23l-5 8h-18" strokeWidth="2" />
      </g>
      <text x="300" y="289" textAnchor="middle" fontSize="10" letterSpacing="2" opacity=".5">
        ЛУННАЯ ПОЧТА
      </text>
    </svg>
  );
}

// A 50 ms simulation tick need not redraw unchanged LCD segments.
export const GameScene = memo(GameSceneView, (previous, next) => {
  const before = previous.state;
  const after = next.state;
  return (
    before.lane === after.lane &&
    before.parcels.length === after.parcels.length &&
    before.parcels.every((parcel, index) => {
      const current = after.parcels[index];
      return (
        current &&
        parcel.id === current.id &&
        parcel.lane === current.lane &&
        getFlightStep(parcel) === getFlightStep(current)
      );
    })
  );
});
