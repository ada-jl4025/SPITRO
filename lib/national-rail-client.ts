import { config } from './config';
import { XMLParser } from 'fast-xml-parser';

export interface NationalRailDeparture {
  id: string;
  destinationName: string;
  expectedArrival: string; // ISO string
  timeToStation: number; // seconds
  platformName?: string;
  towards?: string;
}

class NationalRailClient {
  private baseUrl: string;
  private apiKey: string;
  private enabled: boolean;
  private apiHeaderName: string;
  private ldbwsUrl: string;
  private ldbwsToken: string;
  private ldbwsNs: string;
  private ldbwsCommonNs: string;

  constructor() {
    this.baseUrl = config.nationalRail.baseUrl;
    this.apiKey = config.nationalRail.apiKey;
    this.enabled = !!config.nationalRail.enabled;
    this.apiHeaderName = config.nationalRail.apiHeaderName || 'x-api-key';
    this.ldbwsUrl = config.nationalRail.ldbwsUrl;
    this.ldbwsToken = config.nationalRail.ldbwsToken;
    this.ldbwsNs = config.nationalRail.ldbwsNamespace;
    this.ldbwsCommonNs = config.nationalRail.ldbwsCommonNamespace;
  }

  isEnabled(): boolean {
    if (!this.enabled) return false;
    const hasRest = !!this.baseUrl && !!this.apiKey;
    const hasSoap = !!this.ldbwsUrl && !!this.ldbwsToken;
    return hasRest || hasSoap;
  }

  // Fetch next departures for a station by CRS
  async getNextDeparturesByCRS(crs: string, limit: number = 3): Promise<NationalRailDeparture[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const hasRest = !!this.baseUrl && !!this.apiKey;
    if (hasRest) {
      return this.fetchFromRest(crs, limit);
    }

    // Fallback to OpenLDBWS SOAP
    return this.fetchFromOpenLDBWS(crs, limit);
  }

  private async fetchFromRest(crs: string, limit: number): Promise<NationalRailDeparture[]> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/departures`);
    url.searchParams.set('crs', crs);
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        [this.apiHeaderName]: this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`NR API error: ${response.status} ${body || response.statusText}`);
    }

    const data = (await response.json()) as any[];
    return (Array.isArray(data) ? data : []).map((item, index) => {
      const expectedIso = typeof item.expectedArrival === 'string'
        ? item.expectedArrival
        : new Date(Date.now() + (Number(item.timeToStationSeconds) || 0) * 1000).toISOString();

      const timeToSeconds = typeof item.timeToStationSeconds === 'number'
        ? item.timeToStationSeconds
        : Math.max(0, Math.round((new Date(expectedIso).getTime() - Date.now()) / 1000));

      return {
        id: String(item.id ?? `${crs}-${index}`),
        destinationName: String(item.destinationName || item.destination || ''),
        expectedArrival: expectedIso,
        timeToStation: timeToSeconds,
        platformName: item.platform || item.platformName || undefined,
        towards: item.towards || undefined,
      } satisfies NationalRailDeparture;
    });
  }

  private buildLdbwsEnvelope(crs: string, limit: number): string {
    const ns = this.ldbwsNs.replace(/\/?$/, '/');
    const cns = this.ldbwsCommonNs;
    return (
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
      `<soap:Header>` +
      `<AccessToken xmlns="${cns}"><TokenValue>${this.ldbwsToken}</TokenValue></AccessToken>` +
      `</soap:Header>` +
      `<soap:Body>` +
      `<GetDepartureBoardRequest xmlns="${ns}">` +
      `<numRows>${limit}</numRows>` +
      `<crs>${crs}</crs>` +
      `</GetDepartureBoardRequest>` +
      `</soap:Body>` +
      `</soap:Envelope>`
    );
  }

  private parseTimeToIso(hhmm: string): string | undefined {
    const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!match) return undefined;
    const now = new Date();
    const date = new Date(now);
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date.toISOString();
  }

  private async fetchFromOpenLDBWS(crs: string, limit: number): Promise<NationalRailDeparture[]> {
    if (!this.ldbwsUrl || !this.ldbwsToken) {
      return [];
    }

    const soapAction = `${this.ldbwsNs.replace(/\/?$/, '/') }GetDepartureBoard`;
    const envelope = this.buildLdbwsEnvelope(crs, limit);

    const response = await fetch(this.ldbwsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
      },
      body: envelope,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenLDBWS error: ${response.status} ${text || response.statusText}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
    const parsed = parser.parse(xml);

    // Navigate to Body -> GetDepartureBoardResponse -> GetStationBoardResult -> trainServices -> service
    const services = parsed?.Envelope?.Body?.GetDepartureBoardResponse?.GetStationBoardResult?.trainServices?.service;

    const serviceList: any[] = Array.isArray(services) ? services : services ? [services] : [];
    const results: NationalRailDeparture[] = [];

    for (let i = 0; i < serviceList.length; i++) {
      const srv = serviceList[i] || {};
      const destLoc = srv?.destination?.location;
      const firstDest = Array.isArray(destLoc) ? destLoc[0] : destLoc || {};
      const destinationName: string = String(firstDest?.locationName || firstDest?._text || firstDest || '');
      const platform = srv?.platform ? String(srv.platform) : undefined;
      const etd: string = srv?.etd ? String(srv.etd) : '';
      const std: string = srv?.std ? String(srv.std) : '';

      // Choose time: prefer etd if in HH:MM, else std
      const timeStr = /\d{2}:\d{2}/.test(etd) ? etd : std;
      const expectedIso = this.parseTimeToIso(timeStr) || new Date().toISOString();
      const secs = Math.max(0, Math.round((new Date(expectedIso).getTime() - Date.now()) / 1000));

      results.push({
        id: String(srv?.serviceID || `${crs}-${i}`),
        destinationName,
        expectedArrival: expectedIso,
        timeToStation: secs,
        platformName: platform,
        towards: destinationName || undefined,
      });
    }

    return results.slice(0, limit);
  }
}

export const nationalRailClient = new NationalRailClient();


