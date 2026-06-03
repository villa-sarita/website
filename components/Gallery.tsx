'use client';

import { useState } from 'react';

import type { Cabana } from '@/lib/cabanas';

import { LightboxOverlay } from './LightboxOverlay';
import styles from './Gallery.module.css';

interface GalleryProps {
  cabana: Cabana;
}

export function Gallery({ cabana }: GalleryProps) {
  const photos = cabana.photos.slice(0, 5);
  const count = photos.length;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (count === 0) return null;

  return (
    <>
      <div className={styles.grid} data-type={cabana.type} data-count={count}>
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.tile} ${styles[`tile${i + 1}`]}`}
            onClick={() => setOpenIndex(i)}
            aria-label={`Ver foto ${i + 1} de ${cabana.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${cabana.name} — foto ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <LightboxOverlay
          photos={photos}
          altPrefix={cabana.name}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChange={setOpenIndex}
        />
      )}
    </>
  );
}
