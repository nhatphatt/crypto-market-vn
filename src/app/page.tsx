import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { MarketOverviewBand } from "@/components/MarketOverviewBand";
import { BlogCard } from "@/components/BlogCard";
import { UpdatedBadge } from "@/components/UpdatedBadge";
import { HomeMarkets } from "@/components/HomeMarkets";
import { HeroLiveCoins } from "@/components/HeroLiveCoins";
import { fetchFearGreed } from "@/lib/fear-greed";
import {
  enrichGlobalStats,
  fetchGlobalMarket,
  fetchTopCoins,
} from "@/lib/markets";
import { getLatestPosts, getNewsMeta } from "@/lib/news";



/**
 * Design read: crypto market dashboard cho trader VN.
 * VARIANCE 5 · MOTION 3 · DENSITY 7 (cockpit, không gallery).
 * Hero = split text + coin live (lấp trống). Không border-t cắt section.
 */
export default async function HomePage() {
  const [coins, globalRaw, fear, posts, newsMeta] = await Promise.all([
    fetchTopCoins(30),
    fetchGlobalMarket(),
    fetchFearGreed(),
    getLatestPosts(6),
    getNewsMeta(),
  ]);

  const global = enrichGlobalStats(globalRaw, coins);
  const updatedAt = global?.updated_at || new Date().toISOString();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:space-y-7 md:px-6 md:py-8">
      {/*
        Hero split: trái copy/CTA, phải 6 coin live (visual density).
        Không card marketing chỉ chữ + gradient.
      */}
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
        <div className="flex max-w-xl flex-col justify-center py-1 md:py-2">
          <h1 className="text-[1.75rem] font-semibold leading-[1.18] tracking-tight text-body sm:text-4xl sm:leading-[1.12] md:text-[2.65rem] md:leading-[1.1]">
            Nắm bắt thị trường crypto mỗi ngày
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-strong sm:mt-4 sm:text-lg sm:leading-relaxed">
            Giá realtime, biến động 24 giờ, tâm lý market và tin nóng.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7">
            <Link
              href="/thi-truong"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-ink transition-colors hover:bg-primary-active active:scale-[0.98]"
            >
              Thị trường
              <ArrowRight weight="bold" className="h-5 w-5" />
            </Link>
            <Link
              href="/tin-tuc"
              className="inline-flex h-12 items-center rounded-lg border border-hairline bg-surface-card px-6 text-base font-semibold text-body hover:border-primary/35"
            >
              Tin tức
            </Link>
          </div>
          <div className="mt-5 text-sm text-muted sm:mt-6 sm:text-[15px]">
            <UpdatedBadge iso={updatedAt} label="Cập nhật" compact />
          </div>
        </div>

        <div className="min-w-0">
          <HeroLiveCoins coins={coins} />
        </div>
      </section>

      {/* Metrics – sát hero, không title dư + divider */}
      <MarketOverviewBand global={global} fear={fear} />

      {/* Bảng giá / movers */}
      <HomeMarkets coins={coins} />

      {/* Tin – chỉ gap, không border-t full page */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-body md:text-lg">
            Tin nóng
          </h2>
          <Link
            href="/tin-tuc"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-strong hover:text-primary"
          >
            Tất cả
            <ArrowRight weight="bold" className="h-3.5 w-3.5" />
          </Link>
        </div>
        {posts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-hairline bg-surface-card p-8 text-center text-sm text-muted">
            Chưa có tin. Quay lại sau.
          </div>
        )}
        {newsMeta.total > 0 && (
          <p className="mt-2 text-xs text-muted">
            {Math.min(posts.length, newsMeta.total)} bài hiển thị
          </p>
        )}
      </section>
    </div>
  );
}
