import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractJsonObject,
  generateAIReaction,
  moderateConfession,
} from '@/lib/nvidia';

describe('nvidia.ts JSON extraction & AI helpers', () => {
  const originalKey = process.env.NVIDIA_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.NVIDIA_API_KEY = originalKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('extracts JSON after stripping <think> blocks and markdown fences', () => {
    const raw = `<think>Evaluating tone carefully...</think>\n\`\`\`json\n{"approved": true, "flagged": false, "reason": ""}\n\`\`\``;
    expect(extractJsonObject(raw)).toEqual({
      approved: true,
      flagged: false,
      reason: '',
    });
  });

  it('extracts trailing JSON object when preceded by prose', () => {
    const raw = `Here is my response:\n{"emoji": "🫂", "comment": "You are doing great."}`;
    expect(extractJsonObject(raw)).toEqual({
      emoji: '🫂',
      comment: 'You are doing great.',
    });
  });

  it('returns null for non-object or invalid JSON', () => {
    expect(extractJsonObject('not json')).toBeNull();
    expect(extractJsonObject('[1, 2, 3]')).toBeNull();
  });

  it('parses Nemotron reasoning_content fallback when content is empty', async () => {
    process.env.NVIDIA_API_KEY = 'nvapi-test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '',
              reasoning_content:
                'Borderline post. {"approved": false, "flagged": true, "reason": "Needs review"}',
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await moderateConfession('Some ambiguous post');
    expect(result).toEqual({
      approved: false,
      flagged: true,
      reason: 'Needs review',
    });
  });

  it('flags for review when NVIDIA API fails rather than auto-approving', async () => {
    process.env.NVIDIA_API_KEY = 'nvapi-test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }) as unknown as typeof fetch;

    const result = await moderateConfession('Hello world');
    expect(result.approved).toBe(false);
    expect(result.flagged).toBe(true);
  });

  it('returns a fallback AI reaction when API key is missing', async () => {
    delete process.env.NVIDIA_API_KEY;
    const reaction = await generateAIReaction('Test confession', 'Secret');
    expect(reaction.emoji.length).toBeGreaterThan(0);
    expect(reaction.comment.length).toBeGreaterThan(0);
  });
});
