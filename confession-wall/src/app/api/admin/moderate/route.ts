import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { listAdminConfessions, moderateAdminConfession } from '@/lib/store';
import { adminActionSchema } from '@/lib/validators';
import { ConfessionStatus } from '@/types';
import { parseJsonBody } from '../../_helpers';

const VALID_STATUSES: readonly ConfessionStatus[] = [
  'pending',
  'approved',
  'rejected',
  'flagged',
];

export async function GET(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') ?? 'all';
    const q = searchParams.get('q') ?? undefined;

    if (
      statusParam !== 'all' &&
      !(VALID_STATUSES as readonly string[]).includes(statusParam)
    ) {
      return NextResponse.json(
        { error: 'Invalid status filter.' },
        { status: 400 }
      );
    }

    const result = await listAdminConfessions({
      status: statusParam as ConfessionStatus | 'all',
      q,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/admin/moderate error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const bodyResult = await parseJsonBody(request);
    if ('errorResponse' in bodyResult) {
      return bodyResult.errorResponse;
    }

    const parsed = adminActionSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid action payload.' },
        { status: 400 }
      );
    }

    const result = await moderateAdminConfession(parsed.data);
    if (!result) {
      return NextResponse.json(
        { error: 'Confession not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('PATCH /api/admin/moderate error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
