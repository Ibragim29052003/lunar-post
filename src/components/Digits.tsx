import { memo } from 'react';

const SEGMENTS = [
  '5,1 21,1 18,4 8,4',
  '22,2 21,17 18,19 19,6',
  '21,21 20,36 17,33 18,23',
  '4,38 19,38 16,35 7,35',
  '2,21 5,24 4,33 1,36',
  '3,2 6,6 5,16 2,18',
  '6,18 18,18 21,20 17,22 5,22 2,20',
];
const NUMERALS: Readonly<Record<string, string>> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};

/** Vector LCD segments stay inside their viewport even for a very large record. */
export const Digits = memo(function Digits({ value, minimum = 4 }: { value: number; minimum?: number }) {
  const text = String(value).padStart(minimum, '0');
  return (
    <svg
      viewBox={`0 0 ${text.length * 27} 40`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from(text, (digit, index) => (
        <g key={index} transform={`translate(${index * 27 + 1} 0)`}>
          {SEGMENTS.map((points, segment) => (
            <polygon
              key={segment}
              points={points}
              fill="currentColor"
              opacity={NUMERALS[digit]?.includes('abcdefg'.charAt(segment)) ? 0.95 : 0.075}
            />
          ))}
        </g>
      ))}
    </svg>
  );
});
