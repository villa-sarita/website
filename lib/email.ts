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
    const msg = typeof result.error === 'object' && result.error
      ? (('message' in result.error ? (result.error as { message: unknown }).message : null) ?? JSON.stringify(result.error))
      : String(result.error);
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
