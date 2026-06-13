'use client';

import { useState, type FormEvent } from 'react';

import styles from './ManualBookingForm.module.css';

interface CabanaOption {
  slug: string;
  name: string;
  rate: number;
  capacity: number;
}

interface ManualBookingFormProps {
  cabanas: CabanaOption[];
}

type PaymentMethod = 'cash' | 'transfer' | 'other';

const formatCop = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

const nightsBetween = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
};

export function ManualBookingForm({ cabanas }: ManualBookingFormProps) {
  const [open, setOpen] = useState(false);
  const [cabanaSlug, setCabanaSlug] = useState(cabanas[0]?.slug ?? '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState(''); // depositCop
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCabana = cabanas.find((c) => c.slug === cabanaSlug);
  const nights = nightsBetween(checkIn, checkOut);
  const computedTotal = selectedCabana ? selectedCabana.rate * nights : 0;
  const guestsNum = Number(guests) || 0;
  const paidAmountNum = Number(paidAmount) || 0;

  const reset = () => {
    setCheckIn('');
    setCheckOut('');
    setGuests('2');
    setGuestName('');
    setGuestPhone('');
    setPaymentMethod('cash');
    setPaidAmount('');
    setNotes('');
    setError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCabana) return;
    if (!guestName.trim()) {
      setError('Falta el nombre del huésped.');
      return;
    }
    if (nights <= 0) {
      setError('Las fechas no son válidas.');
      return;
    }
    if (guestsNum < 1 || guestsNum > selectedCabana.capacity) {
      setError(`Huéspedes debe estar entre 1 y ${selectedCabana.capacity}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/booking', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cabanaSlug,
          checkIn,
          checkOut,
          guests: guestsNum,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || undefined,
          totalCop: computedTotal,
          depositCop: paidAmountNum,
          paymentMethod,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          const conflicts = data.conflicts as Array<{ checkIn: string; checkOut: string; guestName: string }> ?? [];
          const lines = conflicts.map(
            (c) => `• ${c.guestName} — ${c.checkIn} a ${c.checkOut}`,
          );
          setError(
            `Esas fechas chocan con otra reserva:\n${lines.join('\n')}`,
          );
        } else {
          setError(data.error ?? 'No se pudo guardar la reserva.');
        }
        return;
      }
      setSuccess(`Reserva guardada (${data.reference}). Refresca la página para verla en la lista.`);
      reset();
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className={styles.collapseRow}>
        <button
          type="button"
          className={styles.openButton}
          onClick={() => setOpen(true)}
        >
          + Añadir reserva manual
        </button>
        <span className={styles.openHint}>
          Para reservas por teléfono / WhatsApp / efectivo
        </span>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formHead}>
        <h2 className={styles.formTitle}>Nueva reserva manual</h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => {
            setOpen(false);
            reset();
            setSuccess(null);
          }}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Cabaña</span>
          <select
            value={cabanaSlug}
            onChange={(e) => setCabanaSlug(e.target.value)}
            required
          >
            {cabanas.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} · {formatCop(c.rate)} / noche
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Llegada</span>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Salida</span>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || undefined}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Huéspedes</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={selectedCabana?.capacity ?? 6}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            required
          />
        </label>

        <label className={`${styles.field} ${styles.wide}`}>
          <span>Nombre del huésped</span>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Ej: María Gómez"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Teléfono (opcional)</span>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+57 ..."
          />
        </label>

        <label className={styles.field}>
          <span>Método de pago</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia / Nequi</option>
            <option value="other">Otro</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Abono</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className={`${styles.field} ${styles.wide}`}>
          <span>Notas (opcional)</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: pago al llegar, vienen con bebé, evento sábado..."
          />
        </label>
      </div>

      <div className={styles.summary}>
        {nights > 0 && selectedCabana && (
          <>
            <span>
              {nights} {nights === 1 ? 'noche' : 'noches'} ·{' '}
              {formatCop(selectedCabana.rate)} / noche
            </span>
            <strong>Total: {formatCop(computedTotal)}</strong>
            {paidAmountNum > 0 && paidAmountNum < computedTotal && (
              <span className={styles.balance}>
                Saldo al llegar: {formatCop(computedTotal - paidAmountNum)}
              </span>
            )}
          </>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.actions}>
        <button
          type="submit"
          disabled={submitting}
          className={styles.submitButton}
        >
          {submitting ? 'Guardando...' : 'Guardar reserva'}
        </button>
      </div>
    </form>
  );
}
