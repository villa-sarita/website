import type { Metadata } from 'next';
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
    title: { absolute: dict.meta.ubicacion.title },
    description: dict.meta.ubicacion.description,
    alternates: {
      canonical: `/${locale}/ubicacion`,
      languages: {
        es: '/es/ubicacion',
        en: '/en/ubicacion',
        'x-default': '/es/ubicacion',
      },
    },
    openGraph: {
      title: dict.meta.ubicacion.title,
      description: dict.meta.ubicacion.description,
      url: `/${locale}/ubicacion`,
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
      title: dict.meta.ubicacion.title,
      description: dict.meta.ubicacion.description,
      images: ['/logo/villa-sarita-profile-square.png'],
    },
  };
}

export default async function UbicacionPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <Reveal>
            <SectionLabel>{dict.location.label}</SectionLabel>
            <h1 className={styles.title}>{dict.location.title}</h1>
            <p className={styles.blurb}>{dict.location.blurb}</p>
          </Reveal>
        </div>
      </section>

      <section className={styles.mapSection}>
        <div className="container">
          <Reveal>
            <div className={styles.mapFrame}>
              <iframe
                title="Villa Sarita · Tumaco"
                src={siteData.location.googleMapsEmbedSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>

          <div className={styles.details}>
            <Reveal delay={0.1}>
              <div className={styles.detail}>
                <span className={styles.detailLabel}>{dict.location.addressLabel}</span>
                <p>
                  {siteData.location.city}, {siteData.location.region},{' '}
                  {siteData.location.country}
                </p>
                <span className={styles.detailHelp}>{dict.location.addressHelp}</span>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className={styles.detail}>
                <span className={styles.detailLabel}>{dict.location.howLabel}</span>
                <p>{dict.location.blurb}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
