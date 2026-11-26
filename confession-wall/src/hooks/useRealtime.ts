'use client';

import { useEffect, useState } from 'react';
import { createEmptyReactions } from '@/lib/reactionClient';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseRealtimeConfigured } from '@/lib/supabase/config';
import {
  REACTION_EMOJIS,
  type Confession,
  type ConfessionCategory,
  type ReactionEmoji,
} from '@/types';

interface UseRealtimeOptions {
  onConfessionUpsert?: (confession: Confession) => void;
  onConfessionDelete?: (id: string) => void;
  onReactionChange?: (confessionId: string, emoji: ReactionEmoji, count: number) => void;
}

export function useRealtime({
  onConfessionUpsert,
  onConfessionDelete,
  onReactionChange,
}: UseRealtimeOptions) {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isSupabaseRealtimeConfigured()) {
      setIsLive(false);
      return;
    }

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel('confession-wall-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confessions' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id && onConfessionDelete) {
              onConfessionDelete(oldRow.id);
            }
            return;
          }

          const row = payload.new as Partial<Confession> | null;
          if (!row?.id || !onConfessionUpsert) return;

          onConfessionUpsert({
            id: row.id,
            content: row.content ?? '',
            category: (row.category as ConfessionCategory) ?? 'Confession',
            status: row.status ?? 'pending',
            ai_emoji: row.ai_emoji ?? null,
            ai_comment: row.ai_comment ?? null,
            moderation_reason: row.moderation_reason ?? null,
            report_count: row.report_count ?? 0,
            created_at: row.created_at ?? new Date().toISOString(),
            reactions: row.reactions ?? createEmptyReactions(),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload) => {
          const row = payload.new as {
            confession_id?: string;
            emoji?: string;
            count?: number;
          } | null;

          if (
            !row?.confession_id ||
            !row?.emoji ||
            typeof row.count !== 'number' ||
            !onReactionChange
          ) {
            return;
          }

          if ((REACTION_EMOJIS as readonly string[]).includes(row.emoji)) {
            onReactionChange(row.confession_id, row.emoji as ReactionEmoji, row.count);
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      setIsLive(false);
      supabase.removeChannel(channel);
    };
  }, [onConfessionUpsert, onConfessionDelete, onReactionChange]);

  return { isLive };
}
