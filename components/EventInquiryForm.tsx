'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import styles from './EventInquiryForm.module.css';

export interface EventTypeOption {
  slug: string; // matches the Experiencia slug
  label: string; // localised name
}

interface EventInquiryFormProps {
  /** Experience types to populate the dropdown — pulled from content/experiencias.json. */
  eventTypes: EventTypeOption[];
  /** When user landed via /reservar/evento?tipo=… we pre-select it. */
  preselectedType?: string;
  locale: 'es' | 'en';
  labels: {
    eventType: string;
    eventTypeOther: string;
    eventTypeOtherPlaceholder: string;
    eventDate: string;
    eventTime: string;
    eventTimePlaceholder: string;
    guests: string;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    emailOptional: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
    errorGeneric: string;
    errorPast: string;
    successRedirect: string;
  };
}

const OTHER_KEY = 'otro';

export function EventInquiryForm({
  eventTypes,
  preselectedType,
  locale,
  labels,
}: EventInquiryFormProps) {
  const router = useRouter();
  const initialType =
    preselectedType && eventTypes.some((t) => t.slug === preselectedType)
      ? preselectedType
      : eventTypes[0]?.slug ?? OTHER_KEY;

  const [eventType, setEventType] = useState(initialType);
  const [eventTypeOther, setEventTypeOther] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [guests, setGuests] = useState(20);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the URL changes (rare), keep preselection in sync.
  useEffect(() => {
    if (preselectedType && eventTypes.some((t) => t.slug === preselectedType)) {
      setEventType(preselectedType);
    }
  }, [preselectedType, eventTypes]);

  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (eventDate < today) {
      setError(labels.errorPast);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/event-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventTypeOther:
            eventType === OTHER_KEY ? eventTypeOther.trim() : undefined,
          eventDate,
          eventTime: eventTime.trim() || undefined,
          guests,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || undefined,
          message: message.trim() || undefined,
          locale,
          website,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? labels.errorGeneric);
        setSubmitting(false);
        return;
      }
      // Success → land on the thank-you page.
      router.push(`/${locale}/reservar/evento/gracias`);
    } catch (err) {
      console.error(err);
      setError(labels.errorGeneric);
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {/* Honeypot — bots fill it, humans don't see it. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className={styles.honeypot}
      />

      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.wide}`}>
          <span>{labels.eventType}</span>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            required
          >
            {eventTypes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
            <option value={OTHER_KEY}>
              {locale === 'en' ? 'Other' : 'Otro'}
            </option>
          </select>
        </label>

        {eventType === OTHER_KEY && (
          <label className={`${styles.field} ${styles.wide}`}>
            <span>{labels.eventTypeOther}</span>
            <input
              type="text"
              value={eventTypeOther}
              onChange={(e) => setEventTypeOther(e.target.value)}
              placeholder={labels.eventTypeOtherPlaceholder}
              required
            />
          </label>
        )}

        <label className={styles.field}>
          <span>{labels.eventDate}</span>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={today}
            required
          />
        </label>

        <label className={styles.field}>
          <span>{labels.eventTime}</span>
          <input
            type="text"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            placeholder={labels.eventTimePlaceholder}
          />
        </label>

        <label className={styles.field}>
          <span>{labels.guests}</span>
          <input
            type="number"
            min={1}
            max={500}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          />
        </label>

        <label className={`${styles.field} ${styles.wide}`}>
          <span>{labels.guestName}</span>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>{labels.guestPhone}</span>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+57 …"
            required
          />
        </label>

        <label className={styles.field}>
          <span>
            {labels.guestEmail}{' '}
            <em className={styles.optional}>({labels.emailOptional})</em>
          </span>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
        </label>

        <label className={`${styles.field} ${styles.wide}`}>
          <span>{labels.message}</span>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.messagePlaceholder}
          />
        </label>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className={`btn btn-primary ${styles.submit}`}
      >
        {submitting ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
