'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyReactionToggle,
  createEmptyReactions,
  type ReactedMap,
  readReactedMap,
  writeReactedMap,
} from '@/lib/reactionClient';
import {
  type Confession,
  type ConfessionCategory,
  type ConfessionSort,
  type ReactionEmoji,
} from '@/types';

export { createEmptyReactions };

export interface SubmitConfessionResult {
  ok: boolean;
  confession?: Confession;
  status?: string;
  error?: string;
  moderationReason?: string | null;
}

const PAGE_SIZE = 20;

export function useConfessions() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ConfessionCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<ConfessionSort>('newest');
  const [reactedMap, setReactedMap] = useState<ReactedMap>({});

  useEffect(() => {
    setReactedMap(readReactedMap());
  }, []);

  const buildQueryString = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      params.set('sort', sortBy);
      if (selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      return params.toString();
    },
    [searchQuery, selectedCategory, sortBy]
  );

  const fetchConfessions = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await fetch(`/api/confessions?${buildQueryString(0)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load confessions.');
      }

      const list: Confession[] = Array.isArray(data?.confessions)
        ? data.confessions
        : [];

      setConfessions(list);
      setTotal(typeof data?.total === 'number' ? data.total : list.length);
      setHasMore(Boolean(data?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load confessions.');
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/confessions?${buildQueryString(confessions.length)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load more confessions.');
      }
      const nextList: Confession[] = Array.isArray(data?.confessions)
        ? data.confessions
        : [];
      setConfessions((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const unique = nextList.filter((c) => !seen.has(c.id));
        return [...prev, ...unique];
      });
      setTotal(typeof data?.total === 'number' ? data.total : confessions.length + nextList.length);
      setHasMore(Boolean(data?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more confessions.');
    } finally {
      setLoadingMore(false);
    }
  }, [buildQueryString, confessions.length, hasMore, loadingMore]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  const submitConfession = useCallback(
    async (
      content: string,
      category: ConfessionCategory = 'Confession'
    ): Promise<SubmitConfessionResult> => {
      try {
        const res = await fetch('/api/confessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, category }),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            ok: false,
            error: data?.error || 'Unable to submit confession.',
            moderationReason:
              data?.moderation?.reason ?? data?.moderation_reason ?? null,
            status: data?.status,
          };
        }

        const created: Confession | undefined = data?.confession;
        if (created && created.status === 'approved') {
          const matchesCategory =
            selectedCategory === 'All' || created.category === selectedCategory;
          const matchesQuery =
            !searchQuery.trim() ||
            created.content.toLowerCase().includes(searchQuery.trim().toLowerCase());

          if (matchesCategory && matchesQuery && sortBy === 'newest') {
            setConfessions((prev) => {
              if (prev.some((c) => c.id === created.id)) return prev;
              return [created, ...prev];
            });
            setTotal((prev) => prev + 1);
          }
        }

        return {
          ok: true,
          confession: created,
          status: created?.status,
          moderationReason:
            created?.moderation_reason ?? data?.moderation?.reason ?? null,
        };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error ? err.message : 'Network error while submitting.',
        };
      }
    },
    [searchQuery, selectedCategory, sortBy]
  );

  const reactToConfession = useCallback(
    async (confessionId: string, emoji: ReactionEmoji) => {
      const currentActive = reactedMap[confessionId] ?? [];
      const isAlreadyActive = currentActive.includes(emoji);
      const action: 'add' | 'remove' = isAlreadyActive ? 'remove' : 'add';

      // Optimistic reaction count + browser state update
      const nextActiveList = isAlreadyActive
        ? currentActive.filter((e) => e !== emoji)
        : [...currentActive, emoji];
      const nextMap = { ...reactedMap, [confessionId]: nextActiveList };
      setReactedMap(nextMap);
      writeReactedMap(nextMap);

      setConfessions((prev) =>
        prev.map((c) =>
          c.id === confessionId
            ? { ...c, reactions: applyReactionToggle(c.reactions, emoji, action) }
            : c
        )
      );

      try {
        const res = await fetch(`/api/confessions/${confessionId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji, action }),
        });

        if (!res.ok) {
          throw new Error('Failed to save reaction');
        }

        const data = await res.json();
        if (typeof data?.count === 'number') {
          setConfessions((prev) =>
            prev.map((c) =>
              c.id === confessionId
                ? {
                    ...c,
                    reactions: {
                      ...createEmptyReactions(),
                      ...c.reactions,
                      [emoji]: data.count,
                    },
                  }
                : c
            )
          );
        }
      } catch {
        // Revert optimistic update on failure
        const revertedMap = { ...reactedMap, [confessionId]: currentActive };
        setReactedMap(revertedMap);
        writeReactedMap(revertedMap);

        setConfessions((prev) =>
          prev.map((c) =>
            c.id === confessionId
              ? {
                  ...c,
                  reactions: applyReactionToggle(
                    c.reactions,
                    emoji,
                    action === 'add' ? 'remove' : 'add'
                  ),
                }
              : c
          )
        );
      }
    },
    [reactedMap]
  );

  const reportConfession = useCallback(
    async (confessionId: string, reason: string): Promise<{ ok: boolean; error?: string }> => {
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
        setConfessions((prev) => prev.filter((c) => c.id !== confessionId));
        setTotal((prev) => Math.max(0, prev - 1));
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while reporting.' };
      }
    },
    []
  );

  const upsertConfession = useCallback((incoming: Confession) => {
    setConfessions((prev) => {
      if (incoming.status !== 'approved') {
        return prev.filter((c) => c.id !== incoming.id);
      }
      const exists = prev.some((c) => c.id === incoming.id);
      if (exists) {
        return prev.map((c) =>
          c.id === incoming.id
            ? {
                ...incoming,
                reactions: incoming.reactions ?? c.reactions ?? createEmptyReactions(),
              }
            : c
        );
      }
      return [
        {
          ...incoming,
          reactions: incoming.reactions ?? createEmptyReactions(),
        },
        ...prev,
      ];
    });
  }, []);

  const removeConfession = useCallback((id: string) => {
    setConfessions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateReactionCount = useCallback(
    (confessionId: string, emoji: ReactionEmoji, count: number) => {
      setConfessions((prev) =>
        prev.map((c) =>
          c.id === confessionId
            ? {
                ...c,
                reactions: {
                  ...createEmptyReactions(),
                  ...c.reactions,
                  [emoji]: count,
                },
              }
            : c
        )
      );
    },
    []
  );

  return {
    confessions,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    reactedMap,
    fetchConfessions,
    loadMore,
    submitConfession,
    reactToConfession,
    reportConfession,
    upsertConfession,
    removeConfession,
    updateReactionCount,
  };
}
