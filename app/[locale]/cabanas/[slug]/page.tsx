import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AmenityIcon } from '@/components/AmenityIcon';
import { BookingWidget } from '@/components/BookingWidget';
import { Gallery } from '@/components/Gallery';
import { AccommodationJsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import {
  cabanas,
  getCabana,
  getCabanaBeds,
  getCabanaDescription,
  getCabanaName,
  getCabanaTagline,
} from '@/lib/cabanas';

import styles from './page.module.css';

export async function generateStaticParams() {
  return cabanas.flatMap((c) =>
    ['es', 'en'].map((locale) => ({ locale, slug: c.slug })),
  );
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const cabana = getCabana(slug);
  if (!cabana) return {};
  const dict = await getDictionary(locale);
  const name = getCabanaName(cabana, locale);
  const tagline = getCabanaTagline(cabana, locale);
  const title = `${name} · ${dict.meta.siteName} Tumaco`;
  const description = dict.meta.cabanaDetailDescription.replace('{tagline}', tagline);
  const path = `/${locale}/cabanas/${slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      languages: {
        es: `/es/cabanas/${slug}`,
        en: `/en/cabanas/${slug}`,
        'x-default': `/es/cabanas/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      images: cabana.coverPhoto
        ? [{ url: cabana.coverPhoto, alt: `${name} — ${tagline}` }]
        : [
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
      title,
      description,
      images: cabana.coverPhoto
        ? [cabana.coverPhoto]
        : ['/logo/villa-sarita-profile-square.png'],
    },
  };
}

export default async function CabanaDetail({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const cabana = getCabana(slug);
  if (!cabana) notFound();
  const dict = await getDictionary(locale);

  const name = getCabanaName(cabana, locale);
  const tagline = getCabanaTagline(cabana, locale);
  const description = getCabanaDescription(cabana, locale);
  const beds = getCabanaBeds(cabana, locale);

  const capacityLabel =
    cabana.type === 'couple'
      ? dict.cabanas.capacityCouple
      : cabana.type === 'family'
        ? dict.cabanas.capacityFamily
        : dict.cabanas.capacityGroup;

  return (
    <>
      <AccommodationJsonLd cabana={cabana} locale={locale as 'es' | 'en'} />
      <section className={styles.head}>
        <div className="container">
          <Reveal>
            <span className={styles.kicker}>{capacityLabel}</span>
            <h1 className={styles.title}>{name}</h1>
            <p className={styles.tagline}>{tagline}</p>
            <p className={styles.beds}>{beds}</p>
          </Reveal>
        </div>
      </section>

      <section className={styles.galleryBlock}>
        <div className="container">
          <Reveal>
            <Gallery cabana={cabana} />
          </Reveal>
        </div>
      </section>

      <section className={styles.body}>
        <div className={`container ${styles.layout}`}>
          <div className={styles.copy}>
            <Reveal>
              <SectionLabel>{locale === 'es' ? 'la cabaña' : 'the cabin'}</SectionLabel>
              <p className={styles.description}>{description}</p>
            </Reveal>

            <Reveal delay={0.1}>
              <h3 className={styles.amenitiesTitle}>{dict.cabanas.amenitiesLabel}</h3>
              <ul className={styles.amenities}>
                {cabana.amenities.map((amenity) => (
                  <li key={amenity} className={styles.amenity}>
                    <AmenityIcon name={amenity} />
                    <span>{dict.amenities[amenity as keyof typeof dict.amenities] ?? amenity}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className={styles.widgetCol}>
            <BookingWidget cabana={cabana} locale={locale} dict={dict} />
          </div>
        </div>
      </section>
    </>
  );
}
