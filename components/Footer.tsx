import Link from 'next/link';

import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { formatTime12h } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import siteData from '@/content/site.json';

import styles from './Footer.module.css';

interface FooterProps {
  locale: Locale;
  dict: Dictionary;
}

export function Footer({ locale, dict }: FooterProps) {
  const year = new Date().getFullYear();
  const whatsappHref = buildWhatsAppLink(siteData.whatsappNumber, dict.whatsapp.defaultMessage);

  const links = [
    { href: `/${locale}/cabanas`, label: dict.nav.cabanas },
    { href: `/${locale}/experiencia`, label: dict.nav.experiencia },
    { href: `/${locale}/ubicacion`, label: dict.nav.ubicacion },
  ];

  const socials = [
    {
      key: 'instagram',
      href: siteData.social.instagramUrl,
      label: `Instagram · @${siteData.social.instagram}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: 'facebook',
      href: siteData.social.facebookUrl,
      label: `Facebook · ${siteData.social.facebook}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14 8.5h2.5V5.5h-2.5c-2 0-3.5 1.5-3.5 3.5v2H8v3h2.5V21h3v-7H16l.5-3H13.5V9.5c0-.6.4-1 1-1z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: 'tiktok',
      href: siteData.social.tiktokUrl,
      label: `TikTok · @${siteData.social.tiktok}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14 4v9.5a3 3 0 1 1-3-3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M14 4c.5 2 2 3.5 4.5 3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandBlock}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/villa-sarita-black-t.png"
            alt="Villa Sarita"
            className={styles.brandLogo}
          />
          <span className={styles.brandSlogan}>{dict.footer.slogan}</span>
          <p className={styles.tagline}>{dict.footer.tagline}</p>
        </div>

        <div>
          <h4 className={styles.colHead}>{dict.footer.links}</h4>
          <ul className={styles.colList}>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.colLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className={styles.colHead}>{dict.footer.contact}</h4>
          <ul className={styles.colList}>
            <li>
              <a
                href={whatsappHref}
                className={styles.colLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp · {siteData.phoneDisplay}
              </a>
            </li>
            <li>
              <span className={styles.colMuted}>
                {siteData.location.neighborhood} · {siteData.location.city}, {siteData.location.region}
              </span>
            </li>
            <li>
              <span className={styles.colMuted}>
                {dict.booking.checkIn} {formatTime12h(siteData.checkIn, locale)}
                {' · '}
                {dict.booking.checkOut} {formatTime12h(siteData.checkOut, locale)}
              </span>
            </li>
          </ul>

          <h4 className={`${styles.colHead} ${styles.colHeadSocial}`}>{dict.footer.social}</h4>
          <ul className={styles.socialRow}>
            {socials.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={`container ${styles.bottom}`}>
        <span>
          © {year} Villa Sarita. {dict.footer.rights}
        </span>
        <span className={styles.bottomHand}>Cruza la puerta a tu conexión</span>
      </div>
    </footer>
  );
}
