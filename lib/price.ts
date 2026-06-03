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

export interface PriceBreakdown {
  nights: number;
  nightlyRate: number;
  subtotal: number;
  deposit: number;
  balance: number;
}

export function calculateBreakdown(
  nightlyRate: number,
  nights: number,
  depositPercent = siteData.depositPercent,
): PriceBreakdown {
  const safeNights = Math.max(0, Math.floor(nights));
  const subtotal = nightlyRate * safeNights;
  const deposit = Math.round((subtotal * depositPercent) / 100);
  const balance = subtotal - deposit;
  return { nights: safeNights, nightlyRate, subtotal, deposit, balance };
}
