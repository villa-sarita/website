import Link from 'next/link';

import type { Dictionary, Locale } from '@/i18n/dictionaries';
import type { Cabana } from '@/lib/cabanas';
import { getCabanaName, getCabanaTagline } from '@/lib/cabanas';
import { formatCurrency } from '@/lib/price';

import styles from './CabanaCard.module.css';

interface CabanaCardProps {
  cabana: Cabana;
  locale: Locale;
  dict: Dictionary;
}

export function CabanaCard({ cabana, locale, dict }: CabanaCardProps) {
  const name = getCabanaName(cabana, locale);
  const tagline = getCabanaTagline(cabana, locale);
  const capacityLabel =
    cabana.type === 'couple'
      ? dict.cabanas.capacityCouple
      : cabana.type === 'family'
        ? dict.cabanas.capacityFamily
        : dict.cabanas.capacityGroup;

  return (
    <article className={styles.card} data-type={cabana.type}>
      <Link
        href={`/${locale}/cabanas/${cabana.slug}`}
        className={styles.media}
        aria-label={name}
      >
        <span
          className={styles.mediaImage}
          style={{ backgroundImage: `url(${cabana.coverPhoto})` }}
          aria-hidden="true"
        />
      </Link>
      <div className={styles.body}>
        <span className={styles.capacity}>{capacityLabel}</span>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.tagline}>{tagline}</p>
        <div className={styles.row}>
          <span className={styles.price}>
            <span className={styles.priceFrom}>{dict.cabanas.fromPerNight}</span>{' '}
            <strong>{formatCurrency(cabana.nightlyRateCop, locale)}</strong>
            <span className={styles.priceUnit}> / {dict.cabanas.perNight}</span>
          </span>
          <Link href={`/${locale}/cabanas/${cabana.slug}`} className={styles.cta}>
            {dict.cabanas.viewCabin} →
          </Link>
        </div>
      </div>
    </article>
  );
}
