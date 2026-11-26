import { NextResponse } from 'next/server';
import { getRandomPublicConfession } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const confession = await getRandomPublicConfession();
    if (!confession) {
      return NextResponse.json(
        { error: 'No approved confessions available yet.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ confession });
  } catch (error) {
    console.error('GET /api/confessions/random error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
