import { NextResponse } from 'next/server';
import { generateAIReaction, moderateConfession } from '@/lib/nvidia';
import { createConfessionRecord, listPublicConfessions } from '@/lib/store';
import { createConfessionSchema } from '@/lib/validators';
import { ConfessionSort, ConfessionStatus } from '@/types';
import { enforceRateLimit, parseJsonBody } from '../_helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') ?? '20');
    const offsetParam = Number(searchParams.get('offset') ?? '0');
    const q = searchParams.get('q') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const sortParam = searchParams.get('sort');
    const sort: ConfessionSort = sortParam === 'top' ? 'top' : 'newest';

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
      : 20;
    const offset = Number.isFinite(offsetParam)
      ? Math.max(Math.trunc(offsetParam), 0)
      : 0;

    const result = await listPublicConfessions({
      q,
      category,
      sort,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/confessions error:', error);
    return NextResponse.json(
      { error: 'Failed to load confessions.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const bodyResult = await parseJsonBody(request);
    if ('errorResponse' in bodyResult) {
      return bodyResult.errorResponse;
    }

    const parsed = createConfessionSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? 'Invalid confession content.',
        },
        { status: 400 }
      );
    }

    const rate = enforceRateLimit(
      request,
      'post',
      5,
      15 * 60 * 1000,
      'Rate limit exceeded. Please wait before posting again.'
    );
    if (rate.errorResponse) {
      return rate.errorResponse;
    }

    const { content, category } = parsed.data;
    const moderation = await moderateConfession(content);

    // Check flagged before rejected so borderline posts enter admin review queue
    let status: ConfessionStatus = 'approved';
    if (moderation.flagged) {
      status = 'flagged';
    } else if (!moderation.approved) {
      status = 'rejected';
    }

    let aiEmoji: string | null = null;
    let aiComment: string | null = null;

    if (status === 'approved') {
      const aiReaction = await generateAIReaction(content, category);
      aiEmoji = aiReaction.emoji;
      aiComment = aiReaction.comment;
    }

    const confession = await createConfessionRecord({
      content,
      category,
      status,
      ai_emoji: aiEmoji,
      ai_comment: aiComment,
      moderation_reason: moderation.reason || null,
      ip_hash: rate.ipHash,
    });

    if (status === 'rejected') {
      return NextResponse.json(
        {
          error:
            moderation.reason ||
            'Your confession was declined by AI moderation for violating community guidelines.',
          status: 'rejected',
          moderation,
          confession,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        confession,
        moderation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/confessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
