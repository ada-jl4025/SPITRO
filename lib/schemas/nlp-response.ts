// TypeScript schemas for LLM responses

export type IntentType = "journey_planning" | "status_query" | "station_info" | "accessibility_info";

export interface LocationInfo {
  name?: string;
  useCurrentLocation?: boolean;
  confidence: number;
}

export interface ViaLocation {
  name: string;
  confidence: number;
}

export interface TimePreference {
  type: "depart" | "arrive";
  datetime?: string; // ISO 8601 format
}

export interface JourneyPreferences {
  mode?: string[]; // ["tube", "bus", "dlr", "overground", "tram", "river-bus", "walking", "national-rail"]
  accessibility?: string[]; // ["step-free-platform", "step-free-vehicle", "wheelchair", "audio", "visual"]
  avoid?: string[]; // Stations or lines to avoid
  time?: TimePreference;
  walkingSpeed?: 'slow' | 'average' | 'fast';
  journeyPreference?: 'least-time' | 'least-interchange' | 'least-walking';
  maxWalkingMinutes?: number;
  maxTransferMinutes?: number;
  // How to treat listed modes: "only" to restrict strictly; "prefer" to bias results but allow others
  modePolicy?: 'only' | 'prefer';
}

export interface JourneyInfo {
  from?: LocationInfo;
  to?: LocationInfo;
  via?: ViaLocation[];
  preferences?: JourneyPreferences;
}

export interface StatusQuery {
  lines?: string[]; // Specific lines to check
  stations?: string[]; // Specific stations
  mode?: string; // Transport mode
}

export interface NLPJourneyIntent {
  type: IntentType;
  journey?: JourneyInfo;
  statusQuery?: StatusQuery;
  rawQuery: string; // Original user input
  intent_confidence: number; // Overall confidence (0-1)
  ambiguities?: string[]; // Unclear parts needing clarification
}

// Station Resolution Schema
export interface StationCoordinates {
  lat: number;
  lon: number;
}

export interface StationResult {
  id: string; // TFL StopPoint ID
  name: string; // Display name
  modes: string[]; // Available transport modes
  coordinates: StationCoordinates;
  distance?: number; // Distance from user if geolocated (in meters)
  zone?: string; // Transport zone
}

export type ResolutionMethod = "nlp" | "manual" | "geolocation";

export interface StationResolution {
  query: string;
  results: StationResult[];
  selectedStation?: string; // Final selected station ID
  method: ResolutionMethod;
}

// Validation helpers
export function isValidIntentType(type: string): type is IntentType {
  return ["journey_planning", "status_query", "station_info", "accessibility_info"].includes(type);
}

export function isValidTimeType(type: string): type is "depart" | "arrive" {
  return type === "depart" || type === "arrive";
}

export function isValidTransportMode(mode: string): boolean {
  const validModes = [
    "tube",
    "bus",
    "dlr",
    "overground",
    "tram",
    "river-bus",
    "cable-car",
    "coach",
    "walking",
    "national-rail",
    "cycle"
  ];
  return validModes.includes(mode.toLowerCase());
}

// Type guards
export function isJourneyPlanningIntent(intent: NLPJourneyIntent): boolean {
  return intent.type === "journey_planning" && !!intent.journey;
}

export function isStatusQueryIntent(intent: NLPJourneyIntent): boolean {
  return intent.type === "status_query" && !!intent.statusQuery;
}

// Helper to create a default intent when parsing fails
export function createDefaultIntent(query: string): NLPJourneyIntent {
  return {
    type: "journey_planning",
    rawQuery: query,
    intent_confidence: 0,
    ambiguities: ["Could not understand the query. Please try rephrasing."],
  };
}

