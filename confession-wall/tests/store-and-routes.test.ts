import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as createConfessionPost, GET as listConfessionsGet } from '@/app/api/confessions/route';
import { POST as reactPost } from '@/app/api/confessions/[id]/react/route';
import { POST as reportPost } from '@/app/api/confessions/[id]/report/route';
import { resetRateLimitStore } from '@/lib/rateLimit';

describe('Confessions store and API routes (local fallback mode)', () => {
  let tmpDir: string;
  const originalDataFile = process.env.CONFESSION_DATA_FILE;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalNvidiaKey = process.env.NVIDIA_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    resetRateLimitStore();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'confession-wall-test-'));
    process.env.CONFESSION_DATA_FILE = path.join(tmpDir, 'confessions.json');
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-ref.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'dev-service-role-key-placeholder';
  });

  afterEach(async () => {
    process.env.CONFESSION_DATA_FILE = originalDataFile;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
    process.env.NVIDIA_API_KEY = originalNvidiaKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('lists seeded confessions with search, category filter, and pagination', async () => {
    const res = await listConfessionsGet(
      new Request('http://localhost/api/confessions?category=Work&limit=10&offset=0')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.confessions[0].category).toBe('Work');
    expect(body.confessions[0].moderation_reason).toBeNull();
  });

  it('routes flagged confessions to flagged status (not rejected) and rejects violating ones with 422', async () => {
    process.env.NVIDIA_API_KEY = 'nvapi-test';
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"approved": false, "flagged": true, "reason": "Borderline venting"}',
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const flaggedRes = await createConfessionPost(
      new Request('http://localhost/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Borderline confession that needs a human check.',
          category: 'Vent',
        }),
      })
    );
    expect(flaggedRes.status).toBe(201);
    const flaggedData = await flaggedRes.json();
    expect(flaggedData.confession.status).toBe('flagged');

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"approved": false, "flagged": false, "reason": "Contains spam link"}',
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const rejectedRes = await createConfessionPost(
      new Request('http://localhost/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Buy cheap followers at spam-link.example!',
          category: 'Confession',
        }),
      })
    );
    expect(rejectedRes.status).toBe(422);
    const rejectedData = await rejectedRes.json();
    expect(rejectedData.status).toBe('rejected');
    expect(rejectedData.error).toContain('spam');
  });

  it('toggles reactions and flags reported confessions', async () => {
    const targetId = '11111111-1111-4111-8111-111111111111';

    const addRes = await reactPost(
      new Request(`http://localhost/api/confessions/${targetId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '❤️', action: 'add' }),
      }),
      { params: { id: targetId } }
    );
    expect(addRes.status).toBe(200);
    const added = await addRes.json();
    expect(added.count).toBe(19);

    const removeRes = await reactPost(
      new Request(`http://localhost/api/confessions/${targetId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '❤️', action: 'remove' }),
      }),
      { params: { id: targetId } }
    );
    expect(removeRes.status).toBe(200);
    const removed = await removeRes.json();
    expect(removed.count).toBe(18);

    const reportRes = await reportPost(
      new Request(`http://localhost/api/confessions/${targetId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Please check this post.' }),
      }),
      { params: { id: targetId } }
    );
    expect(reportRes.status).toBe(200);
    const reported = await reportRes.json();
    expect(reported.reported).toBe(true);
    expect(reported.status).toBe('flagged');
  });
});
