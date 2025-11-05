// General application types

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}

export interface LocationPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface JourneySearchParams {
  naturalLanguageQuery?: string;
  from?: string;
  to?: string;
  via?: string[];
  departureTime?: Date;
  arrivalTime?: Date;
  preferences?: JourneyPreferences;
}

export interface JourneyPreferences {
  modes?: TransportMode[];
  accessibility?: AccessibilityOption[];
  maxWalkingMinutes?: number;
  avoidStations?: string[];
  avoidLines?: string[];
}

export type TransportMode = 'tube' | 'bus' | 'dlr' | 'overground' | 'tram' | 'river-bus' | 'cable-car' | 'coach' | 'walking' | 'cycle';

export type AccessibilityOption = 'step-free-platform' | 'step-free-vehicle' | 'wheelchair' | 'audio-announcements' | 'visual-displays';

export interface SavedJourney {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  timestamp: number;
  isFavorite?: boolean;
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  type: 'natural-language' | 'station-to-station';
}

export interface ServiceStatusSummary {
  mode: TransportMode;
  overallStatus: 'good-service' | 'minor-delays' | 'severe-delays' | 'part-closure' | 'planned-closure' | 'suspended';
  affectedLines: string[];
  lastUpdated: Date;
}

export interface StationInfo {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  modes: TransportMode[];
  zones: string[];
  facilities: StationFacility[];
  accessibility: StationAccessibility;
}

export interface StationFacility {
  type: 'toilet' | 'baby-changing' | 'waiting-room' | 'atm' | 'payphone' | 'car-park' | 'bicycle-park';
  available: boolean;
  paymentRequired?: boolean;
  note?: string;
}

export interface StationAccessibility {
  stepFreeAccess: 'full' | 'partial' | 'none';
  platformToTrain: 'level' | 'small-gap' | 'large-gap';
  audioAnnouncements: boolean;
  visualDisplays: boolean;
  tactilePlatformEdges: boolean;
  inductionLoop: boolean;
  accessibleTicketMachines: boolean;
  staffAssistance: {
    available: boolean;
    hours?: string;
  };
}

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

// Voice input types
export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  error?: string;
  confidence?: number;
}

// UI State types
export interface UIState {
  inputMode: 'natural-language' | 'manual-selection';
  isLoading: boolean;
  showLocationPermission: boolean;
  selectedTab?: string;
}

// Notification types
export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}
