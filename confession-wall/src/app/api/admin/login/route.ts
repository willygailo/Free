import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminToken } from '@/lib/adminAuth';
import { adminLoginSchema } from '@/lib/validators';
import { enforceRateLimit, parseJsonBody } from '../../_helpers';

function passwordsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(
      request,
      'login',
      10,
      15 * 60 * 1000,
      'Too many login attempts. Please wait 15 minutes.'
    );
    if (rate.errorResponse) {
      return rate.errorResponse;
    }

    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword) {
      return NextResponse.json(
        { error: 'Admin password is not configured on the server.' },
        { status: 500 }
      );
    }

    const bodyResult = await parseJsonBody(request);
    if ('errorResponse' in bodyResult) {
      return bodyResult.errorResponse;
    }

    const parsed = adminLoginSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Password is required.' },
        { status: 400 }
      );
    }

    if (!passwordsMatch(parsed.data.password, expectedPassword)) {
      return NextResponse.json(
        { error: 'Invalid admin password.' },
        { status: 401 }
      );
    }

    const token = createAdminToken();
    const response = NextResponse.json({ authenticated: true });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('POST /api/admin/login error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
