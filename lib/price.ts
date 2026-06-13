import siteData from '@/content/site.json';

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: siteData.currency,
  maximumFractionDigits: 0,
});

const COP_FORMATTER_EN = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: siteData.currency,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number, locale: 'es' | 'en' = 'es'): string {
  return (locale === 'en' ? COP_FORMATTER_EN : COP_FORMATTER).format(amount);
}

/** Per-night COP charge for each guest above the cabin's base capacity.
 *  Does NOT apply to Bijao (couple cabin) — see allowsExtraGuests(). */
export const EXTRA_PERSON_NIGHTLY_COP = 30_000;
/** Per-night COP charge for each animal a guest brings. Applies to all cabins. */
export const ANIMAL_NIGHTLY_COP = 20_000;

export interface PriceBreakdown {
  nights: number;
  nightlyRate: number;
  /** Base cabin cost (nightlyRate × nights). */
  base: number;
  /** Number of guests above cabin capacity that were charged. */
  extras: number;
  /** Money charged for those extra people, across all nights. */
  extrasCost: number;
  /** Number of animals that were charged. */
  animals: number;
  /** Money charged for animals, across all nights. */
  animalsCost: number;
  /** base + extrasCost + animalsCost. */
  subtotal: number;
  deposit: number;
  balance: number;
}

export function calculateBreakdown(
  nightlyRate: number,
  nights: number,
  options: {
    extras?: number;
    animals?: number;
    depositPercent?: number;
  } = {},
): PriceBreakdown {
  const safeNights = Math.max(0, Math.floor(nights));
  const safeExtras = Math.max(0, Math.floor(options.extras ?? 0));
  const safeAnimals = Math.max(0, Math.floor(options.animals ?? 0));
  const depositPercent = options.depositPercent ?? siteData.depositPercent;

  const base = nightlyRate * safeNights;
  const extrasCost = safeExtras * EXTRA_PERSON_NIGHTLY_COP * safeNights;
  const animalsCost = safeAnimals * ANIMAL_NIGHTLY_COP * safeNights;
  const subtotal = base + extrasCost + animalsCost;
  const deposit = Math.round((subtotal * depositPercent) / 100);
  const balance = subtotal - deposit;

  return {
    nights: safeNights,
    nightlyRate,
    base,
    extras: safeExtras,
    extrasCost,
    animals: safeAnimals,
    animalsCost,
    subtotal,
    deposit,
    balance,
  };
}
