import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

let cachedServiceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;

  const url = config.supabase.url;
  const serviceKey = config.supabase.serviceRoleKey;

  if (!url || !serviceKey) {
    throw new Error('Supabase service configuration is missing (url or service role key)');
  }

  cachedServiceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'status-autofetch' } },
  });

  return cachedServiceClient;
}

export type ServiceStatusSnapshot = {
  id: number;
  created_at: string;
  valid_at: string;
  source: string;
  payload: unknown;
};


