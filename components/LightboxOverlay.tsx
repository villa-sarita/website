'use client';

import { useCallback, useEffect } from 'react';

import styles from './LightboxOverlay.module.css';

interface LightboxOverlayProps {
  photos: string[];
  altPrefix: string;
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}

export function LightboxOverlay({
  photos,
  altPrefix,
  index,
  onClose,
  onChange,
}: LightboxOverlayProps) {
  const count = photos.length;
  const next = useCallback(
    () => onChange((index + 1) % count),
    [index, count, onChange],
  );
  const prev = useCallback(
    () => onChange((index - 1 + count) % count),
    [index, count, onChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, next, prev]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={altPrefix}
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Anterior"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.next}`}
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Siguiente"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt={`${altPrefix} — foto ${index + 1}`}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />

      {count > 1 && (
        <span className={styles.counter} aria-live="polite">
          {index + 1} / {count}
        </span>
      )}
    </div>
  );
}
