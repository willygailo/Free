import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'confession_admin_session';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'dev-admin-session-secret'
  );
}

function signPayload(payloadB64: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
}

export function createAdminToken(): string {
  const now = Date.now();
  const payload = {
    role: 'admin',
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) {
    return false;
  }

  const expectedSig = signPayload(payloadB64);
  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return false;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as { role?: string; exp?: number };

    if (decoded.role !== 'admin') {
      return false;
    }

    if (typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return false;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const eqIndex = cookie.indexOf('=');
    if (eqIndex === -1) continue;
    const name = cookie.slice(0, eqIndex).trim();
    if (name === ADMIN_COOKIE_NAME) {
      const value = decodeURIComponent(cookie.slice(eqIndex + 1).trim());
      return verifyAdminToken(value);
    }
  }

  return false;
}
