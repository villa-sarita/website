import experienciasData from '@/content/experiencias.json';
import siteData from '@/content/site.json';
import type { Cabana } from '@/lib/cabanas';
import { cabanas } from '@/lib/cabanas';

const BASE = siteData.canonicalUrl.replace(/\/$/, '');

type JsonLdValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function JsonLdScript({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function postalAddress() {
  return {
    '@type': 'PostalAddress',
    streetAddress: siteData.location.street,
    addressLocality: siteData.location.city,
    addressRegion: siteData.location.region,
    addressCountry: 'CO',
  };
}

function contactPoint() {
  return {
    '@type': 'ContactPoint',
    telephone: siteData.phone,
    contactType: 'reservations',
    areaServed: ['CO', 'US'],
    availableLanguage: ['Spanish', 'English'],
  };
}

function sameAs(): string[] {
  return [
    siteData.social?.instagramUrl,
    siteData.social?.facebookUrl,
    siteData.social?.tiktokUrl,
    siteData.location?.googleMapsUrl,
  ].filter((u): u is string => typeof u === 'string' && u.length > 0);
}

/** JSON-LD for the home page: LodgingBusiness (which extends LocalBusiness). */
export function LodgingBusinessJsonLd({ locale }: { locale: 'es' | 'en' }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${BASE}/#lodging`,
    name: 'Cabañas Villa Sarita',
    alternateName: siteData.brand,
    description:
      locale === 'es'
        ? 'Ecolodge premium con cinco cabañas en Tumaco, Pacífico colombiano. Reservas directas.'
        : 'Premium ecolodge with five cabins in Tumaco on the Colombian Pacific. Direct bookings.',
    url: `${BASE}/${locale}`,
    telephone: siteData.phone,
    email: siteData.hostEmail,
    image: [`${BASE}/logo/villa-sarita-profile-square.png`],
    logo: `${BASE}/logo/villa-sarita-green-t.png`,
    address: postalAddress(),
    geo: { '@type': 'GeoCoordinates', addressCountry: 'CO' },
    contactPoint: contactPoint(),
    priceRange: 'COP $$',
    currenciesAccepted: siteData.currency,
    paymentAccepted: 'Cash, Bank transfer, Nequi, Wompi',
    checkinTime: siteData.checkIn,
    checkoutTime: siteData.checkOut,
    numberOfRooms: cabanas.length,
    petsAllowed: false,
    smokingAllowed: false,
    sameAs: sameAs(),
    hasMap: siteData.location.googleMapsUrl,
    makesOffer: cabanas.map((c) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Accommodation',
        name: c.name,
        url: `${BASE}/${locale}/cabanas/${c.slug}`,
      },
      priceCurrency: siteData.currency,
      price: c.nightlyRateCop,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: c.nightlyRateCop,
        priceCurrency: siteData.currency,
        unitText: 'NIGHT',
      },
    })),
  };
  return <JsonLdScript data={data} />;
}

/** JSON-LD for an individual cabin detail page: Accommodation. */
export function AccommodationJsonLd({
  cabana,
  locale,
}: {
  cabana: Cabana;
  locale: 'es' | 'en';
}) {
  const name = locale === 'en' ? cabana.nameEn : cabana.name;
  const description = locale === 'en' ? cabana.descriptionEn : cabana.description;
  const url = `${BASE}/${locale}/cabanas/${cabana.slug}`;
  const images = (cabana.photos?.length ? cabana.photos : [cabana.coverPhoto])
    .filter(Boolean)
    .map((p) => (p.startsWith('http') ? p : `${BASE}${p.startsWith('/') ? '' : '/'}${p}`));

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    '@id': `${url}#accommodation`,
    name,
    description,
    url,
    image: images,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: cabana.capacity,
      unitCode: 'C62',
    },
    numberOfRooms: 1,
    amenityFeature: cabana.amenities?.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    })),
    petsAllowed: false,
    smokingAllowed: false,
    address: postalAddress(),
    containedInPlace: {
      '@type': 'LodgingBusiness',
      '@id': `${BASE}/#lodging`,
      name: 'Cabañas Villa Sarita',
    },
    offers: {
      '@type': 'Offer',
      price: cabana.nightlyRateCop,
      priceCurrency: siteData.currency,
      availability: 'https://schema.org/InStock',
      url,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: cabana.nightlyRateCop,
        priceCurrency: siteData.currency,
        unitText: 'NIGHT',
      },
    },
  };
  return <JsonLdScript data={data} />;
}

/** JSON-LD breadcrumb helper for any nested page. */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE}${item.url}`,
    })),
  };
  return <JsonLdScript data={data} />;
}

/** Lightweight Organization tag (paired with LodgingBusiness on home). */
export function OrganizationJsonLd() {
  void experienciasData; // referenced for future use (event listings)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE}/#org`,
    name: 'Villa Sarita',
    legalName: 'Cabañas Villa Sarita',
    url: BASE,
    logo: `${BASE}/logo/villa-sarita-green-t.png`,
    sameAs: sameAs(),
    contactPoint: contactPoint(),
    address: postalAddress(),
  };
  return <JsonLdScript data={data} />;
}
