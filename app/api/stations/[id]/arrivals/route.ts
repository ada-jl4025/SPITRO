import { NextRequest, NextResponse } from 'next/server';
import { tflClient } from '@/lib/tfl-client';
import type { ApiResponse } from '@/types';
import type { Prediction } from '@/types/tfl';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

type GroupedArrivals = Array<{
  key: string;
  lineName: string;
  platformName: string;
  direction?: string;
  modeName?: string;
  arrivals: Array<{
    id: string;
    destinationName: string;
    expectedArrival: string;
    timeToStation: number; // seconds
    currentLocation?: string;
  }>;
}>;

function groupArrivals(predictions: Prediction[]): GroupedArrivals {
  const groups = new Map<string, {
    key: string;
    lineName: string;
    platformName: string;
    direction?: string;
    modeName?: string;
    arrivals: Array<{
      id: string;
      destinationName: string;
      expectedArrival: string;
      timeToStation: number;
      currentLocation?: string;
    }>;
  }>();

  const sorted = [...predictions].sort((a, b) => a.timeToStation - b.timeToStation);

  for (const p of sorted) {
    const key = `${p.lineName}::${p.platformName || 'Platform'}::${p.direction || ''}`;
    const existing = groups.get(key) ?? {
      key,
      lineName: p.lineName,
      platformName: p.platformName || 'Platform',
      direction: p.direction,
      modeName: p.modeName,
      arrivals: [],
    };
    existing.arrivals.push({
      id: p.id,
      destinationName: p.destinationName || p.towards,
      expectedArrival: p.expectedArrival,
      timeToStation: p.timeToStation,
      currentLocation: p.currentLocation,
    });
    groups.set(key, existing);
  }

  return Array.from(groups.values());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stopPointId } = (await params) ?? {};
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '0', 10);
    const grouped = (searchParams.get('grouped') || 'true') === 'true';

    if (!stopPointId) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Stop point id is required',
      }, { status: 400 });
    }

    const predictions = await tflClient.getArrivals(stopPointId);

    const sorted = [...predictions].sort((a, b) => a.timeToStation - b.timeToStation);
    const limited = limit > 0 ? sorted.slice(0, limit) : sorted;

    const data = grouped ? { grouped: groupArrivals(limited) } : { arrivals: limited };

    return NextResponse.json<ApiResponse>({
      status: 'success',
      data: {
        stopPointId,
        total: predictions.length,
        ...data,
      },
    });
  } catch (error) {
    console.error('Arrivals API error:', error);
    return NextResponse.json<ApiResponse>({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to fetch arrivals',
    }, { status: 500 });
  }
}


