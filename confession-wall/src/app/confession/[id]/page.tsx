'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Share2, Shuffle } from 'lucide-react';
import type { Confession, ReactionEmoji } from '@/types';
import { ConfessionCard } from '@/components/ConfessionCard';
import { ConfessionCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import {
  applyReactionToggle,
  createEmptyReactions,
  type ReactedMap,
  readReactedMap,
  writeReactedMap,
} from '@/lib/reactionClient';
import { useRealtime } from '@/hooks/useRealtime';

export default function ConfessionPermalinkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reactedMap, setReactedMap] = useState<ReactedMap>({});
  const [loadingRandom, setLoadingRandom] = useState(false);

  useEffect(() => {
    setReactedMap(readReactedMap());
  }, []);

  const fetchConfession = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/confessions/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Confession not found.');
      }
      setConfession(data?.confession ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confession not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConfession();
  }, [fetchConfession]);

  useRealtime({
    onConfessionUpsert: useCallback(
      (incoming: Confession) => {
        if (incoming.id !== id) return;
        if (incoming.status !== 'approved') {
          setConfession(null);
          setError('This confession is no longer available.');
          return;
        }
        setConfession((prev) => ({
          ...incoming,
          reactions: incoming.reactions ?? prev?.reactions ?? createEmptyReactions(),
        }));
      },
      [id]
    ),
    onConfessionDelete: useCallback(
      (deletedId: string) => {
        if (deletedId === id) {
          setConfession(null);
          setError('This confession has been removed.');
        }
      },
      [id]
    ),
    onReactionChange: useCallback(
      (confessionId: string, emoji: ReactionEmoji, count: number) => {
        if (confessionId !== id) return;
        setConfession((prev) =>
          prev
            ? {
                ...prev,
                reactions: {
                  ...createEmptyReactions(),
                  ...prev.reactions,
                  [emoji]: count,
                },
              }
            : null
        );
      },
      [id]
    ),
  });

  const handleReact = async (confessionId: string, emoji: ReactionEmoji) => {
    const currentActive = reactedMap[confessionId] ?? [];
    const isAlreadyActive = currentActive.includes(emoji);
    const action: 'add' | 'remove' = isAlreadyActive ? 'remove' : 'add';

    const nextActiveList = isAlreadyActive
      ? currentActive.filter((e) => e !== emoji)
      : [...currentActive, emoji];
    const nextMap = { ...reactedMap, [confessionId]: nextActiveList };
    setReactedMap(nextMap);
    writeReactedMap(nextMap);

    setConfession((prev) =>
      prev
        ? { ...prev, reactions: applyReactionToggle(prev.reactions, emoji, action) }
        : null
    );

    try {
      const res = await fetch(`/api/confessions/${confessionId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, action }),
      });
      if (!res.ok) throw new Error('Failed to react');
      const data = await res.json();
      if (typeof data?.count === 'number') {
        setConfession((prev) =>
          prev
            ? {
                ...prev,
                reactions: {
                  ...createEmptyReactions(),
                  ...prev.reactions,
                  [emoji]: data.count,
                },
              }
            : null
        );
      }
    } catch {
      const revertedMap = { ...reactedMap, [confessionId]: currentActive };
      setReactedMap(revertedMap);
      writeReactedMap(revertedMap);

      setConfession((prev) =>
        prev
          ? {
              ...prev,
              reactions: applyReactionToggle(
                prev.reactions,
                emoji,
                action === 'add' ? 'remove' : 'add'
              ),
            }
          : null
      );
    }
  };

  const handleReport = async (confessionId: string, reason: string) => {
    try {
      const res = await fetch(`/api/confessions/${confessionId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || 'Could not submit report.' };
      }
      setConfession(null);
      setError('Thank you. This confession has been flagged for admin review.');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while reporting.' };
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleRandomAnother = async () => {
    if (loadingRandom) return;
    setLoadingRandom(true);
    try {
      const res = await fetch('/api/confessions/random', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.confession?.id) {
        router.push(`/confession/${data.confession.id}`);
      }
    } finally {
      setLoadingRandom(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Confession Wall</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            loading={loadingRandom}
            onClick={handleRandomAnother}
          >
            <Shuffle className="h-3.5 w-3.5 text-violet-400" />
            <span>Another Random</span>
          </Button>

          {confession && (
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Link</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {loading && <ConfessionCardSkeleton />}

      {!loading && error && (
        <div className="glass-card rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-rose-400">{error}</p>
          <Link
            href="/"
            className="inline-block text-xs font-medium text-violet-400 hover:text-violet-300 underline underline-offset-4"
          >
            Return to all confessions
          </Link>
        </div>
      )}

      {!loading && !error && confession && (
        <ConfessionCard
          confession={confession}
          activeEmojis={reactedMap[confession.id] ?? []}
          onReact={handleReact}
          onReport={handleReport}
          showPermalink={false}
        />
      )}
    </div>
  );
}
