import experienciasData from '@/content/experiencias.json';

export interface Experiencia {
  slug: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  photos: string[];
  coverPhoto: string;
}

export const experiencias = experienciasData as Experiencia[];

export function getExperiencia(slug: string): Experiencia | undefined {
  return experiencias.find((e) => e.slug === slug);
}

export function getExperienciaName(e: Experiencia, locale: 'es' | 'en'): string {
  return locale === 'en' ? e.nameEn : e.name;
}

export function getExperienciaTagline(e: Experiencia, locale: 'es' | 'en'): string {
  return locale === 'en' ? e.taglineEn : e.tagline;
}

export function getExperienciaDescription(e: Experiencia, locale: 'es' | 'en'): string {
  return locale === 'en' ? e.descriptionEn : e.description;
}
