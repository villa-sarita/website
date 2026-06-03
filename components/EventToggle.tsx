'use client';

import type { Dictionary } from '@/i18n/dictionaries';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import siteData from '@/content/site.json';

import styles from './EventToggle.module.css';

interface EventToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  dict: Dictionary;
}

export function EventToggle({ enabled, onToggle, dict }: EventToggleProps) {
  const whatsappHref = buildWhatsAppLink(
    siteData.whatsappNumber,
    dict.booking.eventWhatsappMessage,
  );

  return (
    <div className={styles.wrap}>
      <fieldset className={styles.choices}>
        <legend className="sr-only">{dict.booking.stepEvent}</legend>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`${styles.choice} ${enabled ? styles.active : ''}`}
          aria-pressed={enabled}
        >
          <span className={styles.choiceDot} />
          {dict.booking.eventOn}
        </button>
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`${styles.choice} ${!enabled ? styles.active : ''}`}
          aria-pressed={!enabled}
        >
          <span className={styles.choiceDot} />
          {dict.booking.eventOff}
        </button>
      </fieldset>

      {enabled && (
        <div className={styles.whatsappBlock}>
          <p className={styles.whatsappHelp}>{dict.booking.eventWhatsappHelp}</p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappCta}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.92 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.69 14.07c-.24.68-1.42 1.31-1.95 1.39-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.6-2.91-1.26-4.81-4.19-4.96-4.38-.14-.2-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.14.07.14.12.31.02.5-.1.2-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.13.57.17.29.74 1.22 1.59 1.97 1.09.97 2 1.27 2.29 1.42.29.14.46.12.62-.07.17-.2.71-.83.9-1.11.19-.29.39-.24.65-.14.27.1 1.69.8 1.98.94.29.14.48.21.55.33.07.12.07.71-.17 1.39z"/>
            </svg>
            {dict.booking.eventWhatsappCta}
          </a>
        </div>
      )}
    </div>
  );
}
