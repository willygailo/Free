'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Copy, ExternalLink, Flag } from 'lucide-react';
import type { Confession, ReactionEmoji } from '@/types';
import { AIReaction } from './AIReaction';
import { ReactionBar } from './ReactionBar';
import { Button } from './ui/Button';

export interface ConfessionCardProps {
  confession: Confession;
  activeEmojis?: ReactionEmoji[];
  onReact: (confessionId: string, emoji: ReactionEmoji) => Promise<void> | void;
  onReport?: (
    confessionId: string,
    reason: string
  ) => Promise<{ ok: boolean; error?: string }>;
  showPermalink?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (Number.isNaN(diffSec) || diffSec < 0) return 'just now';
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ConfessionCard({
  confession,
  activeEmojis = [],
  onReact,
  onReport,
  showPermalink = true,
}: ConfessionCardProps) {
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/confession/${confession.id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onReport || reportReason.trim().length < 5 || reportSubmitting) return;
    setReportSubmitting(true);
    setReportFeedback(null);
    const res = await onReport(confession.id, reportReason.trim());
    setReportSubmitting(false);
    if (!res.ok) {
      setReportFeedback(res.error || 'Could not submit report.');
      return;
    }
    setReporting(false);
    setReportReason('');
  };

  return (
    <article className="glass-card rounded-2xl p-5 transition-colors hover:border-zinc-700/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500/80" />
            Anonymous
          </span>
          <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            #{confession.category || 'Confession'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <time
            dateTime={confession.created_at}
            title={new Date(confession.created_at).toLocaleString()}
            className="inline-flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(confession.created_at)}</span>
          </time>

          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy link to confession"
            title="Copy link"
            className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {onReport && (
            <button
              type="button"
              onClick={() => {
                setReporting((prev) => !prev);
                setReportFeedback(null);
              }}
              aria-label="Report confession"
              title="Report for moderation review"
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          )}

          {showPermalink && (
            <Link
              href={`/confession/${confession.id}`}
              aria-label="Open confession permalink"
              title="Open permalink"
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-violet-400 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-100">
        {confession.content}
      </p>

      <AIReaction emoji={confession.ai_emoji} comment={confession.ai_comment} />

      <div className="pt-1">
        <ReactionBar
          confessionId={confession.id}
          reactions={confession.reactions}
          activeEmojis={activeEmojis}
          onReact={onReact}
        />
      </div>

      {reporting && (
        <form
          onSubmit={handleReportSubmit}
          className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 space-y-2"
        >
          <p className="text-[11px] font-medium text-amber-300">
            Report this confession for admin review
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason (e.g., doxxing, harassment, spam)..."
              minLength={5}
              maxLength={300}
              required
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
            <div className="flex items-center gap-1.5">
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                loading={reportSubmitting}
                disabled={reportReason.trim().length < 5}
              >
                Submit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setReporting(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
          {reportFeedback && (
            <p className="text-[11px] text-rose-400">{reportFeedback}</p>
          )}
        </form>
      )}
    </article>
  );
}
