import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventInquiryForm } from '@/components/EventInquiryForm';
import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import { experiencias, getExperienciaName } from '@/lib/experiencias';
import siteData from '@/content/site.json';

import styles from './page.module.css';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const title =
    locale === 'en'
      ? 'Book an event'
      : 'Reservar un evento';
  return {
    title: { absolute: `${title} · ${dict.meta.siteName}` },
    description: dict.eventInquiry.subtitle,
    alternates: {
      canonical: `/${locale}/reservar/evento`,
      languages: {
        es: '/es/reservar/evento',
        en: '/en/reservar/evento',
        'x-default': '/es/reservar/evento',
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function ReservarEventoPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tipo } = await searchParams;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const typedLocale = locale as 'es' | 'en';

  const eventTypes = experiencias.map((e) => ({
    slug: e.slug,
    label: getExperienciaName(e, typedLocale),
  }));

  return (
    <section className={styles.page}>
      <div className="container">
        <Reveal>
          <SectionLabel>{dict.eventInquiry.label}</SectionLabel>
          <h1 className={styles.title}>{dict.eventInquiry.title}</h1>
          <p className={styles.subtitle}>{dict.eventInquiry.subtitle}</p>
          <p className={styles.helper}>{dict.eventInquiry.helper}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <EventInquiryForm
            eventTypes={eventTypes}
            preselectedType={tipo}
            locale={typedLocale}
            labels={{
              eventType: dict.eventInquiry.eventType,
              eventTypeOther: dict.eventInquiry.eventTypeOther,
              eventTypeOtherPlaceholder:
                dict.eventInquiry.eventTypeOtherPlaceholder,
              eventDate: dict.eventInquiry.eventDate,
              eventTime: dict.eventInquiry.eventTime,
              eventTimePlaceholder: dict.eventInquiry.eventTimePlaceholder,
              guests: dict.eventInquiry.guests,
              guestName: dict.eventInquiry.guestName,
              guestPhone: dict.eventInquiry.guestPhone,
              guestEmail: dict.eventInquiry.guestEmail,
              emailOptional: dict.booking.optional,
              message: dict.eventInquiry.message,
              messagePlaceholder: dict.eventInquiry.messagePlaceholder,
              submit: dict.eventInquiry.submit,
              submitting: dict.booking.processing,
              errorGeneric: dict.booking.errorGeneric,
              errorPast: dict.eventInquiry.errorPast,
              successRedirect: dict.eventInquiry.successRedirect,
            }}
          />
        </Reveal>

        <Reveal delay={0.2}>
          <p className={styles.whatsappAlt}>
            {dict.eventInquiry.orWhatsApp}{' '}
            <a
              href={`https://wa.me/${siteData.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
