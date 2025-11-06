import { NextRequest, NextResponse } from 'next/server';
import { tflClient } from '@/lib/tfl-client';
import { nationalRailClient } from '@/lib/national-rail-client';
import { aiClient } from '@/lib/ai-client';
import { geocodingService } from '@/lib/geocoding';
import type { JourneySearchParams, ApiResponse } from '@/types';
import type { NLPJourneyIntent, StationResolution } from '@/lib/schemas/nlp-response';
import type {
  JourneyPlannerParams,
  JourneyPlannerResult,
  Journey,
  Leg,
  Prediction,
  StopPoint,
} from '@/types/tfl';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

type LegEnhancements = {
  fromName?: string;
  toName?: string;
  platformName?: string;
  direction?: string;
  googleMapsUrl?: string;
  distanceSummary?: string;
  nextArrivals?: Array<{
    id: string;
    destinationName: string;
    expectedArrival: string;
    timeToStation: number;
    platformName?: string;
    towards?: string;
  }>;
};

const isWalkingLeg = (leg: Leg) => leg.mode.id === 'walking';

const extractCrsFromStopPoint = (stopPoint?: StopPoint): string | undefined => {
  if (!stopPoint) return undefined;

  // 1) Direct CRS in ICS when present (rare)
  const ics = stopPoint.icsCode;
  if (ics && /^[A-Z]{3}$/.test(ics)) {
    return ics.toUpperCase();
  }

  // 2) Additional properties sometimes include 'Crs' or 'CrsCode'
  const props = stopPoint.additionalProperties || [];
  for (const p of props) {
    const key = (p.key || '').toLowerCase();
    if (key === 'crs' || key === 'crscode') {
      const val = String(p.value || '').toUpperCase();
      if (/^[A-Z]{3}$/.test(val)) return val;
    }
  }

  // 3) Derive from NaPTAN ID. For National Rail, many station NaPTANs start with '910G' followed by the 3-letter CRS.
  // Example: '910GKGX' -> CRS 'KGX'
  const naptanId = stopPoint.naptanId || stopPoint.id || '';
  const match = /^910G([A-Z]{3})/i.exec(naptanId);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  // 4) Try parent station id as a last resort
  const parent = stopPoint.stationNaptan || '';
  const parentMatch = /^910G([A-Z]{3})/i.exec(parent);
  if (parentMatch && parentMatch[1]) {
    return parentMatch[1].toUpperCase();
  }

  return undefined;
};

