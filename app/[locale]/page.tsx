import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CabanaCard } from '@/components/CabanaCard';
import { Hero } from '@/components/Hero';
import { LodgingBusinessJsonLd, OrganizationJsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import { cabanas } from '@/lib/cabanas';

import styles from './page.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const path = `/${locale}`;
  return {
    title: { absolute: dict.meta.home.title },
    description: dict.meta.home.description,
    alternates: {
      canonical: path,
      languages: {
        es: '/es',
        en: '/en',
        'x-default': '/es',
      },
    },
    openGraph: {
      title: dict.meta.home.title,
      description: dict.meta.home.description,
      url: path,
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
      title: dict.meta.home.title,
      description: dict.meta.home.description,
      images: ['/logo/villa-sarita-profile-square.png'],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const typedLocale = locale as 'es' | 'en';

  return (
    <>
      <LodgingBusinessJsonLd locale={typedLocale} />
      <OrganizationJsonLd />
      <Hero locale={locale} dict={dict} />

      {/* ---- Value props ---- */}
      <section className={styles.values}>
        <div className="container">
          <Reveal>
            <SectionLabel>{dict.home.valueLabel}</SectionLabel>
          </Reveal>
          <div className={styles.valueGrid}>
            <Reveal delay={0.05}>
              <article className={styles.valueCard}>
                <span className={styles.valueNum}>01</span>
                <h3>{dict.home.value1Title}</h3>
                <p>{dict.home.value1Body}</p>
              </article>
            </Reveal>
            <Reveal delay={0.15}>
              <article className={styles.valueCard}>
                <span className={styles.valueNum}>02</span>
                <h3>{dict.home.value2Title}</h3>
                <p>{dict.home.value2Body}</p>
              </article>
            </Reveal>
            <Reveal delay={0.25}>
              <article className={styles.valueCard}>
                <span className={styles.valueNum}>03</span>
                <h3>{dict.home.value3Title}</h3>
                <p>{dict.home.value3Body}</p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Cabañas overview ---- */}
      <section className={styles.cabanasSection}>
        <div className="container">
          <div className={styles.sectionHead}>
            <Reveal>
              <SectionLabel>{dict.home.cabanasLabel}</SectionLabel>
              <h2>{dict.home.cabanasTitle}</h2>
              <p className={styles.sectionLede}>{dict.home.cabanasBlurb}</p>
            </Reveal>
          </div>
          <div className={styles.cabanasGrid}>
            {cabanas.map((cabana, i) => (
              <Reveal key={cabana.slug} delay={i * 0.07}>
                <CabanaCard cabana={cabana} locale={locale} dict={dict} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Experience teaser ---- */}
      <section className={styles.experience}>
        <div className={`container ${styles.experienceInner}`}>
          <div className={styles.experienceText}>
            <Reveal>
              <SectionLabel>{dict.home.experienceLabel}</SectionLabel>
              <h2>{dict.home.experienceTitle}</h2>
              <p className={styles.lede}>{dict.home.experienceBlurb}</p>
              <Link href={`/${locale}/experiencia`} className="btn btn-jungle">
                {dict.home.experienceCta}
              </Link>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <div className={styles.experienceArt} aria-hidden="true">
              <div className={styles.expCircle1} />
              <div className={styles.expCircle2} />
              <div className={styles.expCircle3} />
              <span className={styles.expCaveat}>el porche · piscina · gallinas · mar</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Location teaser ---- */}
      <section className={styles.location}>
        <div className={`container ${styles.locationInner}`}>
          <Reveal>
            <SectionLabel>{dict.home.locationLabel}</SectionLabel>
            <h2>{dict.home.locationTitle}</h2>
            <p className={styles.lede}>{dict.home.locationBlurb}</p>
            <Link href={`/${locale}/ubicacion`} className="btn btn-ghost">
              {dict.home.locationCta} →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
