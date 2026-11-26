import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  isAdminRequest,
  verifyAdminToken,
} from '@/lib/adminAuth';
import { getClientIp, hashIp } from '@/lib/hash';
import { checkRateLimit, resetRateLimitStore } from '@/lib/rateLimit';
import {
  adminActionSchema,
  createConfessionSchema,
  reactSchema,
  reportSchema,
} from '@/lib/validators';

describe('adminAuth, hashing, rate limiting, and validators', () => {
  beforeEach(() => {
    resetRateLimitStore();
    process.env.ADMIN_SESSION_SECRET = 'test-secret-key-for-vitest';
    process.env.IP_HASH_SALT = 'test-salt';
  });

  it('creates and verifies HMAC admin session tokens', () => {
    const token = createAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
    expect(verifyAdminToken(`${token}tampered`)).toBe(false);
    expect(verifyAdminToken('invalid')).toBe(false);

    const req = new Request('http://localhost/api/admin/moderate', {
      headers: {
        cookie: `other=1; ${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
      },
    });
    expect(isAdminRequest(req)).toBe(true);
  });

  it('hashes IPs deterministically without storing raw IPs', () => {
    const req = new Request('http://localhost/api/confessions', {
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1' },
    });
    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.42');
    const hashed = hashIp(ip);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain('203.0.113.42');
    expect(hashIp(ip)).toBe(hashed);
  });

  it('enforces sliding-window rate limits per key', () => {
    const r1 = checkRateLimit('post:abc', 2, 60_000);
    const r2 = checkRateLimit('post:abc', 2, 60_000);
    const r3 = checkRateLimit('post:abc', 2, 60_000);
    const other = checkRateLimit('react:abc', 2, 60_000);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(other.allowed).toBe(true);
  });

  it('validates confession, reaction, report, and admin schemas', () => {
    expect(
      createConfessionSchema.safeParse({
        content: 'I secretly love pineapple on pizza.',
        category: 'Funny',
      }).success
    ).toBe(true);

    expect(
      createConfessionSchema.safeParse({ content: 'hi' }).success
    ).toBe(false);

    expect(
      reactSchema.safeParse({ emoji: '❤️', action: 'remove' }).success
    ).toBe(true);

    expect(
      reportSchema.safeParse({ reason: 'Contains personal phone number' }).success
    ).toBe(true);

    expect(
      adminActionSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        action: 'regenerate_ai',
      }).success
    ).toBe(true);
  });
});
