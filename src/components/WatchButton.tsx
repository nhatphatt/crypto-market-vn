"use client";

import { Star } from "@phosphor-icons/react";
import { useWatchlist } from "@/lib/use-watchlist";

export function WatchButton({ coinId }: { coinId: string }) {
  const { has, toggle, ready } = useWatchlist();
  if (!ready) {
    return (
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-surface-card opacity-50" />
    );
  }
  const on = has(coinId);
  return (
    <button
      type="button"
      onClick={() => toggle(coinId)}
      aria-label={on ? "Bỏ theo dõi" : "Theo dõi"}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors",
        on
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-hairline bg-surface-card text-muted-strong hover:text-body",
      ].join(" ")}
    >
      <Star weight={on ? "fill" : "regular"} className="h-4 w-4" />
      {on ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}
