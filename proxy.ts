import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales } from './i18n/dictionaries';

const PUBLIC_FILE = /\.(.*)$/;

function pickLocale(request: NextRequest): string {
  const accept = request.headers.get('accept-language') ?? '';
  const preferred = accept
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())
    .find((tag) => locales.some((loc) => tag.startsWith(loc)));
  if (preferred) {
    const match = locales.find((loc) => preferred.startsWith(loc));
    if (match) return match;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/photos') ||
    pathname.startsWith('/experiencias') ||
    pathname.startsWith('/logo') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return;
  }

  const pathnameHasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
  );
  if (pathnameHasLocale) return;

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|admin|favicon.ico|photos|experiencias|logo).*)'],
};
