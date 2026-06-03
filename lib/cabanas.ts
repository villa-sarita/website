import cabanasData from '@/content/cabanas.json';

export type CabanaType = 'couple' | 'family' | 'group';

export interface Cabana {
  slug: string;
  type: CabanaType;
  name: string;
  nameEn: string;
  capacity: number;
  beds: string;
  bedsEn: string;
  nightlyRateCop: number;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  amenities: string[];
  photos: string[];
  coverPhoto: string;
}

export const cabanas = cabanasData as Cabana[];

export function getCabana(slug: string): Cabana | undefined {
  return cabanas.find((c) => c.slug === slug);
}

export function getCabanaName(c: Cabana, locale: 'es' | 'en'): string {
  return locale === 'en' ? c.nameEn : c.name;
}

export function getCabanaTagline(c: Cabana, locale: 'es' | 'en'): string {
  return locale === 'en' ? c.taglineEn : c.tagline;
}

export function getCabanaDescription(c: Cabana, locale: 'es' | 'en'): string {
  return locale === 'en' ? c.descriptionEn : c.description;
}

export function getCabanaBeds(c: Cabana, locale: 'es' | 'en'): string {
  return locale === 'en' ? c.bedsEn : c.beds;
}

export function groupByType(list: Cabana[] = cabanas) {
  return {
    couple: list.filter((c) => c.type === 'couple'),
    family: list.filter((c) => c.type === 'family'),
    group: list.filter((c) => c.type === 'group'),
  };
}

export function minRate(): number {
  return Math.min(...cabanas.map((c) => c.nightlyRateCop));
}
