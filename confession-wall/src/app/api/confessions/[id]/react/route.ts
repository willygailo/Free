import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adjustConfessionReaction } from '@/lib/store';
import { reactSchema } from '@/lib/validators';
import { enforceRateLimit, parseJsonBody } from '../../../_helpers';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const uuidSchema = z.string().uuid('Invalid confession ID.');

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.issues[0]?.message ?? 'Invalid ID.' },
        { status: 400 }
      );
    }

    const rate = enforceRateLimit(
      request,
      'react',
      60,
      60 * 1000,
      'You are reacting too fast. Please wait a moment.'
    );
    if (rate.errorResponse) {
      return rate.errorResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if ('errorResponse' in bodyResult) {
      return bodyResult.errorResponse;
    }

    const parsedBody = reactSchema.safeParse(bodyResult.data);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Invalid emoji.' },
        { status: 400 }
      );
    }

    const { emoji, action } = parsedBody.data;
    const result = await adjustConfessionReaction(parsedId.data, emoji, action);

    if (!result) {
      return NextResponse.json(
        { error: 'Confession not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/confessions/[id]/react error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
