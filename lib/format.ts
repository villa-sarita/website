import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

/**
 * Booking dates are calendar days, not absolute moments. Always format them
 * using their local components so a picked "Jun 17" never drifts to "Jun 16"
 * just because the user's browser is in a different timezone.
 */
function asLocalDate(date: Date | string): Date {
  if (typeof date === 'string') {
    // Accept 'yyyy-MM-dd' or full ISO. Parse the date portion as local-noon
    // to avoid any DST/midnight edge cases.
    const [datePart] = date.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  }
  return date;
}

export function formatDate(date: Date | string, locale: 'es' | 'en' = 'es'): string {
  const d = asLocalDate(date);
  const dateFnsLocale = locale === 'en' ? enUS : es;
  const pattern = locale === 'en' ? 'MMM d, yyyy' : "d 'de' MMMM, yyyy";
  return format(d, pattern, { locale: dateFnsLocale });
}

export function formatDateShort(date: Date | string, locale: 'es' | 'en' = 'es'): string {
  const d = asLocalDate(date);
  const dateFnsLocale = locale === 'en' ? enUS : es;
  return format(d, 'd MMM', { locale: dateFnsLocale });
}

export function diffInNights(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Format a "HH:mm" string (e.g. "15:00") as "3 PM" / "3:30 PM".
 *  Locale-aware: Spanish gets lowercase "p. m." per RAE; English gets "PM". */
export function formatTime12h(hhmm: string, locale: 'es' | 'en' = 'es'): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? '0');
  if (!Number.isFinite(h)) return hhmm;
  const hour12 = ((h + 11) % 12) + 1;
  const isPm = h >= 12;
  const suffix = locale === 'en' ? (isPm ? 'PM' : 'AM') : isPm ? 'p. m.' : 'a. m.';
  const time = m === 0 ? `${hour12}` : `${hour12}:${m.toString().padStart(2, '0')}`;
  return `${time} ${suffix}`;
}
