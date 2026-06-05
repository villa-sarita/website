'use client';

import { useState } from 'react';

export function AdminLogoutButton() {
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    setBusy(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      /* ignore — we redirect anyway */
    }
    // Hard navigate so the cleared cookie is picked up by the login page.
    window.location.assign('/admin/login');
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      style={{
        background: 'transparent',
        border: 0,
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        textDecoration: 'underline',
        cursor: 'pointer',
        opacity: busy ? 0.5 : 1,
      }}
    >
      {busy ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
