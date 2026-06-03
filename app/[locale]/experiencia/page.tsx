import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import {
  experiencias,
  getExperienciaName,
  getExperienciaTagline,
} from '@/lib/experiencias';

import styles from './page.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: { absolute: dict.meta.experiencia.title },
    description: dict.meta.experiencia.description,
    alternates: {
      canonical: `/${locale}/experiencia`,
      languages: {
        es: '/es/experiencia',
        en: '/en/experiencia',
        'x-default': '/es/experiencia',
      },
    },
    openGraph: {
      title: dict.meta.experiencia.title,
      description: dict.meta.experiencia.description,
      url: `/${locale}/experiencia`,
      type: 'website',
      images: [
        {
          url: '/logo/villa-sarita-profile-square.png',
          width: 1024,
          height: 1024,
          alt: dict.meta.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.experiencia.title,
      description: dict.meta.experiencia.description,
      images: ['/logo/villa-sarita-profile-square.png'],
    },
  };
}

export default async function ExperienciasPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const typedLocale = locale as 'es' | 'en';

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <Reveal>
            <SectionLabel>{dict.experience.label}</SectionLabel>
            <h1 className={styles.title}>{dict.experience.title}</h1>
            <p className={styles.blurb}>{dict.experience.blurb}</p>
          </Reveal>
        </div>
      </section>

      <section className={styles.gridSection}>
        <div className="container">
          <div className={styles.grid}>
            {experiencias.map((exp, i) => (
              <Reveal key={exp.slug} delay={i * 0.08}>
                <Link
                  href={`/${locale}/experiencia/${exp.slug}`}
                  className={styles.card}
                  data-slug={exp.slug}
                  aria-label={getExperienciaName(exp, typedLocale)}
                >
                  <span
                    className={styles.cardImage}
                    style={{ backgroundImage: `url(${exp.coverPhoto})` }}
                    aria-hidden="true"
                  />
                  <span className={styles.cardOverlay} aria-hidden="true" />
                  <span className={styles.cardContent}>
                    <span className={styles.cardLabel}>
                      {dict.experience.cardLabel}
                    </span>
                    <span className={styles.cardName}>
                      {getExperienciaName(exp, typedLocale)}
                    </span>
                    <span className={styles.cardTagline}>
                      {getExperienciaTagline(exp, typedLocale)}
                    </span>
                    <span className={styles.cardCta}>
                      {dict.experience.cardCta} →
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
