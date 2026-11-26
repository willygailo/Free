import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reportConfessionById } from '@/lib/store';
import { reportSchema } from '@/lib/validators';
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
      'report',
      10,
      15 * 60 * 1000,
      'Too many reports submitted. Please wait before reporting again.'
    );
    if (rate.errorResponse) {
      return rate.errorResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if ('errorResponse' in bodyResult) {
      return bodyResult.errorResponse;
    }

    const parsedBody = reportSchema.safeParse(bodyResult.data);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Invalid report reason.' },
        { status: 400 }
      );
    }

    const result = await reportConfessionById(parsedId.data, parsedBody.data.reason);
    if (!result) {
      return NextResponse.json(
        { error: 'Confession not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reported: true, ...result });
  } catch (error) {
    console.error('POST /api/confessions/[id]/report error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
