import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import siteData from '@/content/site.json';

import styles from './page.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: {
      absolute: `${dict.eventInquiry.thanksTitle} · ${dict.meta.siteName}`,
    },
    description: dict.eventInquiry.thanksBody,
    robots: { index: false, follow: true },
  };
}

export default async function GraciasEventoPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const waHref = `https://wa.me/${siteData.whatsappNumber.replace(/[^0-9]/g, '')}`;

  return (
    <section className={styles.page}>
      <div className="container">
        <Reveal>
          <SectionLabel>{dict.eventInquiry.label}</SectionLabel>
          <h1 className={styles.title}>{dict.eventInquiry.thanksTitle}</h1>
          <p className={styles.body}>{dict.eventInquiry.thanksBody}</p>
          <div className={styles.actions}>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              {dict.eventInquiry.thanksWhatsAppCta}
            </a>
            <Link
              href={`/${locale}`}
              className="btn btn-ghost"
            >
              {dict.eventInquiry.thanksHomeCta}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
