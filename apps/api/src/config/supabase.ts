import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let supabase: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

export { supabase };
