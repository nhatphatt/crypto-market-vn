"use client";

import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { NewsCover } from "./NewsCover";

/**
 * Card tin: cả khối là 1 link (không cần “Đọc tiếp”).
 * Title + meta + tóm tắt đủ; hover làm nổi card.
 */
export function BlogCard({ post }: { post: NewsPost }) {
  const title = post.titleVi || post.title;
  const summary = post.summaryVi || post.summary;
  const isHot =
    post.tags?.includes("hot") || post.tags?.includes("moi");

  return (
    <article className="h-full">
      <Link
        href={`/tin-tuc/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-surface-card transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-primary/25"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-elevated">
          <NewsCover
            featuredImage={post.featuredImage}
            brandCard={post.brandCard}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
          />
          {isHot && (
            <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
              Mới
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="rounded-sm bg-surface-elevated px-2 py-0.5 font-medium text-muted-strong">
              {post.source}
            </span>
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
          </div>

          <h3 className="mt-2.5 line-clamp-2 text-base font-semibold leading-snug text-body transition-colors group-hover:text-primary">
            {title}
          </h3>

          {summary ? (
            <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
              {summary}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          {post.coins.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1 border-t border-hairline/60 pt-3">
              {post.coins.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="rounded-sm bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-strong"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
