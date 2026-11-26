'use client';

import { useEffect, useState } from 'react';
import { Flame, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { ConfessionForm } from '@/components/ConfessionForm';
import { ConfessionList } from '@/components/ConfessionList';
import { useConfessions } from '@/hooks/useConfessions';
import { useRealtime } from '@/hooks/useRealtime';
import {
  CONFESSION_CATEGORIES,
  type ConfessionCategory,
  type HealthStatus,
} from '@/types';

export default function HomePage() {
  const {
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
  } = useConfessions();

  const { isLive } = useRealtime({
    onConfessionUpsert: upsertConfession,
    onConfessionDelete: removeConfession,
    onReactionChange: updateReactionCount,
  });

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthStatus | null) => {
        if (data) setHealth(data);
      })
      .catch(() => undefined);
  }, []);

  const categories: Array<ConfessionCategory | 'All'> = [
    'All',
    ...CONFESSION_CATEGORIES,
  ];

  return (
    <div className="space-y-8">
      <ConfessionForm onSubmit={submitConfession} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Latest Confessions
            </h2>
            {!loading && (
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400 tabular-nums">
                {total}
              </span>
            )}
            {health && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/70 px-2.5 py-0.5 text-[11px] text-zinc-400">
                <Sparkles className="h-3 w-3 text-violet-400" />
                <span>
                  {health.ai.configured ? 'Nemotron AI' : 'AI Fallback'} •{' '}
                  {isLive
                    ? 'Realtime'
                    : health.storage === 'supabase'
                      ? 'Supabase'
                      : 'Local Mode'}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/80 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Newest
              </button>
              <button
                type="button"
                onClick={() => setSortBy('top')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  sortBy === 'top'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Flame className="h-3 w-3 text-amber-400" />
                Top
              </button>
            </div>

            <button
              type="button"
              onClick={fetchConfessions}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search confessions by keyword..."
              className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 py-2 pl-10 pr-9 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/70 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-violet-600/90 text-white border border-violet-500/40'
                      : 'bg-zinc-900/70 text-zinc-400 border border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {cat === 'All' ? 'All' : `#${cat}`}
                </button>
              );
            })}
          </div>
        </div>

        <ConfessionList
          confessions={confessions}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          error={error}
          reactedMap={reactedMap}
          onReact={reactToConfession}
          onReport={reportConfession}
          onLoadMore={loadMore}
          onRetry={fetchConfessions}
        />
      </section>
    </div>
  );
}
