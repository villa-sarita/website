'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { Dictionary, Locale } from '@/i18n/dictionaries';

import styles from './Nav.module.css';

interface NavProps {
  locale: Locale;
  dict: Dictionary;
}

export function Nav({ locale, dict }: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const altLocale: Locale = locale === 'es' ? 'en' : 'es';
  const langSwitchPath = (() => {
    if (!pathname) return `/${altLocale}`;
    const segments = pathname.split('/');
    if (segments[1] === 'es' || segments[1] === 'en') {
      segments[1] = altLocale;
      return segments.join('/') || `/${altLocale}`;
    }
    return `/${altLocale}${pathname}`;
  })();

  const links = [
    { href: `/${locale}/cabanas`, label: dict.nav.cabanas },
    { href: `/${locale}/experiencia`, label: dict.nav.experiencia },
    { href: `/${locale}/ubicacion`, label: dict.nav.ubicacion },
  ];

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.bar}`}>
        <Link href={`/${locale}`} className={styles.brand} aria-label="Villa Sarita">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/villa-sarita-green-t.png"
            alt="Villa Sarita"
            className={styles.brandLogo}
          />
        </Link>

        <nav className={styles.desktopLinks} aria-label="primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href={langSwitchPath} className={styles.locale} aria-label="change language">
            {dict.nav.switchLang}
          </Link>
          <Link href={`/${locale}/cabanas`} className={`btn btn-primary ${styles.reservarBtn}`}>
            {dict.nav.reservar}
          </Link>
          <button
            type="button"
            className={styles.burger}
            aria-label="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className={open ? styles.burgerLineOpen1 : ''} />
            <span className={open ? styles.burgerLineOpen2 : ''} />
          </button>
        </div>
      </div>

      <div className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}>
        <nav className={styles.overlayLinks} aria-label="mobile primary">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.overlayLink}
              style={{ transitionDelay: `${0.05 + i * 0.05}s` }}
            >
              {link.label}
            </Link>
          ))}
          <Link href={langSwitchPath} className={styles.overlayLocale}>
            {locale === 'es' ? 'English' : 'Español'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
