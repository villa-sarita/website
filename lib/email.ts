import { Resend } from 'resend';

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  _client = new Resend(apiKey);
  return _client;
}

export interface HostNotificationParams {
  reference: string;
  cabana: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  /** Guests booked above the cabin's base capacity, charged at the
   *  extra-person rate. Defaults to 0 if absent. */
  extras?: number;
  /** Animals (pets) the guest brought, charged at the animal rate.
   *  Defaults to 0 if absent. */
  animals?: number;
  totalCop: number;
  depositCop: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  hasEvent: boolean;
  eventDescription?: string;
  transactionId?: string;
}

export async function sendHostNotification(p: HostNotificationParams) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'reservas@villasaritaecolodge.com';
  const to = process.env.HOST_NOTIFY_EMAIL;
  if (!to) {
    throw new Error('HOST_NOTIFY_EMAIL is not set');
  }

  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const subject = `Nueva reserva · ${p.cabana} · ${p.guestName}`;
  const eventBlock = p.hasEvent && p.eventDescription
    ? `<h3 style="margin-top:24px;color:#b5462a">Evento solicitado</h3><p style="white-space:pre-wrap;background:#f4ecdb;padding:12px;border-radius:8px">${escapeHtml(p.eventDescription)}</p>`
    : '';

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f1a14">
      <h1 style="font-family:Georgia,serif;color:#3d2616;margin-bottom:6px">Tienes una reserva nueva</h1>
      <p style="color:#5a3826;margin-top:0">Referencia: <code>${p.reference}</code></p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#5a3826">Cabaña</td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(p.cabana)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5a3826">Llegada</td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(p.checkIn)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5a3826">Salida</td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(p.checkOut)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5a3826">Huéspedes</td><td style="padding:8px 0;text-align:right"><strong>${p.guests}</strong></td></tr>
        ${p.extras ? `<tr><td style="padding:8px 0;color:#5a3826">Personas extra</td><td style="padding:8px 0;text-align:right"><strong>${p.extras}</strong></td></tr>` : ''}
        ${p.animals ? `<tr><td style="padding:8px 0;color:#5a3826">Animales</td><td style="padding:8px 0;text-align:right"><strong>${p.animals}</strong></td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#5a3826">Total estadía</td><td style="padding:8px 0;text-align:right"><strong>${fmt.format(p.totalCop)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5a3826">Anticipo pagado (20%)</td><td style="padding:8px 0;text-align:right"><strong style="color:#2e4a2c">${fmt.format(p.depositCop)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5a3826">Saldo al llegar</td><td style="padding:8px 0;text-align:right"><strong>${fmt.format(p.totalCop - p.depositCop)}</strong></td></tr>
      </table>
      <h3 style="margin-top:24px;color:#b5462a">Datos del huésped</h3>
      <p style="margin:4px 0"><strong>${escapeHtml(p.guestName)}</strong></p>
      <p style="margin:4px 0">${escapeHtml(p.guestEmail)}</p>
      ${p.guestPhone ? `<p style="margin:4px 0">${escapeHtml(p.guestPhone)}</p>` : ''}
      ${eventBlock}
      ${p.transactionId ? `<p style="margin-top:24px;color:#888;font-size:12px">Wompi transaction: ${p.transactionId}</p>` : ''}
    </div>
  `;

  const result = await getClient().emails.send({
    from,
    to,
    subject,
    html,
  });
  if (result.error) {
    // Resend SDK returns errors in {data, error} rather than throwing.
    // Surface them so the caller (webhook) can log + react.
    const err = result.error as { message?: string; name?: string };
    const msg = err.message ?? JSON.stringify(result.error);
    throw new Error(`Resend send failed: ${msg}`);
  }
  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EventInquiryEmailParams {
  reference: string;
  eventType: string; // human label, e.g. "Cumpleaños"
  eventDate: string; // ISO YYYY-MM-DD
  eventTime?: string;
  guests: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  message?: string;
}

/**
 * Email the host when a guest fills the standalone event-inquiry form.
 * Distinct subject + body from a cabin-booking notification so the host
 * can see at a glance "this is an event-only request, no payment yet,
 * quote and reply".
 */
export async function sendEventInquiry(p: EventInquiryEmailParams) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'reservas@villasaritaecolodge.com';
  const to = process.env.HOST_NOTIFY_EMAIL;
  if (!to) throw new Error('HOST_NOTIFY_EMAIL is not set');

  const subject = `Solicitud de evento · ${p.eventType} · ${p.guestName}`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f1a14">
      <h1 style="font-family:Georgia,serif;color:#3d2616;margin-bottom:6px">Nueva solicitud de evento</h1>
      <p style="color:#5a3826;margin-top:0">Aún no hay pago — responder con cotización por WhatsApp.</p>
      <p style="color:#5a3826;margin-top:0">Referencia: <code>${p.reference}</code></p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;color:#5a3826">Tipo de evento</td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(p.eventType)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5a3826">Fecha</td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(p.eventDate)}</strong></td></tr>
        ${p.eventTime ? `<tr><td style="padding:8px 0;color:#5a3826">Hora</td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(p.eventTime)}</strong></td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#5a3826">Invitados estimados</td><td style="padding:8px 0;text-align:right"><strong>${p.guests}</strong></td></tr>
      </table>
      <h3 style="margin-top:24px;color:#b5462a">Contacto del solicitante</h3>
      <p style="margin:4px 0"><strong>${escapeHtml(p.guestName)}</strong></p>
      <p style="margin:4px 0"><a href="tel:${escapeHtml(p.guestPhone)}">${escapeHtml(p.guestPhone)}</a> · <a href="https://wa.me/${p.guestPhone.replace(/[^0-9]/g, '')}">WhatsApp</a></p>
      ${p.guestEmail ? `<p style="margin:4px 0">${escapeHtml(p.guestEmail)}</p>` : ''}
      ${p.message ? `<h3 style="margin-top:24px;color:#b5462a">Mensaje</h3><p style="white-space:pre-wrap;background:#f4ecdb;padding:12px;border-radius:8px">${escapeHtml(p.message)}</p>` : ''}
    </div>
  `;

  const result = await getClient().emails.send({ from, to, subject, html });
  if (result.error) {
    const err = result.error as { message?: string };
    const msg = err.message ?? JSON.stringify(result.error);
    throw new Error(`Resend send failed (event inquiry): ${msg}`);
  }
  return result;
}
