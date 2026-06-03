'use client';

import { useState } from 'react';

import { LightboxOverlay } from './LightboxOverlay';
import styles from './PhotoGrid.module.css';

interface PhotoGridProps {
  photos: string[];
  altPrefix: string;
}

export function PhotoGrid({ photos, altPrefix }: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <div className={styles.grid}>
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            className={styles.tile}
            onClick={() => setOpenIndex(i)}
            aria-label={`Ver foto ${i + 1} de ${altPrefix}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${altPrefix} — ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <LightboxOverlay
          photos={photos}
          altPrefix={altPrefix}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChange={setOpenIndex}
        />
      )}
    </>
  );
}
