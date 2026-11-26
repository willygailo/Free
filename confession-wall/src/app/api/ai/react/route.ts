import { NextResponse } from 'next/server';
import { generateAIReaction } from '@/lib/nvidia';
import { moderateSchema } from '@/lib/validators';
import { enforceRateLimit, parseJsonBody } from '../../_helpers';

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(
      request,
      'ai',
      15,
      15 * 60 * 1000,
      'AI endpoint rate limit reached. Please try again later.'
    );
    if (rate.errorResponse) {
      return rate.errorResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if ('errorResponse' in bodyResult) {
      return bodyResult.errorResponse;
    }

    const parsed = moderateSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid content.' },
        { status: 400 }
      );
    }

    const result = await generateAIReaction(
      parsed.data.content,
      parsed.data.category
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/ai/react error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
