'use client';

import { MessageSquareOff } from 'lucide-react';
import type { ReactedMap } from '@/lib/reactionClient';
import type { Confession, ReactionEmoji } from '@/types';
import { ConfessionCard } from './ConfessionCard';
import { Button } from './ui/Button';
import { ConfessionCardSkeleton } from './ui/Skeleton';

export interface ConfessionListProps {
  confessions: Confession[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  error: string | null;
  reactedMap?: ReactedMap;
  onReact: (confessionId: string, emoji: ReactionEmoji) => Promise<void> | void;
  onReport?: (
    confessionId: string,
    reason: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onLoadMore?: () => void;
  onRetry?: () => void;
}

export function ConfessionList({
  confessions,
  loading,
  loadingMore = false,
  hasMore = false,
  error,
  reactedMap = {},
  onReact,
  onReport,
  onLoadMore,
  onRetry,
}: ConfessionListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3">
        <p className="text-sm text-rose-400">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-medium text-violet-400 hover:text-violet-300 underline underline-offset-4 cursor-pointer"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-2">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400">
          <MessageSquareOff className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-medium text-zinc-200">No matching confessions</h3>
        <p className="text-xs text-zinc-500">
          Try clearing your filter or be the first to share one above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confessions.map((confession) => (
        <ConfessionCard
          key={confession.id}
          confession={confession}
          activeEmojis={reactedMap[confession.id] ?? []}
          onReact={onReact}
          onReport={onReport}
        />
      ))}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            size="md"
            loading={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? 'Loading more...' : 'Load More Confessions'}
          </Button>
        </div>
      )}
    </div>
  );
}