// System prompt for Azure OpenAI to ensure structured output
export const NLP_SYSTEM_PROMPT = `You are a TFL journey planning assistant. Every location mentioned is within London. Expand shorthand or abbreviated place names to their most likely full forms (e.g. "IC White City" → "Imperial College London White City Campus"). Parse user queries about London public transport and return ONLY valid JSON matching this TypeScript interface:

interface NLPJourneyIntent {
  type: "journey_planning" | "status_query" | "station_info" | "accessibility_info";
  journey?: {
    from?: {
      name?: string;
      useCurrentLocation?: boolean;
      confidence: number; // 0-1
    };
    to?: {
      name: string;
      confidence: number;
    };
    via?: Array<{
      name: string;
      confidence: number;
    }>;
    preferences?: {
      mode?: string[]; // ["tube", "bus", "dlr", "overground", "tram", "river-bus", "walking", "national-rail"]
      accessibility?: string[]; // ["step-free-platform", "step-free-vehicle", "wheelchair", "audio", "visual"]
      walkingSpeed?: 'slow' | 'average' | 'fast';
      journeyPreference?: 'least-time' | 'least-interchange' | 'least-walking';
      maxWalkingMinutes?: number;
      maxTransferMinutes?: number;
      modePolicy?: 'only' | 'prefer';
      avoid?: string[];
      time?: {
        type: "depart" | "arrive";
        datetime?: string; // ISO 8601
      };
    };
  };
  statusQuery?: {
    lines?: string[];
    stations?: string[];
    mode?: string;
  };
  rawQuery: string;
  intent_confidence: number;
  ambiguities?: string[];
}

Rules:
1. If only a destination is mentioned, set from.useCurrentLocation = true
2. Extract station/location names as accurately as possible
3. Set confidence based on how clear the location/intent is
4. List any ambiguities that need clarification
5. For status queries, extract specific line names or stations
6. Always include the original query in rawQuery
7. If a location appears abbreviated, expand it to its most likely full London location name
8. Interpret transport modes and accessibility precisely:
   - If the query says "X only" (or synonyms: just, strictly, exclusively, nothing but), set journey.preferences.mode to ONLY those modes and set modePolicy = "only".
   - If one or more modes are mentioned without "only" (e.g., prefer/ideally/if possible), set journey.preferences.mode to the mentioned modes and set modePolicy = "prefer".
   - Allowed mode values: ["tube","bus","dlr","overground","tram","river-bus","walking","national-rail"].
   - Map synonyms: "underground"/"subway"/"metro" → "tube"; "river bus"/"riverbus"/"thames clippers" → "river-bus"; "national rail"/"NR" → "national-rail"; "walk"/"on foot" → "walking".
   - If the query mentions accessibility "step-free to platform", include "step-free-platform" in journey.preferences.accessibility.
   - If it mentions "step-free to vehicle", include "step-free-vehicle" in journey.preferences.accessibility.
9. Include additional preferences when present: walkingSpeed (slow/average/fast), journeyPreference (least-time/least-interchange/least-walking), maxWalkingMinutes, maxTransferMinutes.
10. When a time is specified, include { time: { type, datetime }} with ISO 8601 datetime.
11. Support one optional via station in journey.via (first only if multiple are mentioned).
12. Return ONLY valid JSON, no additional text

Examples (inputs → key fields):
- "Tube only from Canary Wharf to Oxford Circus" → { journey: { from: {name:"Canary Wharf"}, to: {name:"Oxford Circus"}, preferences: { mode: ["tube"], modePolicy: "only" } } }
- "Bus and DLR only from Greenwich to Lewisham" → { journey: { preferences: { mode: ["bus","dlr"], modePolicy: "only" } } }
- "Prefer bus from Clapham Junction to Waterloo" → { journey: { preferences: { mode: ["bus"], modePolicy: "prefer" } } }
- "Step-free to platform from Victoria to Westminster" → { journey: { preferences: { accessibility: ["step-free-platform"] } } }
- "Step-free to vehicle from Euston to Bank" → { journey: { preferences: { accessibility: ["step-free-vehicle"] } } }
- "National Rail from Clapham Junction to Waterloo" → { journey: { preferences: { mode: ["national-rail"] } } }
- "Walking only from Hammersmith to Shepherd's Bush" → { journey: { preferences: { mode: ["walking"] } } }
- "From Holborn to Liverpool Street via Farringdon" → { journey: { via: [{name:"Farringdon"}] } }`;
