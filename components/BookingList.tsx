'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type {
  BookingRecord,
  BookingSource,
  BookingStatus,
  PaymentMethod,
} from '@/lib/bookingStore';

import { EditBookingDialog } from './EditBookingDialog';
import styles from './BookingList.module.css';

export interface CabinMetaForEdit {
  slug: string;
  rate: number;
  capacity: number;
  allowsExtras: boolean;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  failed: 'Fallida',
};

const SOURCE_LABEL: Record<BookingSource, string> = {
  online: 'Wompi',
  manual: 'Manual',
  event_inquiry: 'Evento',
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  wompi: 'Wompi',
  cash: 'efectivo',
  transfer: 'transferencia',
  other: 'otro',
};

function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseLocal(iso: string): Date | null {
  if (!iso || iso === '—') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "9–19 jun" if same month, "9 jun – 4 jul" otherwise. Single-day events
 *  collapse to just "12 jul" (no en-dash with the same number twice). */
function formatDateRange(checkIn: string, checkOut: string): string {
  const a = parseLocal(checkIn);
  const b = parseLocal(checkOut);
  if (!a || !b) return '—';
  const monthA = a.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  const monthB = b.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  const sameDay = sameMonth && a.getDate() === b.getDate();
  if (sameDay) return `${a.getDate()} ${monthA}`;
  if (sameMonth) return `${a.getDate()}–${b.getDate()} ${monthA}`;
  return `${a.getDate()} ${monthA} – ${b.getDate()} ${monthB}`;
}

function formatDateLong(iso: string): string {
  const d = parseLocal(iso);
  if (!d) return iso || '—';
  return d.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildWhatsAppLink(phone: string | undefined): string | null {
  if (!phone) return null;
  const normalised = phone.replace(/[^0-9]/g, '');
  if (!normalised) return null;
  return `https://wa.me/${normalised}`;
}

interface BookingListProps {
  bookings: BookingRecord[];
  /** Per-cabin metadata keyed by slug — needed to enable the edit flow
   *  (capacity, rate, extras eligibility). When absent, the edit button
   *  is hidden. */
  cabins?: Record<string, CabinMetaForEdit>;
  /** When true, render a small expand/collapse caret header so the whole
   *  group can hide (used for the Canceladas section). */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  emptyHint?: string;
}

export function BookingList({
  bookings,
  cabins,
  collapsible = false,
  defaultCollapsed = false,
  emptyHint,
}: BookingListProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(!defaultCollapsed);
  const [cancelTarget, setCancelTarget] = useState<BookingRecord | null>(null);
  const [editTarget, setEditTarget] = useState<BookingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookingRecord | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const onRestore = async (b: BookingRecord) => {
    setRestoring(b.reference);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/booking/restore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference: b.reference }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          const conflicts =
            (data.conflicts as Array<{ checkIn: string; checkOut: string; guestName: string }>) ?? [];
          const lines = conflicts.map(
            (c) => `• ${c.guestName} — ${c.checkIn} a ${c.checkOut}`,
          );
          setActionError(
            `No se puede restaurar: las fechas ya están tomadas por otra reserva:\n${lines.join('\n')}`,
          );
        } else {
          setActionError(data.error ?? 'No se pudo restaurar la reserva.');
        }
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setActionError('Error de red. Intenta de nuevo.');
    } finally {
      setRestoring(null);
    }
  };

  const editCabin =
    editTarget && editTarget.cabanaSlug && cabins
      ? cabins[editTarget.cabanaSlug]
      : undefined;

  if (bookings.length === 0) {
    return emptyHint ? <p className={styles.emptyHint}>{emptyHint}</p> : null;
  }

  return (
    <>
      {collapsible && (
        <button
          type="button"
          className={styles.groupToggle}
          onClick={() => setGroupOpen((o) => !o)}
          aria-expanded={groupOpen}
        >
          <span className={styles.caret}>{groupOpen ? '▾' : '▸'}</span>
          {bookings.length} {bookings.length === 1 ? 'cancelada' : 'canceladas'}
        </button>
      )}
      {groupOpen && (
        <ul className={styles.list}>
          {bookings.map((b) => (
            <BookingRow
              key={b.reference}
              booking={b}
              expanded={expanded === b.reference}
              canEdit={!!(b.cabanaSlug && cabins && cabins[b.cabanaSlug])}
              restoring={restoring === b.reference}
              onToggle={() =>
                setExpanded((cur) => (cur === b.reference ? null : b.reference))
              }
              onAskCancel={() => setCancelTarget(b)}
              onAskEdit={() => setEditTarget(b)}
              onAskRestore={() => onRestore(b)}
              onAskDelete={() => setDeleteTarget(b)}
            />
          ))}
        </ul>
      )}
      {actionError && (
        <div className={styles.actionError} role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
        />
      )}
      {editTarget && editCabin && (
        <EditBookingDialog
          booking={editTarget}
          cabin={editCabin}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          booking={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function BookingRow({
  booking,
  expanded,
  canEdit,
  restoring,
  onToggle,
  onAskCancel,
  onAskEdit,
  onAskRestore,
  onAskDelete,
}: {
  booking: BookingRecord;
  expanded: boolean;
  canEdit: boolean;
  restoring: boolean;
  onToggle: () => void;
  onAskCancel: () => void;
  onAskEdit: () => void;
  onAskRestore: () => void;
  onAskDelete: () => void;
}) {
  const canCancel = booking.status !== 'cancelled' && booking.status !== 'failed';
  const showEdit = canEdit && canCancel && (booking.source ?? 'online') !== 'event_inquiry';
  const canRestore = booking.status === 'cancelled';
  const canDelete = booking.status === 'cancelled' || booking.status === 'failed';
  const source: BookingSource = booking.source ?? 'online';
  const isEvent = source === 'event_inquiry';
  const dateRange = formatDateRange(booking.checkIn, booking.checkOut);
  const balance = booking.totalCop - booking.depositCop;
  const waLink = buildWhatsAppLink(booking.guestPhone);

  return (
    <li className={`${styles.row} ${expanded ? styles.rowOpen : ''} ${booking.status === 'cancelled' ? styles.rowCancelled : ''}`}>
      <button
        type="button"
        className={styles.rowBar}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={`${styles.statusPill} ${styles[`status-${booking.status}`]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
        <span className={`${styles.sourcePill} ${styles[`source-${source}`]}`}>
          {SOURCE_LABEL[source]}
        </span>
        {!isEvent && booking.paymentMethod && (
          <span className={styles.paymentMethod}>{PAYMENT_LABEL[booking.paymentMethod]}</span>
        )}
        <span className={styles.cabin}>{booking.cabana}</span>
        <span className={styles.dates}>{dateRange}</span>
        <span className={styles.guest}>{booking.guestName}</span>
        <span className={styles.total}>
          {isEvent ? 'Por cotizar' : formatCop(booking.totalCop)}
        </span>
        <span className={styles.rowActions}>
          <span className={styles.caret}>{expanded ? '▾' : '▸'}</span>
          {canCancel && (
            <span
              role="button"
              tabIndex={0}
              className={styles.quickCancel}
              onClick={(e) => {
                e.stopPropagation();
                onAskCancel();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onAskCancel();
                }
              }}
              aria-label="Cancelar reserva"
              title="Cancelar reserva"
            >
              ✕
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className={styles.expand}>
          <dl className={styles.detailGrid}>
            {isEvent ? (
              <>
                <dt>Fecha del evento</dt>
                <dd>{formatDateLong(booking.checkIn)}</dd>
                {booking.eventTime && (
                  <>
                    <dt>Hora</dt>
                    <dd>{booking.eventTime}</dd>
                  </>
                )}
                <dt>Invitados</dt>
                <dd>{booking.guests || '—'}</dd>
              </>
            ) : (
              <>
                <dt>Llegada</dt>
                <dd>{formatDateLong(booking.checkIn)}</dd>
                <dt>Salida</dt>
                <dd>{formatDateLong(booking.checkOut)}</dd>
                <dt>Huéspedes</dt>
                <dd>{booking.guests || '—'}</dd>
                {(booking.extras ?? 0) > 0 && (
                  <>
                    <dt>Personas extra</dt>
                    <dd>{booking.extras}</dd>
                  </>
                )}
                {(booking.animals ?? 0) > 0 && (
                  <>
                    <dt>Animales</dt>
                    <dd>{booking.animals}</dd>
                  </>
                )}
              </>
            )}
            <dt>Teléfono</dt>
            <dd>
              {booking.guestPhone ? (
                <a href={`tel:${booking.guestPhone}`}>{booking.guestPhone}</a>
              ) : (
                '—'
              )}
            </dd>
            <dt>Correo</dt>
            <dd>{booking.guestEmail || '—'}</dd>
            {!isEvent && (
              <>
                <dt>Total estadía</dt>
                <dd>{formatCop(booking.totalCop)}</dd>
                <dt>Anticipo</dt>
                <dd>{formatCop(booking.depositCop)}</dd>
                <dt>Saldo al llegar</dt>
                <dd>{formatCop(balance)}</dd>
              </>
            )}
            {isEvent && (
              <>
                <dt>Cotización</dt>
                <dd>
                  Por cotizar — responde por WhatsApp con el precio.
                </dd>
              </>
            )}
            <dt>Referencia</dt>
            <dd className={styles.ref}>{booking.reference}</dd>
            {booking.transactionId && (
              <>
                <dt>Wompi tx</dt>
                <dd className={styles.ref}>
                  <code>{booking.transactionId}</code>
                </dd>
              </>
            )}
            {booking.status === 'cancelled' && (
              <>
                <dt>Cancelada</dt>
                <dd>
                  {booking.cancelledAt
                    ? new Date(booking.cancelledAt).toLocaleString('es-CO')
                    : '—'}
                  {booking.cancelledBy ? ` · ${booking.cancelledBy}` : ''}
                </dd>
                <dt>Motivo</dt>
                <dd>{booking.cancellationReason ?? '—'}</dd>
              </>
            )}
          </dl>

          {booking.eventDescription && (
            <div className={styles.notes}>
              <strong>Evento solicitado:</strong>
              <p>{booking.eventDescription}</p>
            </div>
          )}
          {booking.notes && (
            <div className={styles.notes}>
              <strong>Notas:</strong>
              <p>{booking.notes}</p>
            </div>
          )}

          <div className={styles.expandActions}>
            {showEdit && (
              <button
                type="button"
                onClick={onAskEdit}
                className={styles.actionBtn}
              >
                Editar reserva
              </button>
            )}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                WhatsApp al huésped
              </a>
            )}
            {booking.guestPhone && (
              <a href={`tel:${booking.guestPhone}`} className={styles.actionBtn}>
                Llamar
              </a>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={onAskCancel}
                className={`${styles.actionBtn} ${styles.cancelBtn}`}
              >
                Cancelar reserva
              </button>
            )}
            {canRestore && (
              <button
                type="button"
                onClick={onAskRestore}
                disabled={restoring}
                className={`${styles.actionBtn} ${styles.restoreBtn}`}
              >
                {restoring ? 'Restaurando…' : 'Restaurar reserva'}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onAskDelete}
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
              >
                Eliminar permanentemente
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function CancelDialog({
  booking,
  onClose,
}: {
  booking: BookingRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWompi = (booking.source ?? 'online') === 'online' && booking.paymentMethod === 'wompi';

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const submit = async () => {
    const r = reason.trim();
    if (!r) {
      setError('Por favor escribe el motivo.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/booking/cancel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference: booking.reference, reason: r }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No se pudo cancelar.');
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
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <h3 className={styles.dialogTitle}>Cancelar reserva</h3>
        <p className={styles.dialogBody}>
          ¿Cancelar la reserva de <strong>{booking.guestName}</strong> para{' '}
          <strong>{formatDateRange(booking.checkIn, booking.checkOut)}</strong> en{' '}
          <strong>{booking.cabana}</strong>?
        </p>

        {isWompi && (
          <div className={styles.warning}>
            <strong>Atención:</strong> esta reserva fue pagada por Wompi. Cancelar
            aquí libera las fechas pero <strong>NO</strong> emite el reembolso. El
            reembolso debe hacerse manualmente desde el panel de Wompi.
          </div>
        )}

        <label className={styles.reasonField}>
          <span>Motivo</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isWompi
                ? 'Ej: huésped solicitó cancelar por WhatsApp, ya reembolsado en Wompi.'
                : 'Ej: huésped canceló por WhatsApp, doble reserva por error...'
            }
            autoFocus
            required
          />
        </label>

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
            {submitting ? 'Cancelando…' : 'Cancelar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({
  booking,
  onClose,
}: {
  booking: BookingRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/booking/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference: booking.reference }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No se pudo eliminar.');
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
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <h3 className={styles.dialogTitle}>Eliminar para siempre</h3>
        <p className={styles.dialogBody}>
          Vas a borrar la reserva de <strong>{booking.guestName}</strong>
          {booking.cabana ? ` (${booking.cabana})` : ''}.
        </p>
        <div className={styles.warning}>
          <strong>Esta acción no se puede deshacer.</strong> El registro
          desaparece de la lista. Úsalo sólo para limpiar reservas viejas que
          ya no quieras ver.
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
            {submitting ? 'Eliminando…' : 'Eliminar para siempre'}
          </button>
        </div>
      </div>
    </div>
  );
}
