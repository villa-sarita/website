import type { JSX } from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const icons: Record<string, JSX.Element> = {
  pool: (
    <>
      <path {...stroke} d="M3 14c2 0 2-1.5 4-1.5S9 14 11 14s2-1.5 4-1.5S17 14 19 14M3 18c2 0 2-1.5 4-1.5S9 18 11 18s2-1.5 4-1.5S17 18 19 18" />
      <path {...stroke} d="M6 14V7a2 2 0 1 1 4 0M12 14V7a2 2 0 1 1 4 0" />
    </>
  ),
  outdoorShower: (
    <>
      <path {...stroke} d="M11 4v6M8 10h6" />
      <path {...stroke} d="M9 12v2M11 13v3M13 12v2M10 16v2M12 17v2" />
    </>
  ),
  porch: (
    <>
      <path {...stroke} d="M3 11l8-6 8 6" />
      <path {...stroke} d="M5 10v8h12v-8" />
      <path {...stroke} d="M9 18v-4h4v4" />
    </>
  ),
  beachWalk: (
    <>
      <circle {...stroke} cx="16" cy="6" r="2" />
      <path {...stroke} d="M5 18c2 0 2-1.5 4-1.5S11 18 13 18s2-1.5 4-1.5S19 18 21 18" />
      <path {...stroke} d="M14 8l-3 4-3-2" />
    </>
  ),
  fan: (
    <>
      <circle {...stroke} cx="11" cy="11" r="2" />
      <path {...stroke} d="M11 9V4a4 4 0 0 1 0 5zM13 11h5a4 4 0 0 1-5 0zM11 13v5a4 4 0 0 1 0-5zM9 11H4a4 4 0 0 1 5 0z" />
    </>
  ),
  ac: (
    <>
      <rect {...stroke} x="3" y="5" width="16" height="6" rx="1" />
      <path {...stroke} d="M6 13v2M9 13v3M12 13v2M15 13v3M18 13v2" />
    </>
  ),
  privateBath: (
    <>
      <path {...stroke} d="M3 13h16M5 13v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" />
      <path {...stroke} d="M7 13V6a2 2 0 0 1 4 0" />
      <circle {...stroke} cx="11" cy="6" r="1" />
    </>
  ),
  kitchen: (
    <>
      <rect {...stroke} x="3" y="4" width="16" height="14" rx="1" />
      <path {...stroke} d="M3 9h16M7 13h2M13 13h2" />
    </>
  ),
  hammock: (
    <>
      <path {...stroke} d="M3 8c4 0 4 6 8 6s4-6 8-6" />
      <path {...stroke} d="M3 5v3M19 5v3" />
    </>
  ),
  wifi: (
    <>
      <path {...stroke} d="M3 9a13 13 0 0 1 16 0" />
      <path {...stroke} d="M6 12a8 8 0 0 1 10 0" />
      <path {...stroke} d="M9 15a3 3 0 0 1 4 0" />
      <circle cx="11" cy="18" r="1" fill="currentColor" />
    </>
  ),
  parking: (
    <>
      <rect {...stroke} x="4" y="4" width="14" height="14" rx="1.5" />
      <path {...stroke} d="M9 16V7h3a2.5 2.5 0 0 1 0 5H9" />
    </>
  ),
  animals: (
    <>
      <circle {...stroke} cx="11" cy="11" r="3" />
      <circle {...stroke} cx="6" cy="6" r="1.4" />
      <circle {...stroke} cx="16" cy="6" r="1.4" />
      <circle {...stroke} cx="5" cy="11" r="1.2" />
      <circle {...stroke} cx="17" cy="11" r="1.2" />
    </>
  ),
  fridge: (
    <>
      <rect {...stroke} x="6" y="3" width="10" height="16" rx="1.5" />
      <path {...stroke} d="M6 10h10" />
      <path {...stroke} d="M8 6v2M8 13v3" />
    </>
  ),
  bunkBed: (
    <>
      <path {...stroke} d="M3 4v14M19 4v14" />
      <path {...stroke} d="M3 9h16M3 16h16" />
      <path {...stroke} d="M3 12h4M3 19h4" />
    </>
  ),
};

interface AmenityIconProps {
  name: string;
  size?: number;
}

export function AmenityIcon({ name, size = 22 }: AmenityIconProps) {
  const icon = icons[name];
  if (!icon) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {icon}
    </svg>
  );
}
