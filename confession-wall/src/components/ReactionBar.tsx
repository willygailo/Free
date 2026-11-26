'use client';

import { useState } from 'react';
import { REACTION_EMOJIS, type ReactionCounts, type ReactionEmoji } from '@/types';

export interface ReactionBarProps {
  confessionId: string;
  reactions: ReactionCounts;
  activeEmojis?: ReactionEmoji[];
  onReact: (confessionId: string, emoji: ReactionEmoji) => Promise<void> | void;
}

export function ReactionBar({
  confessionId,
  reactions,
  activeEmojis = [],
  onReact,
}: ReactionBarProps) {
  const [reactingEmoji, setReactingEmoji] = useState<ReactionEmoji | null>(null);

  const handleReact = async (emoji: ReactionEmoji) => {
    if (reactingEmoji) return;
    setReactingEmoji(emoji);
    try {
      await onReact(confessionId, emoji);
    } finally {
      setReactingEmoji(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions?.[emoji] ?? 0;
        const isActive = activeEmojis.includes(emoji);
        const isPending = reactingEmoji === emoji;

        return (
          <button
            key={emoji}
            type="button"
            disabled={Boolean(reactingEmoji)}
            onClick={() => handleReact(emoji)}
            aria-pressed={isActive}
            aria-label={`${isActive ? 'Remove' : 'Add'} ${emoji} reaction (${count})`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer disabled:cursor-wait ${
              isActive
                ? 'border-violet-500/70 bg-violet-600/20 text-violet-200 shadow-sm shadow-violet-950/50'
                : count > 0
                  ? 'border-zinc-700/90 bg-zinc-800/80 text-zinc-200 hover:border-violet-500/50 hover:bg-zinc-800'
                  : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            } ${isPending ? 'scale-95 opacity-80' : 'hover:scale-105 active:scale-95'}`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
