export type ConfessionStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export const CONFESSION_CATEGORIES = [
  'Confession',
  'Secret',
  'Love',
  'Work',
  'School',
  'Funny',
  'Vent',
  'Regret',
] as const;

export type ConfessionCategory = (typeof CONFESSION_CATEGORIES)[number];

export type ConfessionSort = 'newest' | 'top';

export const REACTION_EMOJIS = ['❤️', '😂', '😢', '😮'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ReactionCounts = Record<ReactionEmoji, number>;

export interface Confession {
  id: string;
  content: string;
  category: ConfessionCategory;
  status: ConfessionStatus;
  ai_emoji: string | null;
  ai_comment: string | null;
  moderation_reason: string | null;
  report_count: number;
  created_at: string;
  reactions: ReactionCounts;
}

export interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  reason: string;
}

export interface AIReactionResult {
  emoji: string;
  comment: string;
}

export type AdminStatusCounts = Record<ConfessionStatus | 'all', number>;

export interface HealthStatus {
  storage: 'supabase' | 'local';
  realtime: boolean;
  ai: {
    configured: boolean;
    model: string;
  };
}
