'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Send } from 'lucide-react';
import { CONFESSION_CATEGORIES, type ConfessionCategory } from '@/types';
import type { SubmitConfessionResult } from '@/hooks/useConfessions';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';

const MIN_CHARS = 5;
const MAX_CHARS = 1000;

export interface ConfessionFormProps {
  onSubmit: (
    content: string,
    category: ConfessionCategory
  ) => Promise<SubmitConfessionResult>;
}

export function ConfessionForm({ onSubmit }: ConfessionFormProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ConfessionCategory>('Confession');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const trimmedLength = content.trim().length;
  const isTooShort = trimmedLength > 0 && trimmedLength < MIN_CHARS;
  const isTooLong = content.length > MAX_CHARS;
  const canSubmit = trimmedLength >= MIN_CHARS && !isTooLong && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFeedback(null);

    const result = await onSubmit(content.trim(), category);

    if (result.ok) {
      setContent('');
      if (result.status === 'flagged' || result.status === 'pending') {
        setFeedback({
          type: 'warning',
          message:
            result.moderationReason ||
            'Your confession was flagged by AI moderation and queued for human admin review.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Confession posted anonymously to the wall with an AI reaction!',
        });
      }
    } else {
      // Preserve draft text on rejection / error so the user can edit & retry
      setFeedback({
        type: 'error',
        message:
          result.moderationReason ||
          result.error ||
          'Your confession could not be posted.',
      });
    }

    setSubmitting(false);
  };

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Confess something anonymously
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            No accounts, no names. Moderated &amp; answered by NVIDIA Nemotron.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1 text-[11px] text-zinc-400">
          <Lock className="h-3 w-3 text-violet-400" />
          IP-hashed
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CONFESSION_CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                disabled={submitting}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-violet-600/90 text-white border border-violet-500/40'
                    : 'bg-zinc-950/70 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                #{cat}
              </button>
            );
          })}
        </div>

        <Textarea
          rows={4}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (feedback) setFeedback(null);
          }}
          maxLength={MAX_CHARS + 50}
          placeholder="What's on your mind that you can't tell anyone else..."
          disabled={submitting}
          error={
            isTooLong
              ? `Please keep your confession under ${MAX_CHARS} characters.`
              : isTooShort
                ? `Write at least ${MIN_CHARS} characters.`
                : undefined
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`text-xs tabular-nums ${
              isTooLong
                ? 'text-rose-400 font-medium'
                : content.length > MAX_CHARS * 0.9
                  ? 'text-amber-400'
                  : 'text-zinc-500'
            }`}
          >
            {content.length} / {MAX_CHARS}
          </span>

          <Button type="submit" disabled={!canSubmit} loading={submitting}>
            <Send className="h-3.5 w-3.5" />
            <span>{submitting ? 'Moderating & Posting...' : 'Post Anonymously'}</span>
          </Button>
        </div>
      </form>

      {feedback && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
              : feedback.type === 'warning'
                ? 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                : 'border-rose-500/30 bg-rose-950/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="leading-relaxed">{feedback.message}</p>
        </div>
      )}
    </section>
  );
}
