"use client";

import { useMemo, useState } from "react";
import { BlogCard } from "@/components/BlogCard";
import type { NewsPost } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 12;

export function NewsBrowser({
  posts,
  updatedAt,
}: {
  posts: NewsPost[];
  updatedAt?: string | null;
}) {
  const [page, setPage] = useState(1);
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const slice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return posts.slice(start, start + PAGE_SIZE);
  }, [posts, safePage]);

  if (total === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-hairline bg-surface-card p-12 text-center">
        <p className="text-base font-medium text-body">Chưa có tin nào</p>
        <p className="mt-2 text-sm text-muted">
          Dữ liệu tin đang được cập nhật. Vui lòng quay lại sau.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-body md:text-4xl">
          Tin tức
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
          Tin mới và đang nóng. Bấm vào bài để đọc đầy đủ.
        </p>
        <p className="mt-3 text-xs text-muted">
          {total} bài
          {totalPages > 1
            ? ` · ${totalPages} trang (đang xem trang ${safePage})`
            : ""}
          {updatedAt && updatedAt !== new Date(0).toISOString()
            ? ` · Cập nhật ${formatDateTime(updatedAt)}`
            : ""}
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {slice.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
          aria-label="Phân trang tin tức"
        >
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-10 items-center rounded-md border border-hairline bg-surface-card px-3 text-sm font-semibold text-body disabled:opacity-40 hover:border-primary/40"
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => {
              if (totalPages <= 9) return true;
              return (
                n === 1 ||
                n === totalPages ||
                Math.abs(n - safePage) <= 2
              );
            })
            .reduce<(number | "…")[]>((acc, n, idx, arr) => {
              if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((item, i) =>
              item === "…" ? (
                <span key={`e-${i}`} className="px-1 text-muted">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={[
                    "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2.5 text-sm font-semibold tabular-nums",
                    item === safePage
                      ? "border-primary bg-primary text-ink"
                      : "border-hairline bg-surface-card text-body hover:border-primary/40",
                  ].join(" ")}
                >
                  {item}
                </button>
              ),
            )}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex h-10 items-center rounded-md border border-hairline bg-surface-card px-3 text-sm font-semibold text-body disabled:opacity-40 hover:border-primary/40"
          >
            Sau
          </button>
        </nav>
      )}
    </>
  );
}
