import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://placeholder.supabase.co';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
