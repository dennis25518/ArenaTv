import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

const DEFAULT_SUPABASE_URL = 'https://qoyqefhtjjdyddhlinuz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_7ngYMmPpymGhjt5t6dTZDA_x5cnDm6s';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_KEY;

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: 'arenax_admin_session',
    },
  });
}
