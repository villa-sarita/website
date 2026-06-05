import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  createSessionToken,
  SESSION_COOKIE,
  verifyPassword,
} from '@/lib/session';

export const runtime = 'nodejs';

interface LoginBody {
  password?: string;
}

export async function POST(request: Request) {
  // Throttle login attempts (5 per minute per IP) to slow brute force.
  const ip = getClientIp(request);
  const rate = checkRateLimit(`admin-login:${ip}`, 5, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
    );
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const password = (body.password ?? '').trim();
  if (!(await verifyPassword(password))) {
    // Small constant delay so the response shape can't be timing-discriminated
    // beyond what verifyPassword already does.
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
  }

  const session = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: session.expiresAt,
  });

  return NextResponse.json({ ok: true });
}
