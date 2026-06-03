'use client';

import { useEffect, useState } from 'react';

import { buildWhatsAppLink } from '@/lib/whatsapp';

import styles from './WhatsAppFloating.module.css';

interface WhatsAppFloatingProps {
  phone: string;
  label: string;
  message: string;
}

export function WhatsAppFloating({ phone, label, message }: WhatsAppFloatingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 600);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <a
      href={buildWhatsAppLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`${styles.fab} ${mounted ? styles.show : ''}`}
    >
      <span className={styles.tooltip}>{label}</span>
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-2.3c1.9 1 4 1.6 6.1 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22.7c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.3 1.3-4-.2-.4c-1.1-1.7-1.7-3.7-1.7-5.8C5.5 9.6 10.2 5 16 5s10.5 4.6 10.5 10.5S21.8 25.7 16 25.7zm5.8-7.7c-.3-.2-1.9-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.2.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"
        />
      </svg>
    </a>
  );
}
