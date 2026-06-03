import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CabanaCard } from '@/components/CabanaCard';
import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import { groupByType } from '@/lib/cabanas';

import styles from './page.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: { absolute: dict.meta.cabanas.title },
    description: dict.meta.cabanas.description,
    alternates: {
      canonical: `/${locale}/cabanas`,
      languages: {
        es: '/es/cabanas',
        en: '/en/cabanas',
        'x-default': '/es/cabanas',
      },
    },
    openGraph: {
      title: dict.meta.cabanas.title,
      description: dict.meta.cabanas.description,
      url: `/${locale}/cabanas`,
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
      title: dict.meta.cabanas.title,
      description: dict.meta.cabanas.description,
      images: ['/logo/villa-sarita-profile-square.png'],
    },
  };
}

export default async function CabanasIndex({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const groups = groupByType();

  const sections: { key: 'couple' | 'family' | 'group'; label: string }[] = [
    { key: 'couple', label: dict.cabanas.capacityCouple },
    { key: 'family', label: dict.cabanas.capacityFamily },
    { key: 'group', label: dict.cabanas.capacityGroup },
  ];

  return (
    <>
      <section className={styles.intro}>
        <div className="container">
          <Reveal>
            <SectionLabel>{dict.cabanas.indexLabel}</SectionLabel>
            <h1 className={styles.title}>{dict.cabanas.indexTitle}</h1>
            <p className={styles.blurb}>{dict.cabanas.indexBlurb}</p>
          </Reveal>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.key} className={styles.group}>
          <div className="container">
            <Reveal>
              <div className={styles.groupHead}>
                <span className={styles.groupCount}>{groups[section.key].length}</span>
                <h2 className={styles.groupTitle}>
                  <span className={styles.groupCapacity}>{section.label}</span>
                </h2>
              </div>
            </Reveal>
            <div className={styles.grid}>
              {groups[section.key].map((cabana, i) => (
                <Reveal key={cabana.slug} delay={i * 0.07}>
                  <CabanaCard cabana={cabana} locale={locale} dict={dict} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
