import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ConfirmationView } from '@/components/ConfirmationView';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';

import styles from './page.module.css';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function ConfirmacionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { reference } = await searchParams;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <section className={styles.page}>
      <div className="container">
        <ConfirmationView
          locale={locale}
          dict={dict}
          reference={reference ?? '—'}
        />
      </div>
    </section>
  );
}
