'use client';

import { useEffect, useState, type FormEvent } from 'react';

import styles from './ChangePasswordButton.module.css';

const MIN_LENGTH = 6;

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirmNext('');
    setShowCurrent(false);
    setShowNext(false);
    setError(null);
    setSuccess(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (next !== confirmNext) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (next.length < MIN_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (next === current) {
      setError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        setSuccess(true);
        setCurrent('');
        setNext('');
        setConfirmNext('');
        setSubmitting(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      switch (data.error) {
        case 'current_incorrect':
          setError('La contraseña actual no es correcta.');
          break;
        case 'new_too_short':
          setError(`La nueva contraseña debe tener al menos ${data.minLength ?? MIN_LENGTH} caracteres.`);
          break;
        case 'same_as_current':
          setError('La nueva contraseña debe ser diferente a la actual.');
          break;
        case 'storage_unavailable':
          setError('No se pudo guardar la contraseña. Intenta de nuevo en un minuto.');
          break;
        case 'unauthorized':
          setError('Tu sesión expiró. Cierra sesión y vuelve a entrar.');
          break;
        default:
          setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={styles.openLink}
      >
        Cambiar contraseña
      </button>
    );
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <h3 className={styles.title}>Cambiar contraseña</h3>

        {success ? (
          <>
            <div className={styles.success}>
              Contraseña actualizada. La próxima vez que inicies sesión usa la
              nueva.
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={close}
                className={styles.confirm}
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <label className={styles.field}>
              <span>Contraseña actual</span>
              <div className={styles.pwWrap}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className={styles.pwToggle}
                  tabIndex={-1}
                >
                  {showCurrent ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span>Nueva contraseña</span>
              <div className={styles.pwWrap}>
                <input
                  type={showNext ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className={styles.pwToggle}
                  tabIndex={-1}
                >
                  {showNext ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <span className={styles.hint}>Mínimo {MIN_LENGTH} caracteres.</span>
            </label>

            <label className={styles.field}>
              <span>Confirmar nueva contraseña</span>
              <input
                type={showNext ? 'text' : 'password'}
                value={confirmNext}
                onChange={(e) => setConfirmNext(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={close}
                className={styles.cancel}
                disabled={submitting}
              >
                Volver
              </button>
              <button
                type="submit"
                className={styles.confirm}
                disabled={submitting}
              >
                {submitting ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
