"use client";

import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-container-high/70 rounded-xl ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${
            i === lines - 1 ? "w-3/5" : i === 0 ? "w-full" : "w-4/5"
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs space-y-4 animate-pulse ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-5/6 rounded" />
      </div>
      <div className="pt-2 border-t border-surface-container-high/40 flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 ${className}`}
    >
      <div className="p-4 border-b border-surface-container-high/60 flex items-center justify-between">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="divide-y divide-surface-container-high/40 animate-pulse">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-4 rounded ${
                  cIdx === 0
                    ? "w-24 shrink-0"
                    : cIdx === 1
                    ? "w-36 flex-1"
                    : cIdx === cols - 1
                    ? "w-20 shrink-0"
                    : "w-28"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonKPI({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-3 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="w-6 h-6 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

