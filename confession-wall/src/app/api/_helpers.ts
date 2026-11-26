import { NextResponse } from 'next/server';
import { getClientIp, hashIp } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rateLimit';

export async function parseJsonBody(
  request: Request
): Promise<{ data: unknown } | { errorResponse: NextResponse }> {
  try {
    const data = await request.json();
    return { data };
  } catch {
    return {
      errorResponse: NextResponse.json(
        { error: 'Invalid JSON request body.' },
        { status: 400 }
      ),
    };
  }
}

export function enforceRateLimit(
  request: Request,
  namespace: string,
  maxRequests: number,
  windowMs: number,
  message = 'Too many requests. Please try again shortly.'
): { ipHash: string; errorResponse?: NextResponse } {
  const clientIp = getClientIp(request);
  const ipHash = hashIp(clientIp);
  const result = checkRateLimit(`${namespace}:${ipHash}`, maxRequests, windowMs);

  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000)
    );
    return {
      ipHash,
      errorResponse: NextResponse.json(
        { error: message, resetAt: result.resetAt },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) },
        }
      ),
    };
  }

  return { ipHash };
}
