// TFL API Type Definitions

// Common types
export interface Point {
  lat: number;
  lon: number;
}

export interface Identifier {
  id: string;
  name: string;
  uri: string;
  type: string;
  crowding?: {
    passengerFlows?: PassengerFlow[];
    trainLoadings?: TrainLoading[];
  };
}

// Stop Point types
export interface StopPoint {
  id: string;
  naptanId: string;
  stationNaptan?: string;
  commonName: string;
  placeType: string;
  additionalProperties?: AdditionalProperty[];
  lat: number;
  lon: number;
  modes: string[];
  icsCode?: string;
  stopType?: string;
  zone?: string;
  lines?: Line[];
  status?: boolean;
  lineGroup?: LineGroup[];
  lineModeGroups?: LineModeGroup[];
}

export interface AdditionalProperty {
  category: string;
  key: string;
  sourceSystemKey: string;
  value: string;
}

export interface Line {
  id: string;
  name: string;
  uri: string;
  type: string;
  routeType: string;
  status: string;
}

export interface LineGroup {
  naptanIdReference: string;
  stationAtcoCode: string;
  lineIdentifier: string[];
}

export interface LineModeGroup {
  modeName: string;
  lineIdentifier: string[];
}

// Journey Planning types
export interface JourneyPlannerResult {
  journeys: Journey[];
  lines: Line[];
  searchCriteria: SearchCriteria;
  recommendedMaxAgeMinutes: number;
}

export interface Journey {
  startDateTime: string;
  duration: number;
  arrivalDateTime: string;
  legs: Leg[];
  fare?: Fare;
}

export interface Leg {
  duration: number;
  instruction: Instruction;
  departureTime: string;
  arrivalTime: string;
  departurePoint: StopPoint;
  arrivalPoint: StopPoint;
  path: Path;
  routeOptions?: RouteOption[];
  mode: Mode;
  disruptions?: Disruption[];
  plannedWorks?: PlannedWork[];
  distance?: number;
}

export interface Instruction {
  summary: string;
  detailed: string;
  steps: Step[];
}

export interface Step {
  description: string;
  turnDirection?: string;
  streetName?: string;
  distance?: number;
  cumulativeDistance?: number;
  skyDirection?: number;
  skyDirectionDescription?: string;
  cumulativeTravelTime?: number;
}

export interface Path {
  lineString: string;
  stopPoints: StopPoint[];
  elevation: number[];
}

export interface RouteOption {
  name: string;
  directions: string[];
  lineIdentifier?: Identifier;
}

export interface Mode {
  id: string;
  name: string;
  type: string;
  routeType: string;
  status?: string;
  primaryAreaName?: string;
  secondaryAreaName?: string;
}

export interface Disruption {
  category: string;
  type: string;
  categoryDescription: string;
  description: string;
  additionalInfo?: string;
  created?: string;
  lastUpdate?: string;
}

export interface PlannedWork {
  id: string;
  description: string;
  created?: string;
  lastUpdate?: string;
  url?: string;
}

export interface Fare {
  totalCost: number;
  fares: FareDetail[];
  caveats: FareCaveat[];
}

export interface FareDetail {
  lowZone: number;
  highZone: number;
  cost: number;
  chargeProfileName: string;
  isHopperFare: boolean;
  chargeLevel: string;
  peak: number;
  offPeak: number;
}

export interface FareCaveat {
  text: string;
  type: string;
}

export interface SearchCriteria {
  dateTime: string;
  dateTimeType: string;
  timeAdjustments?: TimeAdjustments;
}

export interface TimeAdjustments {
  earliest: TimeAdjustment;
  earlier: TimeAdjustment;
  later: TimeAdjustment;
  latest: TimeAdjustment;
}

export interface TimeAdjustment {
  date: string;
  time: string;
  timeIs: string;
  uri: string;
}

// Arrival Prediction types
export interface Prediction {
  id: string;
  operationType: number;
  vehicleId: string;
  naptanId: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  bearing: string;
  destinationNaptanId: string;
  destinationName: string;
  timestamp: string;
  timeToStation: number;
  currentLocation: string;
  towards: string;
  expectedArrival: string;
  timeToLive: string;
  modeName: string;
}

// Line Status types
export interface LineStatus {
  id: string;
  name: string;
  modeName: string;
  disruptions: Disruption[];
  created: string;
  modified: string;
  lineStatuses: LineStatusInfo[];
  routeSections: RouteSection[];
  serviceTypes: ServiceType[];
  crowding?: Crowding;
}

export interface LineStatusInfo {
  id: number;
  statusSeverity: number;
  statusSeverityDescription: string;
  created: string;
  validityPeriods: ValidityPeriod[];
  disruption?: Disruption;
}

export interface ValidityPeriod {
  fromDate: string;
  toDate: string;
  isNow: boolean;
}

export interface RouteSection {
  name: string;
  direction: string;
  routeCode: string;
  originationName: string;
  destinationName: string;
  validTo: string;
  validFrom: string;
}

export interface ServiceType {
  name: string;
  uri: string;
}

export interface Crowding {
  passengerFlows?: PassengerFlow[];
  trainLoadings?: TrainLoading[];
}

export interface PassengerFlow {
  timeSlice: string;
  value: number;
}

export interface TrainLoading {
  line: string;
  direction: string;
  dayOfWeek: string;
  peakTime: string;
  trainLoading: number;
}

// API Response types
export interface TflApiError {
  timestampUtc: string;
  exceptionType: string;
  httpStatusCode: number;
  httpStatus: string;
  relativeUri: string;
  message: string;
}

// Helper types for API parameters
export interface JourneyPlannerParams {
  from: string; // lat,lon or StopPoint ID
  to: string; // lat,lon or StopPoint ID
  via?: string;
  nationalSearch?: boolean;
  date?: string;
  time?: string;
  timeIs?: 'Arriving' | 'Departing';
  journeyPreference?: 'LeastInterchange' | 'LeastTime' | 'LeastWalking';
  accessibilityPreference?: 'NoRequirements' | 'NoSolidStairs' | 'NoEscalators' | 'NoElevators' | 'StepFreeToVehicle' | 'StepFreeToPlatform';
  fromName?: string;
  toName?: string;
  viaName?: string;
  maxTransferMinutes?: number;
  maxWalkingMinutes?: number;
  walkingSpeed?: 'Slow' | 'Average' | 'Fast';
  cyclePreference?: 'None' | 'Regular' | 'Moderate' | 'Fast';
  bikeProficiency?: 'Easy' | 'Moderate' | 'Fast';
  mode?: string[]; // comma-separated list of modes
  alternativeRoute?: boolean;
  alternativeCycle?: boolean;
  applyHtmlMarkup?: boolean;
}
