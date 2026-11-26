import { NextResponse } from 'next/server';
import { getNvidiaModel, isNvidiaConfigured } from '@/lib/nvidia';
import { isSupabaseConfigured, isSupabaseRealtimeConfigured } from '@/lib/supabase/config';
import { HealthStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status: HealthStatus = {
    storage: isSupabaseConfigured() ? 'supabase' : 'local',
    realtime: isSupabaseRealtimeConfigured(),
    ai: {
      configured: isNvidiaConfigured(),
      model: getNvidiaModel(),
    },
  };

  return NextResponse.json(status);
}
