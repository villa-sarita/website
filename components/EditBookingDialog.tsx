'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { BookingRecord, PaymentMethod } from '@/lib/bookingStore';
import { ANIMAL_NIGHTLY_COP, EXTRA_PERSON_NIGHTLY_COP } from '@/lib/price';

import styles from './BookingList.module.css';

interface CabinMeta {
  slug: string;
  rate: number;
  capacity: number;
  allowsExtras: boolean;
}

interface EditBookingDialogProps {
  booking: BookingRecord;
  cabin: CabinMeta;
  onClose: () => void;
}

const fmt = (n: number) =>
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

export function EditBookingDialog({
  booking,
  cabin,
  onClose,
}: EditBookingDialogProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(booking.checkIn);
  const [checkOut, setCheckOut] = useState(booking.checkOut);
  const [guests, setGuests] = useState(String(booking.guests || 1));
  const [extras, setExtras] = useState(String(booking.extras ?? 0));
  const [animals, setAnimals] = useState(String(booking.animals ?? 0));
  const [guestName, setGuestName] = useState(booking.guestName);
  const [guestPhone, setGuestPhone] = useState(booking.guestPhone ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    booking.paymentMethod ?? 'cash',
  );
  const [paidAmount, setPaidAmount] = useState(String(booking.depositCop || ''));
  const [notes, setNotes] = useState(booking.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const guestsNum = Number(guests) || 0;
  const extrasNum = cabin.allowsExtras ? Number(extras) || 0 : 0;
  const animalsNum = Number(animals) || 0;
  const paidAmountNum = Number(paidAmount) || 0;
  const nights = nightsBetween(checkIn, checkOut);

  const baseCost = cabin.rate * nights;
  const extrasCost = extrasNum * EXTRA_PERSON_NIGHTLY_COP * nights;
  const animalsCost = animalsNum * ANIMAL_NIGHTLY_COP * nights;
  const computedTotal = baseCost + extrasCost + animalsCost;

  const submit = async () => {
    if (!guestName.trim()) {
      setError('Falta el nombre del huésped.');
      return;
    }
    if (nights <= 0) {
      setError('Las fechas no son válidas.');
      return;
    }
    if (guestsNum < 1 || guestsNum > cabin.capacity) {
      setError(`Huéspedes debe estar entre 1 y ${cabin.capacity}.`);
      return;
    }
    if (extrasNum > 0 && !cabin.allowsExtras) {
      setError('Esta cabaña no permite personas adicionales.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/booking/edit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reference: booking.reference,
          checkIn,
          checkOut,
          guests: guestsNum,
          extras: extrasNum,
          animals: animalsNum,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || undefined,
          paymentMethod,
          totalCop: computedTotal,
          depositCop: paidAmountNum,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          const conflicts =
            (data.conflicts as Array<{ checkIn: string; checkOut: string; guestName: string }>) ??
            [];
          const lines = conflicts.map(
            (c) => `• ${c.guestName} — ${c.checkIn} a ${c.checkOut}`,
          );
          setError(`Esas fechas chocan con otra reserva:\n${lines.join('\n')}`);
        } else {
          setError(data.error ?? 'No se pudo guardar los cambios.');
        }
        setSubmitting(false);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`${styles.dialog} ${styles.dialogWide}`} role="dialog" aria-modal="true">
        <h3 className={styles.dialogTitle}>Editar reserva</h3>
        <p className={styles.dialogBody}>
          {booking.cabana} — <strong>{booking.reference}</strong>
        </p>

        <div className={styles.editGrid}>
          <label className={styles.editField}>
            <span>Llegada</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label className={styles.editField}>
            <span>Salida</span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || undefined}
            />
          </label>
          <label className={styles.editField}>
            <span>Huéspedes</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={cabin.capacity}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
          </label>
          {cabin.allowsExtras && (
            <label className={styles.editField}>
              <span>Extra (+{fmt(EXTRA_PERSON_NIGHTLY_COP)}/noche)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
              />
            </label>
          )}
          <label className={styles.editField}>
            <span>Animales (+{fmt(ANIMAL_NIGHTLY_COP)}/noche)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={animals}
              onChange={(e) => setAnimals(e.target.value)}
            />
          </label>
          <label className={`${styles.editField} ${styles.editWide}`}>
            <span>Nombre</span>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </label>
          <label className={styles.editField}>
            <span>Teléfono</span>
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+57 ..."
            />
          </label>
          <label className={styles.editField}>
            <span>Método de pago</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia / Nequi</option>
              <option value="wompi">Wompi</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className={styles.editField}>
            <span>Abono</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </label>
          <label className={`${styles.editField} ${styles.editWide}`}>
            <span>Notas</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className={styles.editSummary}>
          {nights > 0 && (
            <>
              <span>
                {nights} {nights === 1 ? 'noche' : 'noches'} · {fmt(cabin.rate)}/noche
              </span>
              {extrasNum > 0 && <span>+ {extrasNum} extra = {fmt(extrasCost)}</span>}
              {animalsNum > 0 && (
                <span>
                  + {animalsNum} animal{animalsNum === 1 ? '' : 'es'} = {fmt(animalsCost)}
                </span>
              )}
              <strong>Total: {fmt(computedTotal)}</strong>
              {paidAmountNum > 0 && paidAmountNum < computedTotal && (
                <span>Saldo: {fmt(computedTotal - paidAmountNum)}</span>
              )}
            </>
          )}
        </div>

        {error && <div className={styles.dialogError}>{error}</div>}

        <div className={styles.dialogActions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.dialogCancel}
            disabled={submitting}
          >
            Volver
          </button>
          <button
            type="button"
            onClick={submit}
            className={styles.dialogConfirm}
            disabled={submitting}
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
