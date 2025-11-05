import { config } from './config';
import type {
  StopPoint,
  JourneyPlannerResult,
  JourneyPlannerParams,
  Prediction,
  LineStatus,
  TflApiError,
} from '@/types/tfl';

class TFLApiClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = config.tfl.baseUrl;
    this.apiKey = config.tfl.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            url.searchParams.append(key, value.join(','));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    // Add API key if available
    if (this.apiKey) {
      url.searchParams.append('app_key', this.apiKey);
    }

    return url.toString();
  }

  private async fetchApi<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const error: TflApiError = await response.json();
        throw new Error(error.message || `TFL API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('TFL API fetch error:', error);
      throw error;
    }
  }

  // Journey Planning
  async planJourney(params: JourneyPlannerParams): Promise<JourneyPlannerResult> {
    const endpoint = `/Journey/JourneyResults/${params.from}/to/${params.to}`;
    
    // Remove from and to from params as they're in the URL
    const { from, to, ...queryParams } = params;
    
    return this.fetchApi<JourneyPlannerResult>(endpoint, queryParams);
  }

  // Stop Point Search
  async searchStopPoints(query: string, modes?: string[]): Promise<StopPoint[]> {
    const params: Record<string, any> = {
      query,
      maxResults: 20,
    };

    if (modes && modes.length > 0) {
      params.modes = modes;
    }

    const response = await this.fetchApi<{ matches: StopPoint[] }>('/StopPoint/Search', params);
    return response.matches || [];
  }

  // Get Stop Point by ID
  async getStopPoint(id: string): Promise<StopPoint> {
    return this.fetchApi<StopPoint>(`/StopPoint/${id}`);
  }

  // Get Nearby Stop Points
  async getNearbyStopPoints(
    lat: number,
    lon: number,
    radius: number = 500,
    modes?: string[],
    categories?: string[]
  ): Promise<StopPoint[]> {
    const params: Record<string, any> = {
      lat,
      lon,
      radius,
      stopTypes: 'NaptanMetroStation,NaptanRailStation,NaptanBusCoachStation,NaptanFerryPort,NaptanPublicBusCoachTram',
    };

    if (modes && modes.length > 0) {
      params.modes = modes;
    }

    if (categories && categories.length > 0) {
      params.categories = categories;
    }

    const response = await this.fetchApi<{ stopPoints: StopPoint[] }>('/StopPoint', params);
    return response.stopPoints || [];
  }

  // Arrivals
  async getArrivals(stopPointId: string): Promise<Prediction[]> {
    return this.fetchApi<Prediction[]>(`/StopPoint/${stopPointId}/Arrivals`);
  }

  // Get arrivals for multiple stop points
  async getMultipleArrivals(stopPointIds: string[]): Promise<Prediction[]> {
    if (stopPointIds.length === 0) return [];
    
    const ids = stopPointIds.join(',');
    return this.fetchApi<Prediction[]>(`/StopPoint/${ids}/Arrivals`);
  }

  // Get arrivals for specific lines
  async getLineArrivals(lineIds: string[], stopPointId?: string): Promise<Prediction[]> {
    if (lineIds.length === 0) return [];

    const ids = lineIds.join(',');
    const params: Record<string, any> = {};

    if (stopPointId) {
      params.stopPointId = stopPointId;
    }

    return this.fetchApi<Prediction[]>(`/Line/${ids}/Arrivals`, params);
  }

  // Line Status
  async getLineStatus(modes?: string[]): Promise<LineStatus[]> {
    let endpoint = '/Line/Mode';
    
    if (modes && modes.length > 0) {
      endpoint += `/${modes.join(',')}/Status`;
    } else {
      // Get all modes
      endpoint += '/tube,bus,dlr,overground,tram,river-bus,cable-car/Status';
    }

    return this.fetchApi<LineStatus[]>(endpoint);
  }

  // Get status for specific lines
  async getSpecificLineStatus(lineIds: string[]): Promise<LineStatus[]> {
    if (lineIds.length === 0) return [];
    
    const ids = lineIds.join(',');
    return this.fetchApi<LineStatus[]>(`/Line/${ids}/Status`);
  }

  // Get all tube lines
  async getTubeLines(): Promise<LineStatus[]> {
    return this.fetchApi<LineStatus[]>('/Line/Mode/tube');
  }

  // Get disruptions for all modes
  async getDisruptions(modes?: string[]): Promise<LineStatus[]> {
    let endpoint = '/Line/Mode';
    
    if (modes && modes.length > 0) {
      endpoint += `/${modes.join(',')}/Disruption`;
    } else {
      endpoint = '/Line/Disruption';
    }

    return this.fetchApi<LineStatus[]>(endpoint);
  }

  // Search for a place/POI
  async searchPlace(name: string, types?: string[]): Promise<any[]> {
    const params: Record<string, any> = {
      name,
    };

    if (types && types.length > 0) {
      params.types = types;
    }

    const response = await this.fetchApi<{ matches: any[] }>('/Place/Search', params);
    return response.matches || [];
  }

  // Get place information
  async getPlace(id: string): Promise<any> {
    return this.fetchApi<any>(`/Place/${id}`);
  }

  // Get route sequence for a line
  async getRouteSequence(lineId: string, direction: 'inbound' | 'outbound'): Promise<any> {
    return this.fetchApi<any>(`/Line/${lineId}/Route/Sequence/${direction}`);
  }

  // Utility method to format stop point ID for journey planning
  formatStopPointForJourney(stopPoint: StopPoint): string {
    // For journey planning, TFL accepts either coordinates or stop point IDs
    // Using coordinates is more flexible as it works for any location
    return `${stopPoint.lat},${stopPoint.lon}`;
  }

  // Utility method to check if service is good
  isGoodService(lineStatus: LineStatus): boolean {
    return lineStatus.lineStatuses.every(status => status.statusSeverity === 10);
  }

  // Get severity description
  getSeverityDescription(severity: number): string {
    const severityMap: Record<number, string> = {
      0: 'Special Service',
      1: 'Closed',
      2: 'Suspended',
      3: 'Part Suspended',
      4: 'Planned Closure',
      5: 'Part Closure',
      6: 'Severe Delays',
      7: 'Reduced Service',
      8: 'Bus Service',
      9: 'Minor Delays',
      10: 'Good Service',
      11: 'Part Closed',
      12: 'Exit Only',
      13: 'No Step Free Access',
      14: 'Change of frequency',
      15: 'Diverted',
      16: 'Not Running',
      17: 'Issues Reported',
      18: 'No Issues',
      19: 'Information',
      20: 'Service Closed',
    };

    return severityMap[severity] || 'Unknown';
  }
}

// Create and export a singleton instance
export const tflClient = new TFLApiClient();

// Export the class for testing purposes
export { TFLApiClient };
