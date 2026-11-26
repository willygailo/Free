import { REACTION_EMOJIS, type ReactionCounts, type ReactionEmoji } from '@/types';

const STORAGE_KEY = 'confession_wall_reacted_v1';

export type ReactedMap = Record<string, ReactionEmoji[]>;

export function createEmptyReactions(): ReactionCounts {
  return REACTION_EMOJIS.reduce((acc, emoji) => {
    acc[emoji] = 0;
    return acc;
  }, {} as ReactionCounts);
}

export function readReactedMap(): ReactedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ReactedMap;
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

export function writeReactedMap(map: ReactedMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyReactionToggle(
  counts: ReactionCounts | undefined,
  emoji: ReactionEmoji,
  action: 'add' | 'remove'
): ReactionCounts {
  const base = { ...createEmptyReactions(), ...counts };
  const current = base[emoji] ?? 0;
  base[emoji] = action === 'add' ? current + 1 : Math.max(0, current - 1);
  return base;
}
