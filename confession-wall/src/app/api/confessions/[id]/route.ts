import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '@/lib/adminAuth';
import { deleteConfessionById, getPublicConfessionById } from '@/lib/store';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const uuidSchema = z.string().uuid('Invalid confession ID.');

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.issues[0]?.message ?? 'Invalid ID.' },
        { status: 400 }
      );
    }

    const confession = await getPublicConfessionById(parsedId.data);
    if (!confession) {
      return NextResponse.json(
        { error: 'Confession not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ confession });
  } catch (error) {
    console.error('GET /api/confessions/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await Promise.resolve(context.params);
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.issues[0]?.message ?? 'Invalid ID.' },
        { status: 400 }
      );
    }

    const deleted = await deleteConfessionById(parsedId.data);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Confession not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true, id: parsedId.data });
  } catch (error) {
    console.error('DELETE /api/confessions/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
