'use client';

import styles from './GuestCounter.module.css';

interface GuestCounterProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  label: string;
  addLabel: string;
  removeLabel: string;
  maxLabel: string;
}

export function GuestCounter({
  value,
  onChange,
  min = 1,
  max,
  label,
  addLabel,
  removeLabel,
  maxLabel,
}: GuestCounterProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const atMax = value >= max;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {atMax && <span className={styles.note}>{maxLabel}</span>}
      </div>
      <div className={styles.row}>
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={removeLabel}
          className={styles.btn}
        >
          −
        </button>
        <span className={styles.value}>{value}</span>
        <button
          type="button"
          onClick={inc}
          disabled={atMax}
          aria-label={addLabel}
          className={styles.btn}
        >
          +
        </button>
      </div>
    </div>
  );
}
