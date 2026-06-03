import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';

import '../globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Villa Sarita · Reservas',
  // Belt-and-suspenders: never let search engines index the admin pages.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
