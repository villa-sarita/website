import type { Metadata } from 'next';
import { Caveat, Nunito, Pacifico } from 'next/font/google';
import { notFound } from 'next/navigation';

import '../globals.css';

import { Footer } from '@/components/Footer';
import { Nav } from '@/components/Nav';
import { WhatsAppFloating } from '@/components/WhatsAppFloating';
import { getDictionary, hasLocale, locales } from '@/i18n/dictionaries';
import siteData from '@/content/site.json';

const pacifico = Pacifico({
  variable: '--font-pacifico',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
});

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LocaleParams = { params: Promise<{ locale: string }> };

const OG_IMAGE = {
  url: '/logo/villa-sarita-profile-square.png',
  width: 1024,
  height: 1024,
} as const;

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const base = siteData.canonicalUrl.replace(/\/$/, '');
  return {
    title: dict.meta.siteTitle,
    description: dict.meta.siteDescription,
    metadataBase: new URL(base),
    applicationName: dict.meta.siteName,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        es: '/es',
        en: '/en',
        'x-default': '/es',
      },
    },
    openGraph: {
      siteName: dict.meta.siteName,
      title: dict.meta.siteTitle,
      description: dict.meta.siteDescription,
      url: `${base}/${locale}`,
      locale: locale === 'es' ? 'es_CO' : 'en_US',
      alternateLocale: locale === 'es' ? ['en_US'] : ['es_CO'],
      type: 'website',
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: dict.meta.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.siteTitle,
      description: dict.meta.siteDescription,
      images: [OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    formatDetection: {
      telephone: true,
      email: true,
      address: true,
    },
    other: {
      'geo.region': 'CO-NAR',
      'geo.placename': `${siteData.location.city}, ${siteData.location.region}, ${siteData.location.country}`,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale === 'es' ? 'es-CO' : 'en-US'}
      className={`${pacifico.variable} ${nunito.variable} ${caveat.variable}`}
    >
      <body>
        <Nav locale={locale} dict={dict} />
        <main>{children}</main>
        <Footer locale={locale} dict={dict} />
        <WhatsAppFloating
          phone={siteData.whatsappNumber}
          label={dict.whatsapp.floatingLabel}
          message={dict.whatsapp.defaultMessage}
        />
      </body>
    </html>
  );
}
