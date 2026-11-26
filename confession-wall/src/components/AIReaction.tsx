'use client';

import { Sparkles } from 'lucide-react';

export interface AIReactionProps {
  emoji: string | null;
  comment: string | null;
}

export function AIReaction({ emoji, comment }: AIReactionProps) {
  if (!emoji && !comment) {
    return null;
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 px-3.5 py-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/25 text-base">
          {emoji || '🤖'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-violet-300/90">
            <Sparkles className="h-3 w-3" />
            <span>Nemotron AI</span>
          </div>
          {comment && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              {comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
