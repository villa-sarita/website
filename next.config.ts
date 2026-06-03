import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * - CSP allows: self, inline styles (needed by Next.js + react-day-picker),
 *   Google Maps iframe, WhatsApp wa.me links, Wompi checkout, Google Fonts.
 * - HSTS only meaningful over HTTPS — has no effect locally.
 */
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com https://*.googleusercontent.com",
      "frame-src https://www.google.com https://maps.google.com https://checkout.wompi.co",
      "connect-src 'self' https://checkout.wompi.co https://api.wompi.co",
      "form-action 'self' https://checkout.wompi.co",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
