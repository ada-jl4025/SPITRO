"use client";

import { useState, useEffect, useCallback } from 'react';
import { geolocationService } from '@/lib/geolocation';
import type { UserLocation, LocationPermissionState } from '@/types';

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoRequest?: boolean;
}

interface UseGeolocationReturn {
  location: UserLocation | null;
  error: Error | null;
  loading: boolean;
  permissionState: LocationPermissionState;
  requestLocation: () => Promise<UserLocation | null>;
  watchLocation: () => void;
  stopWatching: () => void;
  isSupported: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>({
    granted: false,
    denied: false,
    prompt: true,
  });
  const [watchId, setWatchId] = useState<number | null>(null);

  const isSupported = geolocationService.isSupported();

  // Check permission state on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (!isSupported) return;
      
      const state = await geolocationService.getPermissionState();
      setPermissionState(state);
      
      // Auto-request location if permission is granted and autoRequest is true
      if (state.granted && options.autoRequest) {
        requestLocation();
      }
    };

    checkPermission();
  }, [isSupported, options.autoRequest]);

  // Request location once
  const requestLocation = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Geolocation is not supported by this browser');
      setError(err);
      throw err;
    }

    setLoading(true);
    setError(null);

    try {
      const userLocation = await geolocationService.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge,
      });
      
      setLocation(userLocation);
      
      // Update permission state after successful request
      const state = await geolocationService.getPermissionState();
      setPermissionState(state);
      return userLocation;
    } catch (err) {
      setError(err as Error);
      
      // Update permission state after error
      const state = await geolocationService.getPermissionState();
      setPermissionState(state);
      
      // Try IP-based fallback if permission was denied
      if (state.denied) {
        try {
          const ipLocation = await geolocationService.getLocationFromIP();
          if (ipLocation) {
            setLocation(ipLocation);
            setError(null);
            return ipLocation;
          }
        } catch (ipError) {
          console.error('IP geolocation fallback failed:', ipError);
        }
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [isSupported, options.enableHighAccuracy, options.timeout, options.maximumAge]);

  // Watch location changes
  const watchLocation = useCallback(() => {
    if (!isSupported) {
      setError(new Error('Geolocation is not supported'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const id = geolocationService.watchPosition(
        (userLocation) => {
          setLocation(userLocation);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge,
        }
      );
      
      setWatchId(id);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [isSupported, options.enableHighAccuracy, options.timeout, options.maximumAge]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      geolocationService.clearWatch();
      setWatchId(null);
    }
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        geolocationService.clearWatch();
      }
    };
  }, [watchId]);

  return {
    location,
    error,
    loading,
    permissionState,
    requestLocation,
    watchLocation,
    stopWatching,
    isSupported,
  };
}

// Helper hook to get nearest stations
export function useNearestStations(location: UserLocation | null, radius: number = 1000) {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!location) {
      setStations([]);
      return;
    }

    const fetchNearbyStations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/stations/nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: location.latitude,
            lon: location.longitude,
            radius,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch nearby stations');
        }

        const data = await response.json();
        setStations(data.stations || []);
      } catch (err) {
        setError(err as Error);
        setStations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyStations();
  }, [location, radius]);

  return { stations, loading, error };
}
