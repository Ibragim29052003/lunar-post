import type { ReactElement } from 'react';

type IconName = 'orbit' | 'sound' | 'muted' | 'pause' | 'play' | 'arrow' | 'close' | 'parcel';

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactElement> = {
    orbit: (
      <>
        <circle cx="12" cy="12" r="7" />
        <ellipse cx="12" cy="12" rx="12" ry="4" transform="rotate(-35 12 12)" />
        <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
      </>
    ),
    sound: (
      <>
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path d="M17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" />
      </>
    ),
    muted: (
      <>
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path d="m17 9 5 6m0-6-5 6" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="4" />
      </>
    ),
    play: <path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    parcel: (
      <>
        <path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5l9 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
