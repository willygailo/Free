import { AIReactionResult, ModerationResult } from '@/types';
import { AI_REACTION_SYSTEM_PROMPT, MODERATION_SYSTEM_PROMPT } from './prompts';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const REQUEST_TIMEOUT_MS = 45000;

interface NvidiaChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
}

export function isNvidiaConfigured(): boolean {
  const key = process.env.NVIDIA_API_KEY?.trim();
  return Boolean(key && !key.includes('your-') && !key.includes('placeholder'));
}

export function getNvidiaModel(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
}

/**
 * Extracts a JSON object from model output, stripping `<think>...</think>` blocks
 * and markdown code fences if present.
 */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;

  // Strip <think>...</think> reasoning blocks if present
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown code fences if present
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall back to balanced brace extraction
  }

  // Try extracting JSON object(s) from the end first (final answer usually comes last)
  const matches = cleaned.match(/\{[\s\S]*?\}/g);
  if (matches) {
    for (let i = matches.length - 1; i >= 0; i -= 1) {
      try {
        const parsed = JSON.parse(matches[i]);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Keep trying
      }
    }
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(sliced);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function callNvidiaChat(
  systemPrompt: string,
  userContent: string
): Promise<string | null> {
  if (!isNvidiaConfigured()) {
    return null;
  }

  const apiKey = process.env.NVIDIA_API_KEY!.trim();
  const model = getNvidiaModel();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 16384,
        chat_template_kwargs: {
          enable_thinking: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `NVIDIA NIM API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as NvidiaChatResponse;
    const message = data.choices?.[0]?.message;
    const content = message?.content?.trim();
    if (content) {
      return content;
    }

    // Fallback to reasoning_content only if content was empty
    return message?.reasoning_content?.trim() ?? null;
  } catch (error) {
    console.error('NVIDIA NIM request failed:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function moderateConfession(
  content: string
): Promise<ModerationResult> {
  const fallback: ModerationResult = {
    approved: true,
    flagged: false,
    reason: '',
  };

  if (!isNvidiaConfigured()) {
    console.warn('NVIDIA_API_KEY is not set; using moderation fallback.');
    return fallback;
  }

  const raw = await callNvidiaChat(MODERATION_SYSTEM_PROMPT, content);
  if (!raw) {
    return {
      approved: false,
      flagged: true,
      reason: 'AI moderation unavailable; queued for human review.',
    };
  }

  const parsed = extractJsonObject(raw);
  if (!parsed) {
    return {
      approved: false,
      flagged: true,
      reason: 'AI moderation returned unreadable output; queued for human review.',
    };
  }

  const flagged =
    typeof parsed.flagged === 'boolean' ? parsed.flagged : fallback.flagged;
  const approved =
    typeof parsed.approved === 'boolean'
      ? parsed.approved
      : !flagged;
  const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';

  return { approved, flagged, reason };
}

export async function generateAIReaction(
  content: string,
  category?: string
): Promise<AIReactionResult> {
  const fallback: AIReactionResult = {
    emoji: '🫂',
    comment: 'Thank you for sharing this anonymously. You are heard.',
  };

  if (!isNvidiaConfigured()) {
    console.warn('NVIDIA_API_KEY is not set; using AI reaction fallback.');
    return fallback;
  }

  const userPrompt = category
    ? `[Category: ${category}]\n${content}`
    : content;
  const raw = await callNvidiaChat(AI_REACTION_SYSTEM_PROMPT, userPrompt);
  if (!raw) {
    return fallback;
  }

  const parsed = extractJsonObject(raw);
  if (!parsed) {
    return fallback;
  }

  const emoji =
    typeof parsed.emoji === 'string' && parsed.emoji.trim().length > 0
      ? parsed.emoji.trim()
      : fallback.emoji;
  const comment =
    typeof parsed.comment === 'string' && parsed.comment.trim().length > 0
      ? parsed.comment.trim()
      : fallback.comment;

  return { emoji, comment };
}
