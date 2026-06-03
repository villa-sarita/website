import { createHash } from 'crypto';

const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

export function getWompiPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_WOMPI_PUBLIC_KEY is not set');
  }
  return key;
}

export function getIntegritySecret(): string {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) {
    throw new Error('WOMPI_INTEGRITY_SECRET is not set');
  }
  return secret;
}

export function getEventsSecret(): string {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) {
    throw new Error('WOMPI_EVENTS_SECRET is not set');
  }
  return secret;
}

/**
 * Wompi integrity signature: SHA256(reference + amountInCents + currency + integritySecret)
 * Wompi docs: https://docs.wompi.co/docs/colombia/widget-checkout-web/
 */
export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency = 'COP',
): string {
  const secret = getIntegritySecret();
  const payload = `${reference}${amountInCents}${currency}${secret}`;
  return createHash('sha256').update(payload).digest('hex');
}

export function buildReference(cabanaSlug: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `vs-${cabanaSlug}-${stamp}-${rand}`;
}

export interface CheckoutParams {
  reference: string;
  amountInCents: number;
  email: string;
  fullName: string;
  phone?: string;
  redirectUrl: string;
}

export function buildCheckoutUrl(params: CheckoutParams): string {
  const publicKey = getWompiPublicKey();
  const signature = buildIntegritySignature(params.reference, params.amountInCents);
  const query = new URLSearchParams({
    'public-key': publicKey,
    currency: 'COP',
    'amount-in-cents': String(params.amountInCents),
    reference: params.reference,
    'signature:integrity': signature,
    'redirect-url': params.redirectUrl,
    'customer-data:email': params.email,
    'customer-data:full-name': params.fullName,
  });
  if (params.phone) {
    query.set('customer-data:phone-number', params.phone);
  }
  return `${WOMPI_CHECKOUT_URL}?${query.toString()}`;
}

/**
 * Verify a Wompi event webhook signature.
 * Wompi sends `signature.checksum` = SHA256 of (properties values concatenated + timestamp + eventsSecret).
 */
export interface WompiEventBody {
  event: string;
  data: { transaction: WompiTransaction };
  signature: {
    checksum: string;
    properties: string[];
  };
  timestamp: number;
}

export interface WompiTransaction {
  id: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';
  customer_email?: string;
  customer_data?: {
    full_name?: string;
    phone_number?: string;
  };
  payment_method_type?: string;
  created_at?: string;
  finalized_at?: string;
}

export function verifyWompiSignature(body: WompiEventBody): boolean {
  const secret = getEventsSecret();
  const values = body.signature.properties
    .map((path) => {
      const parts = path.split('.');
      let value: unknown = body.data;
      for (const p of parts) {
        if (value && typeof value === 'object' && p in value) {
          value = (value as Record<string, unknown>)[p];
        } else {
          return '';
        }
      }
      return String(value ?? '');
    })
    .join('');
  const payload = `${values}${body.timestamp}${secret}`;
  const expected = createHash('sha256').update(payload).digest('hex');
  return expected === body.signature.checksum;
}
