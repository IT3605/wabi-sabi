import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

const isPlaceholderUrl =
  !supabaseUrl || supabaseUrl.includes('your-project-ref.supabase.co');
const isPlaceholderKey =
  !supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key';

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !isPlaceholderUrl && !isPlaceholderKey;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return cachedClient;
}
