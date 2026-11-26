'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Flag,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  AdminStatusCounts,
  Confession,
  ConfessionStatus,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { ConfessionCardSkeleton } from '@/components/ui/Skeleton';
import { AIReaction } from '@/components/AIReaction';

const STATUS_TABS: { value: ConfessionStatus; label: string }[] = [
  { value: 'flagged', label: 'Flagged' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_BADGES: Record<ConfessionStatus, string> = {
  flagged: 'border-amber-500/30 bg-amber-950/40 text-amber-300',
  pending: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
  approved: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
  rejected: 'border-rose-500/30 bg-rose-950/40 text-rose-300',
};

const EMPTY_COUNTS: AdminStatusCounts = {
  all: 0,
  flagged: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<ConfessionStatus>('flagged');
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [counts, setCounts] = useState<AdminStatusCounts>(EMPTY_COUNTS);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchModerated = useCallback(
    async (status: ConfessionStatus, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ status });
        if (q.trim()) params.set('q', q.trim());

        const res = await fetch(`/api/admin/moderate?${params.toString()}`, {
          cache: 'no-store',
        });

        if (res.status === 401 || res.status === 403) {
          router.replace('/admin/login');
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load confessions.');
        }

        const list: Confession[] = Array.isArray(data?.confessions)
          ? data.confessions
          : [];
        setConfessions(list);
        if (data?.counts) {
          setCounts(data.counts);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load confessions.');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchModerated(activeStatus, searchQuery);
  }, [activeStatus, searchQuery, fetchModerated]);

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'delete' | 'regenerate_ai'
  ) => {
    if (actingId) return;
    setActingId(id);
    setError(null);

    try {
      const reason = noteById[id]?.trim();
      const res = await fetch('/api/admin/moderate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          ...(reason ? { reason } : {}),
        }),
      });

      if (res.status === 401 || res.status === 403) {
        router.replace('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Failed to ${action} confession.`);
      }

      if (action === 'regenerate_ai' && data?.confession) {
        setConfessions((prev) =>
          prev.map((c) => (c.id === id ? data.confession : c))
        );
      } else {
        await fetchModerated(activeStatus, searchQuery);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Moderation Dashboard
          </h1>
          <p className="text-xs text-zinc-400">
            Review AI-flagged or user-reported confessions and manage wall visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchModerated(activeStatus, searchQuery)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.value;
            const count = counts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveStatus(tab.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-zinc-900/70 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                    isActive ? 'bg-violet-500/50 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter confessions..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/70 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      ) : confessions.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-300">
            No {activeStatus} confessions
          </p>
          <p className="text-xs text-zinc-500">
            Everything in this queue is clear.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {confessions.map((confession) => {
            const isBusy = actingId === confession.id;
            return (
              <div
                key={confession.id}
                className="glass-card rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_BADGES[confession.status]}`}
                    >
                      {confession.status}
                    </span>
                    <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[10px] text-zinc-400">
                      #{confession.category || 'Confession'}
                    </span>
                    {confession.report_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/30 px-2 py-0.5 text-[10px] text-rose-300">
                        <Flag className="h-2.5 w-2.5" />
                        {confession.report_count} report{confession.report_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(confession.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">
                  {confession.content}
                </p>

                {confession.moderation_reason && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{confession.moderation_reason}</span>
                  </div>
                )}

                <AIReaction
                  emoji={confession.ai_emoji}
                  comment={confession.ai_comment}
                />

                <input
                  type="text"
                  value={noteById[confession.id] ?? ''}
                  onChange={(e) =>
                    setNoteById((prev) => ({
                      ...prev,
                      [confession.id]: e.target.value,
                    }))
                  }
                  placeholder="Optional admin moderation note..."
                  className="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500/60 focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/70">
                  {confession.status !== 'approved' && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={isBusy}
                      disabled={Boolean(actingId)}
                      onClick={() => handleAction(confession.id, 'approve')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>
                  )}

                  {confession.status !== 'rejected' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={isBusy}
                      disabled={Boolean(actingId)}
                      onClick={() => handleAction(confession.id, 'reject')}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    loading={isBusy}
                    disabled={Boolean(actingId)}
                    onClick={() => handleAction(confession.id, 'regenerate_ai')}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>Regenerate AI</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    loading={isBusy}
                    disabled={Boolean(actingId)}
                    onClick={() => handleAction(confession.id, 'delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
