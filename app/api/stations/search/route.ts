import { NextRequest, NextResponse } from 'next/server';
import { tflClient } from '@/lib/tfl-client';
import type { ApiResponse } from '@/types';
import type { StopPoint } from '@/types/tfl';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const modes = searchParams.get('modes')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.trim().length < 2) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Search query must be at least 2 characters',
      }, { status: 400 });
    }

    // Search for stations
    const stations = await tflClient.searchStopPoints(query, modes);

    // Sort by relevance and limit results
    const sortedStations = stations
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.commonName.toLowerCase() === query.toLowerCase();
        const bExact = b.commonName.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then prioritize starts with
        const aStarts = a.commonName.toLowerCase().startsWith(query.toLowerCase());
        const bStarts = b.commonName.toLowerCase().startsWith(query.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Then sort alphabetically
        return a.commonName.localeCompare(b.commonName);
      })
      .slice(0, limit);

    // Format the results
    const formattedStations = sortedStations.map(station => ({
      id: station.id,
      naptanId: station.naptanId,
      name: station.commonName,
      modes: station.modes || [],
      lat: station.lat,
      lon: station.lon,
      zone: station.zone,
      lines: station.lines?.map(line => ({
        id: line.id,
        name: line.name,
      })) || [],
    }));

    return NextResponse.json<ApiResponse>({
      status: 'success',
      data: {
        query,
        results: formattedStations,
        total: formattedStations.length,
      },
    });

  } catch (error) {
    console.error('Station search error:', error);
    
    return NextResponse.json<ApiResponse>({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to search stations',
    }, { status: 500 });
  }
}
