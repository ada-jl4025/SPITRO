import { config } from './config';

export interface GeocodingResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  confidence: number;
  placeId?: string;
  types?: string[];
  bounds?: {
    northeast: { lat: number; lon: number };
    southwest: { lat: number; lon: number };
  };
}

interface GoogleGeocodingResponse {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      bounds?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
    place_id: string;
    types: string[];
  }>;
  status: string;
}

interface MapboxGeocodingResponse {
  features: Array<{
    place_name: string;
    center: [number, number]; // [lon, lat]
    relevance: number;
    id: string;
    place_type: string[];
    bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  }>;
}

class GeocodingService {
  private apiKey: string;
  private provider: string;

  constructor() {
    this.apiKey = config.geocoding.apiKey;
    this.provider = config.geocoding.provider;
  }

  async geocode(query: string, options?: {
    bounds?: { southwest: [number, number]; northeast: [number, number] };
    country?: string;
    limit?: number;
  }): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      console.warn('Geocoding API key not configured');
      return [];
    }

    // Add London/UK bias if not specified
    const defaultOptions = {
      country: 'GB',
      limit: 5,
      ...options,
    };

    if (this.provider === 'google') {
      return this.geocodeWithGoogle(query, defaultOptions);
    } else if (this.provider === 'mapbox') {
      return this.geocodeWithMapbox(query, defaultOptions);
    } else {
      throw new Error(`Unsupported geocoding provider: ${this.provider}`);
    }
  }

  private async geocodeWithGoogle(
    query: string,
    options: any
  ): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      address: query,
      key: this.apiKey,
      region: options.country?.toLowerCase() || 'gb',
    });

    // Add London bounds to improve results
    if (!options.bounds) {
      // Greater London bounds
      params.append('bounds', '51.2868,-0.5103|51.6919,0.3340');
    } else {
      const { southwest, northeast } = options.bounds;
      params.append('bounds', `${southwest[1]},${southwest[0]}|${northeast[1]},${northeast[0]}`);
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );

      if (!response.ok) {
        throw new Error(`Google Geocoding API error: ${response.status}`);
      }

      const data: GoogleGeocodingResponse = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Geocoding API error: ${data.status}`);
      }

      return data.results.slice(0, options.limit).map((result) => ({
        name: this.extractPlaceName(result.formatted_address),
        displayName: result.formatted_address,
        lat: result.geometry.location.lat,
        lon: result.geometry.location.lng,
        confidence: this.calculateGoogleConfidence(result.types),
        placeId: result.place_id,
        types: result.types,
        bounds: result.geometry.bounds
          ? {
              northeast: {
                lat: result.geometry.bounds.northeast.lat,
                lon: result.geometry.bounds.northeast.lng,
              },
              southwest: {
                lat: result.geometry.bounds.southwest.lat,
                lon: result.geometry.bounds.southwest.lng,
              },
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Google geocoding error:', error);
      return [];
    }
  }

  private async geocodeWithMapbox(
    query: string,
    options: any
  ): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      access_token: this.apiKey,
      country: options.country || 'GB',
      limit: String(options.limit || 5),
      types: 'address,poi,place,locality,neighborhood',
    });

    // Add London proximity bias
    if (!options.bounds) {
      // Central London coordinates
      params.append('proximity', '-0.1276,51.5074');
    }

    if (options.bounds) {
      const { southwest, northeast } = options.bounds;
      params.append('bbox', `${southwest[0]},${southwest[1]},${northeast[0]},${northeast[1]}`);
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?${params}`
      );

      if (!response.ok) {
        throw new Error(`Mapbox Geocoding API error: ${response.status}`);
      }

      const data: MapboxGeocodingResponse = await response.json();

      return data.features.slice(0, options.limit).map((feature) => ({
        name: this.extractPlaceName(feature.place_name),
        displayName: feature.place_name,
        lat: feature.center[1],
        lon: feature.center[0],
        confidence: feature.relevance,
        placeId: feature.id,
        types: feature.place_type,
        bounds: feature.bbox
          ? {
              northeast: {
                lat: feature.bbox[3],
                lon: feature.bbox[2],
              },
              southwest: {
                lat: feature.bbox[1],
                lon: feature.bbox[0],
              },
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return [];
    }
  }

  // Reverse geocoding to get address from coordinates
  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      console.warn('Geocoding API key not configured');
      return null;
    }

    if (this.provider === 'google') {
      return this.reverseGeocodeWithGoogle(lat, lon);
    } else if (this.provider === 'mapbox') {
      return this.reverseGeocodeWithMapbox(lat, lon);
    } else {
      throw new Error(`Unsupported geocoding provider: ${this.provider}`);
    }
  }

  private async reverseGeocodeWithGoogle(
    lat: number,
    lon: number
  ): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      latlng: `${lat},${lon}`,
      key: this.apiKey,
    });

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );

      if (!response.ok) {
        throw new Error(`Google Geocoding API error: ${response.status}`);
      }

      const data: GoogleGeocodingResponse = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          name: this.extractPlaceName(result.formatted_address),
          displayName: result.formatted_address,
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng,
          confidence: 1,
          placeId: result.place_id,
          types: result.types,
        };
      }

      return null;
    } catch (error) {
      console.error('Google reverse geocoding error:', error);
      return null;
    }
  }

  private async reverseGeocodeWithMapbox(
    lat: number,
    lon: number
  ): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      access_token: this.apiKey,
      types: 'address,poi,place',
    });

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?${params}`
      );

      if (!response.ok) {
        throw new Error(`Mapbox Geocoding API error: ${response.status}`);
      }

      const data: MapboxGeocodingResponse = await response.json();

      if (data.features.length > 0) {
        const feature = data.features[0];
        return {
          name: this.extractPlaceName(feature.place_name),
          displayName: feature.place_name,
          lat: feature.center[1],
          lon: feature.center[0],
          confidence: feature.relevance,
          placeId: feature.id,
          types: feature.place_type,
        };
      }

      return null;
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
      return null;
    }
  }

  // Helper methods
  private extractPlaceName(fullAddress: string): string {
    // Extract the first part of the address as the place name
    const parts = fullAddress.split(',');
    return parts[0].trim();
  }

  private calculateGoogleConfidence(types: string[]): number {
    // Higher confidence for more specific place types
    if (types.includes('street_address') || types.includes('premise')) {
      return 0.95;
    } else if (types.includes('transit_station') || types.includes('point_of_interest')) {
      return 0.9;
    } else if (types.includes('route') || types.includes('intersection')) {
      return 0.8;
    } else if (types.includes('neighborhood') || types.includes('sublocality')) {
      return 0.7;
    } else if (types.includes('locality') || types.includes('postal_code')) {
      return 0.6;
    } else {
      return 0.5;
    }
  }

  // Validate if coordinates are within Greater London
  isWithinLondon(lat: number, lon: number): boolean {
    // Approximate bounds of Greater London
    const bounds = {
      north: 51.6919,
      south: 51.2868,
      east: 0.3340,
      west: -0.5103,
    };

    return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east;
  }

  // Format coordinates for TFL API
  formatForTFL(lat: number, lon: number): string {
    return `${lat.toFixed(6)},${lon.toFixed(6)}`;
  }
}

// Create and export singleton instance
export const geocodingService = new GeocodingService();

// Export class for testing
export { GeocodingService };
