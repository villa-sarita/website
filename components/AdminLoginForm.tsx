'use client';

import { useState, type FormEvent } from 'react';

import styles from './AdminLoginForm.module.css';

interface AdminLoginFormProps {
  /** Where to send the user after a successful login. */
  next: string;
}

export function AdminLoginForm({ next }: AdminLoginFormProps) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Escribe la contraseña.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Hard navigate so the new cookie is included in the next page load.
        window.location.assign(next);
        return;
      }
      if (res.status === 429) {
        setError('Demasiados intentos. Espera un minuto e intenta de nuevo.');
      } else if (res.status === 401) {
        setError('Contraseña incorrecta.');
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setError('Error de red. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <label className={styles.field}>
        <span>Contraseña</span>
        <div className={styles.pwWrap}>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className={styles.pwToggle}
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showPw ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" disabled={submitting} className={styles.submit}>
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
