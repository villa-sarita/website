/**
 * Meta WhatsApp Cloud API client — sends a notification to the host (auntie)
 * when a booking is paid. Free tier covers the first 1,000 service conversations
 * per month, which is more than enough for a small ecolodge.
 *
 * Setup (~30 min):
 *   1. https://developers.facebook.com/ → create a Meta app → add WhatsApp product
 *   2. Add a test phone number, or verify a real business number
 *   3. Copy the Phone Number ID and the System User Access Token
 *   4. Add auntie's phone as a tester / recipient
 *   5. Drop these env vars into .env.local + Vercel:
 *        WHATSAPP_ACCESS_TOKEN=EAAxxxx...
 *        WHATSAPP_PHONE_ID=1234567890
 *        HOST_WHATSAPP_NUMBER=573173757798   (auntie's number, no '+' )
 *
 * If any of those env vars is missing, this no-ops silently so the booking
 * flow keeps working (the host still gets the email via Resend).
 */

import type { HostNotificationParams } from './email';

interface SendOptions {
  /** Recipient number in E.164 (digits only, no '+'), e.g. 573173757798. */
  to: string;
  body: string;
}

async function sendText({ to, body }: SendOptions): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.warn('whatsapp-cloud: skipping (WHATSAPP_* env vars not set)');
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: false, body },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`whatsapp send failed ${res.status}: ${text}`);
  }
}

function normaliseNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compose the message body the host will see in their WhatsApp. */
function buildHostMessage(p: HostNotificationParams): string {
  const balance = p.totalCop - p.depositCop;
  const lines = [
    `🌿 *Nueva reserva — Villa Sarita*`,
    ``,
    `*Cabaña:* ${p.cabana}`,
    `*Llegada:* ${p.checkIn}`,
    `*Salida:* ${p.checkOut}`,
    `*Huéspedes:* ${p.guests}`,
    ``,
    `*Total:* ${formatCop(p.totalCop)}`,
    `*Anticipo pagado:* ${formatCop(p.depositCop)} ✅`,
    `*Saldo al llegar:* ${formatCop(balance)}`,
    ``,
    `*Huésped:* ${p.guestName}`,
  ];
  if (p.guestPhone) lines.push(`*Teléfono:* ${p.guestPhone}`);
  if (p.guestEmail) lines.push(`*Correo:* ${p.guestEmail}`);
  if (p.hasEvent) {
    lines.push(``, `🎉 *Evento solicitado*`);
    if (p.eventDescription) lines.push(p.eventDescription);
  }
  lines.push(``, `Ref: ${p.reference}`);
  return lines.join('\n');
}

/** Public entry point — call from the webhook. Never throws. */
export async function sendHostWhatsApp(p: HostNotificationParams): Promise<void> {
  const hostNumber = process.env.HOST_WHATSAPP_NUMBER;
  if (!hostNumber) {
    console.warn('whatsapp-cloud: HOST_WHATSAPP_NUMBER not set, skipping');
    return;
  }
  try {
    await sendText({
      to: normaliseNumber(hostNumber),
      body: buildHostMessage(p),
    });
  } catch (err) {
    // Log but don't crash the webhook — email is the fallback.
    console.error('whatsapp-cloud: send failed', err);
  }
}
