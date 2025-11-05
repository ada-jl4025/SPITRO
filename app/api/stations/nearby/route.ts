import { NextRequest, NextResponse } from 'next/server';
import { tflClient } from '@/lib/tfl-client';
import { geolocationService } from '@/lib/geolocation';
import { geocodingService } from '@/lib/geocoding';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lon, radius = 1000, modes, categories } = body;

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Valid latitude and longitude are required',
      }, { status: 400 });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Invalid coordinates',
      }, { status: 400 });
    }

    // Check if location is within London area
    const isInLondon = geolocationService.isInLondon(lat, lon);
    if (!isInLondon) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Location appears to be outside London. TFL services are only available in the London area.',
      }, { status: 400 });
    }

    // Get nearby stop points
    const nearbyStations = await tflClient.getNearbyStopPoints(
      lat,
      lon,
      radius,
      modes,
      categories
    );

    // Calculate distances and sort by distance
    const stationsWithDistance = nearbyStations
      .map(station => ({
        id: station.id,
        naptanId: station.naptanId,
        name: station.commonName,
        modes: station.modes || [],
        lat: station.lat,
        lon: station.lon,
        zone: station.zone,
        distance: geolocationService.calculateDistance(lat, lon, station.lat, station.lon),
        distanceFormatted: geolocationService.formatDistance(
          geolocationService.calculateDistance(lat, lon, station.lat, station.lon)
        ),
        lines: station.lines?.map(line => ({
          id: line.id,
          name: line.name,
        })) || [],
        additionalProperties: station.additionalProperties?.reduce((acc, prop) => {
          if (prop.key === 'WiFi' || prop.key === 'Toilets' || prop.key === 'Lifts') {
            acc[prop.key.toLowerCase()] = prop.value === 'yes';
          }
          return acc;
        }, {} as Record<string, boolean>) || {},
      }))
      .sort((a, b) => a.distance - b.distance);

    // Get address of the current location for context
    let currentLocationName: string | undefined;
    try {
      const reverseGeocode = await geocodingService.reverseGeocode(lat, lon);
      if (reverseGeocode) {
        currentLocationName = reverseGeocode.name;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }

    return NextResponse.json<ApiResponse>({
      status: 'success',
      data: {
        location: {
          lat,
          lon,
          name: currentLocationName,
        },
        stations: stationsWithDistance,
        total: stationsWithDistance.length,
        radius,
      },
    });

  } catch (error) {
    console.error('Nearby stations error:', error);
    
    return NextResponse.json<ApiResponse>({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to fetch nearby stations',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests with query parameters
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radius = parseInt(searchParams.get('radius') || '1000', 10);
  const modes = searchParams.get('modes')?.split(',').filter(Boolean);
  const categories = searchParams.get('categories')?.split(',').filter(Boolean);

  // Validate coordinates
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json<ApiResponse>({
      status: 'error',
      error: 'Valid latitude and longitude are required',
    }, { status: 400 });
  }

  // Delegate to POST handler
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ lat, lon, radius, modes, categories }),
  });

  return POST(mockRequest);
}