const buildGoogleMapsUrl = (leg: Leg): string | undefined => {
  const fromLat = leg.departurePoint?.lat;
  const fromLon = leg.departurePoint?.lon;
  const toLat = leg.arrivalPoint?.lat;
  const toLon = leg.arrivalPoint?.lon;

  if (
    typeof fromLat === 'number' &&
    typeof fromLon === 'number' &&
    typeof toLat === 'number' &&
    typeof toLon === 'number'
  ) {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}&travelmode=walking`;
  }

  return undefined;
};

const formatDistanceSummary = (leg: Leg): string | undefined => {
  if (typeof leg.distance === 'number' && leg.distance > 0) {
    const metres = Math.round(leg.distance);
    if (metres >= 1000) {
      return `${(metres / 1000).toFixed(1)} km`;
    }
    return `${metres} m`;
  }

  return undefined;
};

const enhanceLegsWithArrivals = async (journey: Journey): Promise<Array<Leg & { enhancements?: LegEnhancements }>> => {
  const nonWalkingLegs = journey.legs.filter((leg) => !isWalkingLeg(leg));
  const stopPointIds = new Set<string>();
  const nrCrsSet = new Set<string>();

  const legDescriptors = nonWalkingLegs.map((leg) => {
    const stopPointId = leg.departurePoint?.naptanId || leg.departurePoint?.id;
    const parentStationId = leg.departurePoint?.stationNaptan;
    const lineId = leg.routeOptions?.[0]?.lineIdentifier?.id || leg.mode?.id || leg.mode?.name;

    if (stopPointId) {
      stopPointIds.add(stopPointId);
    }
    if (parentStationId) {
      stopPointIds.add(parentStationId);
    }

    if (leg.mode?.id === 'national-rail') {
      const crs = extractCrsFromStopPoint(leg.departurePoint) || extractCrsFromStopPoint(leg.arrivalPoint);
      if (crs) nrCrsSet.add(crs);
    }

    return {
      leg,
      stopPointId,
      parentStationId,
      lineId: lineId ? lineId.toLowerCase() : undefined,
    } as const;
  });

  let arrivals: Prediction[] = [];
  const nrByCrs = new Map<string, { id: string; destinationName: string; expectedArrival: string; timeToStation: number; platformName?: string; towards?: string; }[]>();

  if (stopPointIds.size > 0) {
    try {
      arrivals = await tflClient.getMultipleArrivals(Array.from(stopPointIds));
    } catch (error) {
      console.error('Failed to fetch arrivals for journey legs:', error);
      arrivals = [];
    }
  }

  const sortedArrivals = [...arrivals].sort((a, b) => a.timeToStation - b.timeToStation);

  // Pre-fetch NR departures if enabled
  if (nationalRailClient.isEnabled() && nrCrsSet.size > 0) {
    await Promise.all(
      Array.from(nrCrsSet).map(async (crs) => {
        try {
          const deps = await nationalRailClient.getNextDeparturesByCRS(crs, 3);
          nrByCrs.set(
            crs,
            deps.map((d) => ({
              id: d.id,
              destinationName: d.destinationName,
              expectedArrival: d.expectedArrival,
              timeToStation: d.timeToStation,
              platformName: d.platformName,
              towards: d.towards,
            }))
          );
        } catch (e) {
          console.warn('NR departures fetch failed for CRS', crs, e);
        }
      })
    );
  }

  const results = await Promise.all(journey.legs.map(async (leg) => {
    const fromName = leg.departurePoint?.commonName;
    const toName = leg.arrivalPoint?.commonName;

    const baseEnhancements: LegEnhancements = {
      fromName,
      toName,
      distanceSummary: formatDistanceSummary(leg),
    };

    if (isWalkingLeg(leg)) {
      baseEnhancements.googleMapsUrl = buildGoogleMapsUrl(leg);
      return {
        ...leg,
        enhancements: baseEnhancements,
      };
    }

    const descriptor = legDescriptors.find((item) => item.leg === leg);

    // If National Rail leg, prefer NR live departures using CRS
    if (leg.mode?.id === 'national-rail' && nationalRailClient.isEnabled()) {
      const crs = extractCrsFromStopPoint(leg.departurePoint) || extractCrsFromStopPoint(leg.arrivalPoint);
      if (crs && nrByCrs.has(crs)) {
        const deps = nrByCrs.get(crs) || [];
        baseEnhancements.nextArrivals = deps.slice(0, 3);
        baseEnhancements.platformName = deps[0]?.platformName || undefined;
      }
    }

    if (descriptor?.stopPointId) {
      const candidateStopIds = [descriptor.stopPointId, descriptor.parentStationId].filter(Boolean) as string[];
      const mapPrediction = (prediction: Prediction) => ({
        id: prediction.id,
        destinationName: prediction.destinationName,
        expectedArrival: prediction.expectedArrival,
        timeToStation: prediction.timeToStation,
        platformName: prediction.platformName,
        towards: prediction.towards || prediction.direction,
      });

      const filterFromCache = (preds: Prediction[]) => preds
        .filter((prediction) => candidateStopIds.includes(prediction.naptanId))
        .sort((a, b) => a.timeToStation - b.timeToStation);

      let relevantArrivals = [...(baseEnhancements.nextArrivals || [])] as ReturnType<typeof mapPrediction>[];

      // Prefer same line at the same stop/parent station
      if (descriptor.lineId) {
        if (relevantArrivals.length === 0) {
          relevantArrivals = filterFromCache(sortedArrivals)
            .filter((prediction) => prediction.lineId?.toLowerCase() === descriptor.lineId)
            .slice(0, 3)
            .map(mapPrediction);
        }
      }

      // Fallback: any line from the same stop/parent station
      if (relevantArrivals.length === 0) {
        relevantArrivals = filterFromCache(sortedArrivals)
          .slice(0, 3)
          .map(mapPrediction);
      }

      // Final fallback: query line-specific arrivals for this stop
      if (relevantArrivals.length === 0 && descriptor.lineId) {
        try {
          const lineArrivals = await tflClient.getLineArrivals([descriptor.lineId], descriptor.stopPointId);
          const sortedLineArrivals = lineArrivals
            .filter((p) => candidateStopIds.includes(p.naptanId))
            .sort((a, b) => a.timeToStation - b.timeToStation);
          relevantArrivals = sortedLineArrivals.slice(0, 3).map(mapPrediction);
        } catch (e) {
          // Ignore and leave as empty if this also fails
        }
      }

      baseEnhancements.nextArrivals = relevantArrivals;
      baseEnhancements.platformName = relevantArrivals[0]?.platformName || undefined;
    }

    baseEnhancements.direction = leg.routeOptions?.[0]?.directions?.[0] || leg.instruction?.summary;

    return {
      ...leg,
      enhancements: baseEnhancements,
    };
  }));

  return results;
};

export async function POST(request: NextRequest) {
  try {
    const body: JourneySearchParams = await request.json();

    // Helpers: normalize modes/accessibility from either NL or request body
    const ALLOWED_MODES = [
      'tube',
      'bus',
      'dlr',
      'overground',
      'tram',
      'river-bus',
      'walking',
      'national-rail',
      'cable-car',
      'coach',
      'cycle',
    ];

    const DEFAULT_MODES = ['tube', 'bus', 'dlr', 'overground', 'walking', 'national-rail'] as const;

    const MODE_SYNONYMS: Record<string, string> = {
      underground: 'tube',
      subway: 'tube',
      metro: 'tube',
      'docklands light railway': 'dlr',
      riverbus: 'river-bus',
      'river bus': 'river-bus',
      'thames clipper': 'river-bus',
      'thames clippers': 'river-bus',
      walk: 'walking',
      'on foot': 'walking',
      nr: 'national-rail',
      'national rail': 'national-rail',
      rail: 'national-rail',
      train: 'national-rail',
      tram: 'tram',
      buses: 'bus',
      coach: 'coach',
      coaches: 'coach',
      bike: 'cycle',
      cycling: 'cycle',
      'cable car': 'cable-car',
      dlr: 'dlr',
      overground: 'overground',
      tube: 'tube',
      bus: 'bus',
    };

    const normalizeTransportModes = (modes?: string[] | null): string[] => {
      const input = Array.isArray(modes) ? modes : [];
      const normalized = input
        .map((m) => String(m || '').toLowerCase().trim())
        .filter(Boolean)
        .map((m) => MODE_SYNONYMS[m] || m)
        .filter((m) => ALLOWED_MODES.includes(m));
      return Array.from(new Set(normalized));
    };

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const extractModesFromQuery = (query: string): string[] => {
      if (!query) return [];
      const found = new Set<string>();
      const haystack = String(query).toLowerCase();
      const candidates = [
        ...Object.keys(MODE_SYNONYMS),
        ...ALLOWED_MODES,
      ];

      for (const key of candidates) {
        const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
        if (pattern.test(haystack)) {
          const mapped = MODE_SYNONYMS[key] || key;
          if (ALLOWED_MODES.includes(mapped)) {
            found.add(mapped);
          }
        }
      }

      return Array.from(found);
    };

    const normalizeAccessibilityOptions = (opts?: string[] | null): string[] => {
      const input = Array.isArray(opts) ? opts : [];
      const out: string[] = [];
      for (const raw of input) {
        const v = String(raw || '').toLowerCase().trim();
        if (!v) continue;
        if (v.includes('vehicle')) out.push('step-free-vehicle');
        else if (v.includes('platform')) out.push('step-free-platform');
        else if (v.includes('step-free')) out.push('step-free-vehicle');
        else if (v.includes('wheelchair')) out.push('step-free-vehicle');
        else if (v.includes('audio')) out.push('audio-announcements');
        else if (v.includes('visual')) out.push('visual-displays');
      }
      return Array.from(new Set(out));
    };

    const mapJourneyPreference = (pref?: string): 'LeastInterchange' | 'LeastTime' | 'LeastWalking' => {
      const p = (pref || '').toLowerCase();
      if (p === 'least-interchange') return 'LeastInterchange';
      if (p === 'least-walking') return 'LeastWalking';
      return 'LeastTime';
    };

    const mapWalkingSpeed = (speed?: string): 'Slow' | 'Average' | 'Fast' => {
      const s = (speed || '').toLowerCase();
      if (s === 'slow') return 'Slow';
      if (s === 'fast') return 'Fast';
      return 'Average';
    };

    const hasOnlyConstraint = (query?: string): boolean => {
      if (!query) return false;
      // Match common synonyms for "only"
      if (/\b(only|just|strictly|exclusively)\b/i.test(query)) return true;
      if (/\bnothing but\b/i.test(query)) return true;
      if (/\bno (other )?(modes?|transport)\b/i.test(query)) return true;
      return false;
    };

    const formatTfLDate = (d: Date): string => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}${mm}${dd}`;
    };

    const formatTfLTime = (d: Date): string => {
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${hh}${min}`;
    };

    let fromLocation: string | null = null;
    let toLocation: string | null = null;
    let fromName: string | undefined;
    let toName: string | undefined;
  let viaLocation: string | undefined;
  let viaName: string | undefined;

    // Process natural language query
    if (body.naturalLanguageQuery) {
      const originalQuery = body.naturalLanguageQuery;
      let currentQuery = originalQuery;
      let lastError: any = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          fromLocation = null;
          toLocation = null;
          fromName = undefined;
          toName = undefined;

          const nlpIntent: NLPJourneyIntent = await aiClient.parseJourneyIntent(currentQuery);

          if (nlpIntent.intent_confidence < 0.3) {
            return NextResponse.json<ApiResponse>({
              status: 'error',
              error: 'Could not understand your query. Please try rephrasing or use manual station selection.',
            }, { status: 400 });
          }

          if (nlpIntent.type !== 'journey_planning' || !nlpIntent.journey) {
            return NextResponse.json<ApiResponse>({
              status: 'error',
              error: 'This appears to be a service status query. Please use the status page.',
            }, { status: 400 });
          }

          if (nlpIntent.ambiguities && nlpIntent.ambiguities.length > 0) {
            const clarifyingQuestions = await aiClient.clarifyAmbiguousQuery(
              originalQuery,
              nlpIntent.ambiguities
            );

            return NextResponse.json<ApiResponse>({
              status: 'error',
              error: 'Need more information',
              data: {
                ambiguities: nlpIntent.ambiguities,
                suggestions: clarifyingQuestions,
              },
            }, { status: 400 });
          }

          // Resolve FROM
          if (nlpIntent.journey.from?.useCurrentLocation) {
            if (body.from) {
              if (body.from.includes(',')) {
                fromLocation = body.from;
                fromName = nlpIntent.journey.from?.name || 'Current location';
              } else {
                const fromStations = await tflClient.searchStopPoints(body.from);
                if (fromStations.length > 0) {
                  fromLocation = tflClient.formatStopPointForJourney(fromStations[0]);
                  fromName = fromStations[0].commonName;
                }
              }

              if (!fromLocation) {
                throw new Error(`Could not resolve starting location: ${body.from}`);
              }
            } else {
              throw new Error('location_required');
            }
          } else if (nlpIntent.journey.from?.name) {
            const enhancedFromName = await aiClient.enhanceLocationName(nlpIntent.journey.from.name);
            const fromStations = await tflClient.searchStopPoints(enhancedFromName);
            if (fromStations.length === 0) {
              const geocodeResults = await geocodingService.geocode(nlpIntent.journey.from.name);
              if (geocodeResults.length > 0) {
                fromLocation = `${geocodeResults[0].lat},${geocodeResults[0].lon}`;
                fromName = geocodeResults[0].name;
              } else {
                throw new Error(`Could not find location: ${nlpIntent.journey.from.name}`);
              }
            } else {
              fromLocation = tflClient.formatStopPointForJourney(fromStations[0]);
              fromName = fromStations[0].commonName;
            }
          }

          // Resolve TO
          if (!nlpIntent.journey.to?.name) {
            throw new Error('Destination is required');
          }
          const enhancedToName = await aiClient.enhanceLocationName(nlpIntent.journey.to.name);
          const toStations = await tflClient.searchStopPoints(enhancedToName);
          if (toStations.length === 0) {
            const geocodeResults = await geocodingService.geocode(nlpIntent.journey.to.name);
            if (geocodeResults.length > 0) {
              toLocation = `${geocodeResults[0].lat},${geocodeResults[0].lon}`;
              toName = geocodeResults[0].name;
            } else {
              throw new Error(`Could not find destination: ${nlpIntent.journey.to.name}`);
            }
          } else {
            toLocation = tflClient.formatStopPointForJourney(toStations[0]);
            toName = toStations[0].commonName;
          }

          if (!fromLocation || !toLocation) {
            throw new Error('Both starting point and destination are required');
          }

          // Resolve VIA (first via only, TfL supports a single via parameter)
          if (Array.isArray(nlpIntent.journey.via) && nlpIntent.journey.via.length > 0) {
            const viaCandidate = nlpIntent.journey.via[0]?.name?.trim();
            if (viaCandidate) {
              const enhancedViaName = await aiClient.enhanceLocationName(viaCandidate);
              const viaStations = await tflClient.searchStopPoints(enhancedViaName);
              if (viaStations.length === 0) {
                const geocodeResults = await geocodingService.geocode(viaCandidate);
                if (geocodeResults.length > 0) {
                  viaLocation = `${geocodeResults[0].lat},${geocodeResults[0].lon}`;
                  viaName = geocodeResults[0].name;
                }
              } else {
                viaLocation = tflClient.formatStopPointForJourney(viaStations[0]);
                viaName = viaStations[0].commonName;
              }
            }
          }

          // Derive preferences from request or NLP
          const nlModes = nlpIntent.journey.preferences?.mode;
          const nlAccessibility = nlpIntent.journey.preferences?.accessibility;
          const nlWalkingSpeed = (nlpIntent.journey.preferences as any)?.walkingSpeed as string | undefined;
          const nlJourneyPreference = (nlpIntent.journey.preferences as any)?.journeyPreference as string | undefined;
          const nlMaxWalkingMinutes = (nlpIntent.journey.preferences as any)?.maxWalkingMinutes as number | undefined;
          const nlMaxTransferMinutes = (nlpIntent.journey.preferences as any)?.maxTransferMinutes as number | undefined;
          const modesMentionedInQuery = normalizeTransportModes(extractModesFromQuery(originalQuery));
          const requestedModes = normalizeTransportModes(
            (body.preferences?.modes as string[] | undefined)
              || nlModes
              || (modesMentionedInQuery.length > 0 ? modesMentionedInQuery : [...DEFAULT_MODES])
          );
          const requestedAccessibility = normalizeAccessibilityOptions(
            (body.preferences?.accessibility as string[] | undefined) || nlAccessibility || []
          );

          const restrictToMentionedModes = hasOnlyConstraint(originalQuery)
            || nlpIntent.journey.preferences?.modePolicy === 'only';
          const allowedModes = restrictToMentionedModes
            ? requestedModes
            : (() => {
                const merged = Array.from(new Set([...(DEFAULT_MODES as unknown as string[]), ...requestedModes]));
                return normalizeTransportModes(merged);
              })();

          // Optional time preference (NLP)
          const nlpTime = nlpIntent.journey.preferences?.time;
          let dateParam: string | undefined;
          let timeParam: string | undefined;
          let timeIsParam: 'Arriving' | 'Departing' | undefined;
          if (nlpTime?.datetime) {
            const when = new Date(nlpTime.datetime);
            if (!isNaN(when.getTime())) {
              dateParam = formatTfLDate(when);
              timeParam = formatTfLTime(when);
              timeIsParam = (nlpTime.type === 'arrive') ? 'Arriving' : 'Departing';
            }
          }

          // Plan
          const journeyParams: JourneyPlannerParams = {
            from: fromLocation,
            to: toLocation,
            fromName,
            toName,
            nationalSearch: false,
            journeyPreference: mapJourneyPreference(body.preferences?.journeyPreference || nlJourneyPreference),
            accessibilityPreference: requestedAccessibility.includes('step-free-vehicle')
              ? 'StepFreeToVehicle'
              : requestedAccessibility.includes('step-free-platform')
              ? 'StepFreeToPlatform'
              : 'NoRequirements',
            mode: allowedModes,
            alternativeRoute: true,
            walkingSpeed: mapWalkingSpeed(body.preferences?.walkingSpeed || nlWalkingSpeed),
            ...(dateParam ? { date: dateParam } : {}),
            ...(timeParam ? { time: timeParam } : {}),
            ...(timeIsParam ? { timeIs: timeIsParam } : {}),
            ...(viaLocation ? { via: viaLocation } : {}),
            ...(viaName ? { viaName } : {}),
            ...(typeof (body.preferences?.maxWalkingMinutes ?? nlMaxWalkingMinutes) === 'number' ? { maxWalkingMinutes: (body.preferences?.maxWalkingMinutes ?? nlMaxWalkingMinutes) as number } : {}),
            ...(typeof (body.preferences?.maxTransferMinutes ?? nlMaxTransferMinutes) === 'number' ? { maxTransferMinutes: (body.preferences?.maxTransferMinutes ?? nlMaxTransferMinutes) as number } : {}),
          };

          const journeyResult = await tflClient.planJourney(journeyParams);
          if (!journeyResult?.journeys || journeyResult.journeys.length === 0) {
            throw new Error('No journeys found');
          }

          // Prefer mentioned modes if not restricted by "only": reorder journeys
          let orderedJourneys = [...journeyResult.journeys];
          if (!restrictToMentionedModes && requestedModes.length > 0) {
            const preferred = new Set(requestedModes);
            const score = (j: Journey) =>
              (Array.isArray(j.legs) ? j.legs : []).reduce((acc, leg) => acc + (preferred.has(leg.mode?.id) ? 2 : 0), 0);
            orderedJourneys.sort((a, b) => score(b) - score(a));
          }

          const journeysWithDescriptions = await Promise.all(
            orderedJourneys.slice(0, 3).map(async (journey) => {
              const [accessibleDescription, enhancedLegs] = await Promise.all([
                aiClient.generateAccessibleDescription(journey),
                enhanceLegsWithArrivals(journey),
              ]);
              return { ...journey, legs: enhancedLegs, accessibleDescription };
            })
          );

          return NextResponse.json<ApiResponse>({
            status: 'success',
            data: { ...journeyResult, journeys: journeysWithDescriptions, fromName, toName },
          });
        } catch (e: any) {
          lastError = e;
          if (attempt < 4) {
            // Ask LLM to refine intent with error context
            const errorText = typeof e?.message === 'string' ? e.message : String(e);
            const jsonFeedback = {
              lastError: errorText,
              guidance: 'Revise stations (must be valid/open), adjust modes/time to produce a feasible plan.',
              allowedModes: ALLOWED_MODES,
              defaultModes: DEFAULT_MODES,
            };
            currentQuery = `${originalQuery}\n\nJSON_FEEDBACK:\n${JSON.stringify(jsonFeedback)}\n\nPlease return updated intent JSON only.`;
            continue;
          }
          break;
        }
      }

      // If all attempts failed
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: lastError instanceof Error ? lastError.message : 'Failed to plan journey',
      }, { status: 400 });
    } else {
      // Manual station selection
      if (!body.to) {
        return NextResponse.json<ApiResponse>({
          status: 'error',
          error: 'Destination is required',
        }, { status: 400 });
      }

      // Handle FROM location
      if (body.from) {
        if (body.from.includes(',')) {
          // Already coordinates
          fromLocation = body.from;
        } else {
          // Search for station
          const fromStations = await tflClient.searchStopPoints(body.from);
          if (fromStations.length > 0) {
            fromLocation = tflClient.formatStopPointForJourney(fromStations[0]);
            fromName = fromStations[0].commonName;
          } else {
            return NextResponse.json<ApiResponse>({
              status: 'error',
              error: `Could not find starting location: ${body.from}`,
            }, { status: 400 });
          }
        }
      } else {
        // No FROM specified - client should provide current location
        return NextResponse.json<ApiResponse>({
          status: 'error',
          error: 'location_required',
          data: {
            message: 'Starting location is required',
          },
        }, { status: 400 });
      }

      // Handle TO location
      if (body.to.includes(',')) {
        // Already coordinates
        toLocation = body.to;
      } else {
        // Search for station
        const toStations = await tflClient.searchStopPoints(body.to);
        if (toStations.length > 0) {
          toLocation = tflClient.formatStopPointForJourney(toStations[0]);
          toName = toStations[0].commonName;
        } else {
          return NextResponse.json<ApiResponse>({
            status: 'error',
            error: `Could not find destination: ${body.to}`,
          }, { status: 400 });
        }
      }

      // Handle VIA from manual request (first item only)
      if (Array.isArray(body.via) && body.via.length > 0) {
        const viaRaw = String(body.via[0] || '').trim();
        if (viaRaw) {
          if (viaRaw.includes(',')) {
            viaLocation = viaRaw;
          } else {
            const viaStations = await tflClient.searchStopPoints(viaRaw);
            if (viaStations.length > 0) {
              viaLocation = tflClient.formatStopPointForJourney(viaStations[0]);
              viaName = viaStations[0].commonName;
            } else {
              const geocodeResults = await geocodingService.geocode(viaRaw);
              if (geocodeResults.length > 0) {
                viaLocation = `${geocodeResults[0].lat},${geocodeResults[0].lon}`;
                viaName = geocodeResults[0].name;
              }
            }
          }
        }
      }
    }

    // Ensure we have both locations
    if (!fromLocation || !toLocation) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Both starting point and destination are required',
      }, { status: 400 });
    }

    // Plan the journey (include National Rail as an allowed mode if requested, but never "prefer" it)
    const parseClientTimeParam = (value: any): Date | undefined => {
      if (!value) return undefined;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const journeyParams: JourneyPlannerParams = {
      from: fromLocation,
      to: toLocation,
      fromName,
      toName,
      nationalSearch: false,
      journeyPreference: mapJourneyPreference(body.preferences?.journeyPreference),
      accessibilityPreference: (() => {
        const acc = normalizeAccessibilityOptions(body.preferences?.accessibility as string[] | undefined);
        if (acc.includes('step-free-vehicle')) return 'StepFreeToVehicle';
        if (acc.includes('step-free-platform')) return 'StepFreeToPlatform';
        return 'NoRequirements';
      })(),
      mode: normalizeTransportModes((body.preferences?.modes as string[] | undefined) || [...DEFAULT_MODES]),
      alternativeRoute: true,
      walkingSpeed: mapWalkingSpeed(body.preferences?.walkingSpeed),
      ...(parseClientTimeParam(body.departureTime) ? { date: formatTfLDate(parseClientTimeParam(body.departureTime) as Date), time: formatTfLTime(parseClientTimeParam(body.departureTime) as Date), timeIs: 'Departing' as const } : {}),
      ...(parseClientTimeParam(body.arrivalTime) ? { date: formatTfLDate(parseClientTimeParam(body.arrivalTime) as Date), time: formatTfLTime(parseClientTimeParam(body.arrivalTime) as Date), timeIs: 'Arriving' as const } : {}),
      ...(viaLocation ? { via: viaLocation } : {}),
      ...(viaName ? { viaName } : {}),
      ...(typeof body.preferences?.maxWalkingMinutes === 'number' ? { maxWalkingMinutes: body.preferences.maxWalkingMinutes } : {}),
      ...(typeof body.preferences?.maxTransferMinutes === 'number' ? { maxTransferMinutes: body.preferences.maxTransferMinutes } : {}),
    };

    const journeyResult = await tflClient.planJourney(journeyParams);

    // Generate accessible descriptions and enhanced legs for the journeys
    const journeysWithDescriptions = await Promise.all(
      journeyResult.journeys.slice(0, 3).map(async (journey) => {
        const [accessibleDescription, enhancedLegs] = await Promise.all([
          aiClient.generateAccessibleDescription(journey),
          enhanceLegsWithArrivals(journey),
        ]);

        return {
          ...journey,
          legs: enhancedLegs,
          accessibleDescription,
        };
      })
    );

    return NextResponse.json<ApiResponse>({
      status: 'success',
      data: {
        ...journeyResult,
        journeys: journeysWithDescriptions,
        fromName,
        toName,
      },
    });

  } catch (error) {
    console.error('Journey planning error:', error);
    
    return NextResponse.json<ApiResponse>({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to plan journey',
    }, { status: 500 });
  }
}
