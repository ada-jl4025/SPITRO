import { NextRequest, NextResponse } from 'next/server';
import { tflClient } from '@/lib/tfl-client';
import { nationalRailClient } from '@/lib/national-rail-client';
import type { StopPoint, Prediction } from '@/types/tfl';

export const dynamic = 'force-dynamic';

type LegDescriptor = {
  journeyIndex: number;
  legIndex: number;
  modeId: string;
  stopPointId?: string;
  parentStationId?: string;
  lineId?: string;
  departurePoint?: StopPoint;
  arrivalPoint?: StopPoint;
};

function extractCrsFromStopPoint(stopPoint?: StopPoint): string | undefined {
  if (!stopPoint) return undefined;

  const ics = (stopPoint as any).icsCode as string | undefined;
  if (ics && /^[A-Z]{3}$/.test(ics)) {
    return ics.toUpperCase();
  }

  const props = (stopPoint as any).additionalProperties || [];
  for (const p of props) {
    const key = (p.key || '').toLowerCase();
    if (key === 'crs' || key === 'crscode') {
      const val = String(p.value || '').toUpperCase();
      if (/^[A-Z]{3}$/.test(val)) return val;
    }
  }

  const naptanId = (stopPoint as any).naptanId || (stopPoint as any).id || '';
  const match = /^910G([A-Z]{3})/i.exec(naptanId);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  const parent = (stopPoint as any).stationNaptan || '';
  const parentMatch = /^910G([A-Z]{3})/i.exec(parent);
  if (parentMatch && parentMatch[1]) {
    return parentMatch[1].toUpperCase();
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const legs: LegDescriptor[] = Array.isArray(body?.legs) ? body.legs : [];

    if (legs.length === 0) {
      return NextResponse.json({ status: 'error', error: 'No legs provided' }, { status: 400 });
    }

    const stopPointIds = new Set<string>();
    const nrCrsSet = new Set<string>();

    for (const d of legs) {
      if (d.stopPointId) stopPointIds.add(d.stopPointId);
      if (d.parentStationId) stopPointIds.add(d.parentStationId);
      if (d.modeId === 'national-rail') {
        const crs = extractCrsFromStopPoint(d.departurePoint) || extractCrsFromStopPoint(d.arrivalPoint);
        if (crs) nrCrsSet.add(crs);
      }
    }

    let arrivals: Prediction[] = [];
    if (stopPointIds.size > 0) {
      try {
        arrivals = await tflClient.getMultipleArrivals(Array.from(stopPointIds));
      } catch (e) {
        arrivals = [];
      }
    }
    const sortedArrivals = [...arrivals].sort((a, b) => a.timeToStation - b.timeToStation);

    const nrByCrs = new Map<string, { id: string; destinationName: string; expectedArrival: string; timeToStation: number; platformName?: string; towards?: string; }[]>();
    if (nationalRailClient.isEnabled() && nrCrsSet.size > 0) {
      await Promise.all(Array.from(nrCrsSet).map(async (crs) => {
        try {
          const deps = await nationalRailClient.getNextDeparturesByCRS(crs, 3);
          nrByCrs.set(crs, deps.map((d) => ({
            id: d.id,
            destinationName: d.destinationName,
            expectedArrival: d.expectedArrival,
            timeToStation: d.timeToStation,
            platformName: d.platformName,
            towards: d.towards,
          })));
        } catch {}
      }));
    }

    type ArrivalItem = {
      id: string;
      destinationName: string;
      expectedArrival: string;
      timeToStation: number;
      platformName?: string;
      towards?: string;
    };

    const updates = legs.map((d) => {
      const candidateStopIds = [d.stopPointId, d.parentStationId].filter(Boolean) as string[];
      const mapPrediction = (p: Prediction): ArrivalItem => ({
        id: p.id,
        destinationName: p.destinationName,
        expectedArrival: p.expectedArrival,
        timeToStation: p.timeToStation,
        platformName: p.platformName,
        towards: (p as any).towards || p.direction,
      });

      // Start with NR if applicable
      let relevantArrivals: ArrivalItem[] = [];
      let platformName: string | undefined = undefined;
      if (d.modeId === 'national-rail') {
        const crs = extractCrsFromStopPoint(d.departurePoint) || extractCrsFromStopPoint(d.arrivalPoint);
        if (crs && nrByCrs.has(crs)) {
          relevantArrivals = (nrByCrs.get(crs) || []).slice(0, 3);
          platformName = relevantArrivals[0]?.platformName || undefined;
        }
      }

      const filterFromCache = (preds: Prediction[]) => preds
        .filter((p) => candidateStopIds.includes(p.naptanId))
        .sort((a, b) => a.timeToStation - b.timeToStation);

      if (relevantArrivals.length === 0 && d.lineId) {
        relevantArrivals = filterFromCache(sortedArrivals)
          .filter((p) => (p.lineId || '').toLowerCase() === d.lineId!.toLowerCase())
          .slice(0, 3)
          .map(mapPrediction);
      }
      if (relevantArrivals.length === 0) {
        relevantArrivals = filterFromCache(sortedArrivals)
          .slice(0, 3)
          .map(mapPrediction);
      }
      platformName = platformName || relevantArrivals[0]?.platformName || undefined;

      return {
        journeyIndex: d.journeyIndex,
        legIndex: d.legIndex,
        nextArrivals: relevantArrivals,
        platformName,
      };
    });

    return NextResponse.json({ status: 'success', data: { updates } });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed to refresh arrivals' }, { status: 500 });
  }
}


