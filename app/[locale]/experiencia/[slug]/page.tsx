import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PhotoGrid } from '@/components/PhotoGrid';
import { Reveal } from '@/components/Reveal';
import { SectionLabel } from '@/components/SectionLabel';
import { getDictionary, hasLocale } from '@/i18n/dictionaries';
import {
  experiencias,
  getExperiencia,
  getExperienciaDescription,
  getExperienciaName,
  getExperienciaTagline,
} from '@/lib/experiencias';

import styles from './page.module.css';

export async function generateStaticParams() {
  return experiencias.flatMap((e) =>
    ['es', 'en'].map((locale) => ({ locale, slug: e.slug })),
  );
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const exp = getExperiencia(slug);
  if (!exp) return {};
  const dict = await getDictionary(locale);
  const typedLocale = locale as 'es' | 'en';
  const name = getExperienciaName(exp, typedLocale);
  const tagline = getExperienciaTagline(exp, typedLocale);
  const title = `${name} · ${dict.meta.siteName} Tumaco`;
  const description = dict.meta.experienciaDetailDescription.replace('{tagline}', tagline);
  const path = `/${locale}/experiencia/${slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      languages: {
        es: `/es/experiencia/${slug}`,
        en: `/en/experiencia/${slug}`,
        'x-default': `/es/experiencia/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      images: exp.coverPhoto
        ? [{ url: exp.coverPhoto, alt: `${name} — ${tagline}` }]
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
      images: exp.coverPhoto
        ? [exp.coverPhoto]
        : ['/logo/villa-sarita-profile-square.png'],
    },
  };
}

export default async function ExperienciaDetail({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const exp = getExperiencia(slug);
  if (!exp) notFound();
  const dict = await getDictionary(locale);
  const typedLocale = locale as 'es' | 'en';

  const name = getExperienciaName(exp, typedLocale);
  const tagline = getExperienciaTagline(exp, typedLocale);
  const description = getExperienciaDescription(exp, typedLocale);

  return (
    <>
      <section className={styles.head}>
        <div className="container">
          <Reveal>
            <Link href={`/${locale}/experiencia`} className={styles.back}>
              ← {dict.experience.backToAll}
            </Link>
            <SectionLabel>{dict.experience.detailLabel}</SectionLabel>
            <h1 className={styles.title}>{name}</h1>
            <p className={styles.tagline}>{tagline}</p>
            <p className={styles.description}>{description}</p>
            <div className={styles.ctas}>
              <Link href={`/${locale}/cabanas`} className="btn btn-primary">
                {dict.experience.detailCtaBook}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={styles.galleryBlock}>
        <div className="container">
          <Reveal>
            <PhotoGrid photos={exp.photos} altPrefix={name} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
