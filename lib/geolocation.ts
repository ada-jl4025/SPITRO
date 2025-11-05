import type { UserLocation, LocationPermissionState } from '@/types';

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

class GeolocationService {
  private watchId: number | null = null;
  private lastKnownLocation: UserLocation | null = null;

  // Check if geolocation is supported
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  // Get permission state
  async getPermissionState(): Promise<LocationPermissionState> {
    if (!this.isSupported()) {
      return { granted: false, denied: true, prompt: false };
    }

    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        
        return {
          granted: result.state === 'granted',
          denied: result.state === 'denied',
          prompt: result.state === 'prompt',
        };
      }

      // Fallback: try to get location to determine permission
      // This will trigger permission prompt if not already granted/denied
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve({ granted: true, denied: false, prompt: false }),
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              resolve({ granted: false, denied: true, prompt: false });
            } else {
              resolve({ granted: false, denied: false, prompt: true });
            }
          },
          { timeout: 100 } // Quick timeout to just check permission
        );
      });
    } catch (error) {
      console.error('Error checking geolocation permission:', error);
      return { granted: false, denied: false, prompt: true };
    }
  }

  // Get current position
  async getCurrentPosition(options?: GeolocationOptions): Promise<UserLocation> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          
          this.lastKnownLocation = location;
          resolve(location);
        },
        (error) => {
          reject(this.handleGeolocationError(error));
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 60000, // 1 minute
        }
      );
    });
  }

  // Watch position changes
  watchPosition(
    callback: (location: UserLocation) => void,
    errorCallback?: (error: Error) => void,
    options?: GeolocationOptions
  ): number {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Clear existing watch if any
    this.clearWatch();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        this.lastKnownLocation = location;
        callback(location);
      },
      (error) => {
        const err = this.handleGeolocationError(error);
        if (errorCallback) {
          errorCallback(err);
        }
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 30000, // 30 seconds
      }
    );

    return this.watchId;
  }

  // Clear watch
  clearWatch(): void {
    if (this.watchId !== null && this.isSupported()) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Get last known location (cached)
  getLastKnownLocation(): UserLocation | null {
    return this.lastKnownLocation;
  }

  // Estimate location from IP (fallback)
  async getLocationFromIP(): Promise<UserLocation | null> {
    try {
      // Using a free IP geolocation service as fallback
      // Note: This is less accurate than GPS
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error('Failed to get location from IP');
      }

      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        const location: UserLocation = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          accuracy: 5000, // 5km accuracy for IP-based location
          timestamp: Date.now(),
        };
        
        return location;
      }

      return null;
    } catch (error) {
      console.error('Error getting location from IP:', error);
      return null;
    }
  }

  // Calculate distance between two points (in meters)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Format distance for display
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  // Check if location is within London
  isInLondon(lat: number, lon: number): boolean {
    // Central London coordinates
    const londonLat = 51.5074;
    const londonLon = -0.1276;
    
    // Check if within ~50km of Central London
    const distance = this.calculateDistance(lat, lon, londonLat, londonLon);
    return distance < 50000; // 50km
  }

  // Handle geolocation errors
  private handleGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Location permission denied. Please enable location services.');
      case error.POSITION_UNAVAILABLE:
        return new Error('Location information is unavailable. Please try again.');
      case error.TIMEOUT:
        return new Error('Location request timed out. Please try again.');
      default:
        return new Error('An unknown error occurred while getting location.');
    }
  }

  // Request permission explicitly (useful for better UX)
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Attempt to get location which will trigger permission prompt
      await this.getCurrentPosition({ timeout: 5000 });
      return true;
    } catch (error) {
      // Check if it was a permission denial
      if (error instanceof Error && error.message.includes('permission denied')) {
        return false;
      }
      // Other errors don't necessarily mean permission was denied
      throw error;
    }
  }
}

// Create and export singleton instance
export const geolocationService = new GeolocationService();

// Export class for testing
export { GeolocationService };
