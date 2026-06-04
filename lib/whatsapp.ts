/**
 * Build a wa.me link that opens a *blank* WhatsApp conversation with the
 * host. Earlier versions pre-filled a generated message via `?text=…`, but
 * those auto-messages read as templated/spammy to guests — so the second
 * argument is accepted for compatibility with existing callers but ignored.
 */
export function buildWhatsAppLink(phone: string, _message?: string): string {
  const normalised = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${normalised}`;
}

export interface BookingSummaryForWhatsApp {
  cabana: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: string;
  deposit: string;
  hasEvent: boolean;
  eventDescription?: string;
  guestName: string;
  locale: 'es' | 'en';
}

export function buildBookingMessage(s: BookingSummaryForWhatsApp): string {
  if (s.locale === 'en') {
    const lines = [
      `Hi! I just booked at Villa Sarita.`,
      ``,
      `*Cabin:* ${s.cabana}`,
      `*Check-in:* ${s.checkIn}`,
      `*Check-out:* ${s.checkOut}`,
      `*Guests:* ${s.guests}`,
      `*Total:* ${s.total}`,
      `*Deposit paid (20%):* ${s.deposit}`,
      `*Guest name:* ${s.guestName}`,
    ];
    if (s.hasEvent && s.eventDescription) {
      lines.push(``, `*Event request:*`, s.eventDescription);
    }
    return lines.join('\n');
  }
  const lines = [
    `¡Hola! Acabo de reservar en Villa Sarita.`,
    ``,
    `*Cabaña:* ${s.cabana}`,
    `*Llegada:* ${s.checkIn}`,
    `*Salida:* ${s.checkOut}`,
    `*Huéspedes:* ${s.guests}`,
    `*Total:* ${s.total}`,
    `*Anticipo pagado (20%):* ${s.deposit}`,
    `*Nombre del huésped:* ${s.guestName}`,
  ];
  if (s.hasEvent && s.eventDescription) {
    lines.push(``, `*Evento solicitado:*`, s.eventDescription);
  }
  return lines.join('\n');
}
