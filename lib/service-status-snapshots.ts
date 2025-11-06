import type { SupabaseClient } from '@supabase/supabase-js';
import type { LineStatus } from '@/types/tfl';
import { config } from './config';
import { getServiceSupabase } from './supabase-server';
import { TFLApiClient } from './tfl-client';

export interface StatusSnapshot {
  payload: LineStatus[];
  valid_at: string;
  source: string;
}

type RefreshOptions = {
  supabaseClient?: SupabaseClient;
  source?: string;
  useAutofetchKeys?: boolean;
};

export async function getLatestStatusSnapshot(
  supabaseClient?: SupabaseClient
): Promise<StatusSnapshot | null> {
  const supabase = supabaseClient ?? getServiceSupabase();

  const { data, error } = await supabase
    .from('service_status_snapshots')
    .select('payload, valid_at, source')
    .order('valid_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0] as StatusSnapshot;
  return {
    payload: row.payload as LineStatus[],
    valid_at: row.valid_at,
    source: row.source,
  };
}

export function isSnapshotFresh(snapshot: StatusSnapshot | null, maxAgeMs: number): boolean {
  if (!snapshot) return false;
  const validAtMs = new Date(snapshot.valid_at).getTime();
  if (Number.isNaN(validAtMs)) return false;
  return Date.now() - validAtMs <= maxAgeMs;
}

export async function refreshStatusSnapshot(options: RefreshOptions = {}): Promise<StatusSnapshot> {
  const { supabaseClient, source = 'autofetch', useAutofetchKeys } = options;
  const supabase = supabaseClient ?? getServiceSupabase();

  const autofetchKeys = config.tfl.autofetchApiKeys;
  const shouldUseAutofetch = useAutofetchKeys ?? autofetchKeys.length > 0;
  const overrideKeys = shouldUseAutofetch && autofetchKeys.length > 0 ? autofetchKeys : undefined;

  const client = new TFLApiClient(overrideKeys);
  const payload = await client.getLineStatus();
  const validAt = new Date().toISOString();

  const { error } = await supabase.from('service_status_snapshots').insert({
    payload,
    source,
    valid_at: validAt,
  });

  if (error) {
    throw error;
  }

  return { payload, valid_at: validAt, source };
}


