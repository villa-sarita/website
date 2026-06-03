import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookingForm } from '@/components/BookingForm';
import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import { getCabana, getCabanaName } from '@/lib/cabanas';

import styles from './page.module.css';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; guests?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.meta.reservar.title,
    description: dict.meta.reservar.description,
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  };
}

function parseDate(input: string | undefined): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function ReservarPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const search = await searchParams;
  if (!hasLocale(locale)) notFound();
  const cabana = getCabana(slug);
  if (!cabana) notFound();
  const dict = await getDictionary(locale);

  const initialFrom = parseDate(search.from);
  const initialTo = parseDate(search.to);
  const initialGuests = search.guests ? Number.parseInt(search.guests, 10) : undefined;

  return (
    <section className={styles.page}>
      <div className="container">
        <Reveal>
          <SectionLabel>{getCabanaName(cabana, locale)}</SectionLabel>
          <h1 className={styles.title}>
            {locale === 'es' ? 'Reserva tu estadía' : 'Book your stay'}
          </h1>
        </Reveal>

        <div className={styles.formWrap}>
          <BookingForm
            cabana={cabana}
            locale={locale}
            dict={dict}
            initialFrom={initialFrom}
            initialTo={initialTo}
            initialGuests={initialGuests}
          />
        </div>
      </div>
    </section>
  );
}
