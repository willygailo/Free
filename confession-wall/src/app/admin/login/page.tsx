'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Invalid admin password.');
        setLoading(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Network error while signing in.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Confession Wall</span>
      </Link>

      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Admin Access</h1>
            <p className="text-xs text-zinc-400">
              Sign in to moderate flagged and pending confessions.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium text-zinc-300"
            >
              Admin Password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/70 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
