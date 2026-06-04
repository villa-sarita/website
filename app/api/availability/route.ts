import { NextResponse } from 'next/server';

import { getBlockedRanges } from '@/lib/availability';
import { getCabana } from '@/lib/cabanas';

export const runtime = 'nodejs';

// Don't cache — availability changes every time a booking is made.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cabana = url.searchParams.get('cabana');
  if (!cabana) {
    return NextResponse.json({ error: 'missing_cabana' }, { status: 400 });
  }
  if (!getCabana(cabana)) {
    return NextResponse.json({ error: 'unknown_cabana' }, { status: 404 });
  }

  try {
    const ranges = await getBlockedRanges(cabana);
    return NextResponse.json(
      { cabana, ranges },
      {
        headers: {
          // Tiny CDN cache so a burst of clicks doesn't hammer Redis,
          // but stale-while-revalidate keeps the calendar fresh.
          'cache-control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[availability] failed', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
