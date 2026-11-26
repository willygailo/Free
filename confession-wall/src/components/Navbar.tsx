'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Shield, Shuffle } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const [pickingRandom, setPickingRandom] = useState(false);

  const handleSurpriseMe = async () => {
    if (pickingRandom) return;
    setPickingRandom(true);
    try {
      const res = await fetch('/api/confessions/random', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.confession?.id) {
        router.push(`/confession/${data.confession.id}`);
      }
    } finally {
      setPickingRandom(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-zinc-100 transition-opacity hover:opacity-90"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 group-hover:bg-violet-600/30 transition-colors">
            <Flame className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight leading-none">
              Confession Wall
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Anonymous • AI-Moderated
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSurpriseMe}
            disabled={pickingRandom}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Shuffle className="h-3.5 w-3.5 text-violet-400" />
            <span className="hidden sm:inline">Surprise Me</span>
          </button>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent hover:border-zinc-800 transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
