"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, Star } from "@phosphor-icons/react";
import type { CoinMarket } from "@/lib/types";
import { useBinanceLive } from "@/lib/use-binance-live";
import { useMarketCoins } from "@/lib/use-market-coins";
import { useWatchlist } from "@/lib/use-watchlist";
import { HotTicker } from "./HotTicker";
import { MarketTable } from "./MarketTable";
import { MoverList } from "./MoverList";

type Filter = "all" | "gainers" | "losers" | "hot" | "watch";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Top vốn hóa" },
  { id: "gainers", label: "Tăng mạnh" },
  { id: "losers", label: "Giảm mạnh" },
  { id: "hot", label: "Volume cao" },
  { id: "watch", label: "Theo dõi" },
];

function changeOf(
  c: CoinMarket,
  quotes: ReturnType<typeof useBinanceLive>["quotes"],
) {
  const key = c.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  return quotes[key]?.change24 ?? c.price_change_percentage_24h ?? 0;
}

/**
 * Toàn bộ khối market /thi-truong:
 * 1 stream Binance cho ticker + movers + bảng (không lặp WS).
 */
export function MarketWorkspace({ coins: initialCoins }: { coins: CoinMarket[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { ids: watchIds, toggle, ready } = useWatchlist();
  const { coins, loading, error, reload } = useMarketCoins(initialCoins, 100);

  const symbols = useMemo(() => coins.map((c) => c.symbol), [coins]);
  const { quotes, live } = useBinanceLive(symbols);

  const hot = useMemo(() => {
    return coins
      .filter((c) => {
        const key = c.symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          quotes[key] != null ||
          [
            "btc",
            "eth",
            "bnb",
            "sol",
            "xrp",
            "doge",
            "ada",
            "ton",
            "avax",
            "link",
            "sui",
            "dot",
            "trx",
            "near",
          ].includes(key)
        );
      })
      .slice(0, 14);
  }, [coins, quotes]);

  const gainers = useMemo(
    () =>
      coins
        .slice()
        .sort((a, b) => changeOf(b, quotes) - changeOf(a, quotes))
        .slice(0, 8),
    [coins, quotes],
  );

  const losers = useMemo(
    () =>
      coins
        .slice()
        .sort((a, b) => changeOf(a, quotes) - changeOf(b, quotes))
        .slice(0, 8),
    [coins, quotes],
  );

  const filtered = useMemo(() => {
    let list = coins.slice();
    const query = q.trim().toLowerCase();

    if (filter === "gainers") {
      list = list
        .filter((c) => changeOf(c, quotes) > 0)
        .sort((a, b) => changeOf(b, quotes) - changeOf(a, quotes));
    } else if (filter === "losers") {
      list = list
        .filter((c) => changeOf(c, quotes) < 0)
        .sort((a, b) => changeOf(a, quotes) - changeOf(b, quotes));
    } else if (filter === "hot") {
      list = list
        .slice()
        .sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0));
    } else if (filter === "watch") {
      list = list.filter((c) => watchIds.includes(c.id));
    }

    if (query) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.symbol.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query),
      );
    }

    return list;
  }, [coins, q, filter, watchIds, quotes]);

  const tableTitle =
    filter === "gainers"
      ? "Top tăng 24 giờ"
      : filter === "losers"
        ? "Top giảm 24 giờ"
        : filter === "hot"
          ? "Volume cao nhất"
          : filter === "watch"
            ? "Danh sách theo dõi"
            : "Bảng giá top 100";

  return (
    <div className="space-y-6">
      {/* Coin thịnh hành – realtime */}
      <HotTicker
        coins={hot.length ? hot : coins.slice(0, 12)}
        quotes={quotes}
        live={live}
      />

      {/* Top tăng / giảm – cùng quotes realtime */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MoverList title="Top tăng 24 giờ" coins={gainers} quotes={quotes} />
        <MoverList title="Top giảm 24 giờ" coins={losers} quotes={quotes} />
      </div>

      {/* Cùng 1 dòng: Top vốn hóa | Tăng mạnh | Giảm mạnh | … + tìm kiếm */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                filter === f.id
                  ? "bg-primary text-ink"
                  : "border border-hairline bg-surface-card text-muted-strong hover:text-body",
              ].join(" ")}
            >
              {f.id === "watch" && (
                <Star weight="fill" className="h-3.5 w-3.5" />
              )}
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-[9.5rem] shrink-0 sm:w-52 md:w-60">
          <MagnifyingGlass
            weight="bold"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted sm:left-3"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm coin…"
            className="h-10 w-full rounded-md border border-hairline bg-surface-card pl-8 pr-2 text-sm text-body outline-none placeholder:text-muted focus:border-primary/40 sm:pl-10 sm:pr-3"
          />
        </div>
      </div>

      {ready && filter === "all" && watchIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Đang theo dõi:</span>
          {coins
            .filter((c) => watchIds.includes(c.id))
            .slice(0, 16)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-muted-strong hover:text-body"
                title="Bỏ theo dõi"
              >
                <Star weight="fill" className="h-3 w-3 text-primary" />
                {c.symbol.toUpperCase()}
              </button>
            ))}
        </div>
      )}

      {loading && coins.length === 0 && (
        <p className="rounded-xl border border-hairline bg-surface-card px-5 py-10 text-center text-sm text-muted">
          Đang tải giá từ Binance…
        </p>
      )}

      {error && coins.length === 0 && !loading && (
        <div className="rounded-xl border border-hairline bg-surface-card px-5 py-10 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {(coins.length > 0 || (!loading && !error)) && (
        <MarketTable
          coins={filtered}
          title={tableTitle}
          quotes={quotes}
          live={live}
          showLiveBadge
        />
      )}

      {filter === "watch" && filtered.length === 0 && coins.length > 0 && (
        <p className="text-center text-sm text-muted">
          Chưa có coin trong danh sách theo dõi. Mở trang chi tiết coin và bấm
          ngôi sao để thêm.
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Giá và % 24 giờ realtime từ Binance (cặp USDT). Vốn hóa, volume 24 giờ
        và % 1h / 7d lấy từ CoinGecko (cập nhật theo chu kỳ trang). Hàng nháy
        xanh/đỏ khi giá vừa đổi.
      </p>
    </div>
  );
}
