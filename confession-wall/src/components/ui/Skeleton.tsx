'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-zinc-800/70 ${className}`}
    />
  );
}

export function ConfessionCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3 space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-full" />
      </div>
    </div>
  );
}
