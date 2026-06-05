import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { setStoredPassword, verifyPassword } from '@/lib/adminPassword';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export const runtime = 'nodejs';

interface ChangePasswordBody {
  currentPassword?: string;
  newPassword?: string;
}

const MIN_LENGTH = 6;
const MAX_LENGTH = 200;

export async function POST(request: Request) {
  // 1. Must already be logged in.
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Parse body.
  let body: ChangePasswordBody;
  try {
    body = (await request.json()) as ChangePasswordBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const current = (body.currentPassword ?? '').trim();
  const next = (body.newPassword ?? '').trim();

  if (!current) {
    return NextResponse.json({ error: 'current_required' }, { status: 400 });
  }
  if (!next) {
    return NextResponse.json({ error: 'new_required' }, { status: 400 });
  }
  if (next.length < MIN_LENGTH) {
    return NextResponse.json({ error: 'new_too_short', minLength: MIN_LENGTH }, { status: 400 });
  }
  if (next.length > MAX_LENGTH) {
    return NextResponse.json({ error: 'new_too_long' }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: 'same_as_current' }, { status: 400 });
  }

  // 3. Re-verify the current password (defence against stolen-cookie misuse).
  if (!(await verifyPassword(current))) {
    return NextResponse.json({ error: 'current_incorrect' }, { status: 401 });
  }

  // 4. Persist the new hashed password.
  try {
    await setStoredPassword(next);
  } catch (err) {
    console.error('[change-password] setStoredPassword failed', err);
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
