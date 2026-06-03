import 'server-only';

import esDict from './es.json';
import enDict from './en.json';

const dictionaries = {
  es: () => Promise.resolve(esDict),
  en: () => Promise.resolve(enDict),
} as const;

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof esDict;

export const locales: Locale[] = ['es', 'en'];
export const defaultLocale: Locale = 'es';

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
