function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return (
    trimmed.includes('your-project-ref') ||
    trimmed.includes('placeholder') ||
    trimmed === 'your-anon-key' ||
    trimmed === 'your-service-role-key'
  );
}

/**
 * Returns true when real server-side Supabase credentials are configured.
 * When false, the app uses the local JSON store fallback so all features work out of the box.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !isPlaceholder(url) && !isPlaceholder(serviceKey);
}

/**
 * Returns true when browser-side Supabase Realtime credentials are configured.
 */
export function isSupabaseRealtimeConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !isPlaceholder(url) && !isPlaceholder(anonKey);
}
