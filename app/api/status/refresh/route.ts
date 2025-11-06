import { NextResponse } from 'next/server';
import { refreshStatusSnapshot } from '@/lib/service-status-snapshots';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await refreshStatusSnapshot({ source: 'autofetch', useAutofetchKeys: true });
    return NextResponse.json({ status: 'success', data: { validAt: snapshot.valid_at } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh status';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}


