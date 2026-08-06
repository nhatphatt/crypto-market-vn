"use client";

import { useEffect, useState } from "react";
import type { CoinMarket } from "./types";
import { fetchTopCoinsClient } from "./markets-client";

/**
 * Coins từ SSR/static; nếu trống hoặc cần refresh → load Binance client.
 */
export function useMarketCoins(initial: CoinMarket[], limit = 100) {
  const [coins, setCoins] = useState<CoinMarket[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCoins(initial);
    if (initial.length > 0) setLoading(false);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const need = initial.length < 5;

    // Luôn soft-refresh từ Binance; nếu SSR trống thì full loading
    if (need) setLoading(true);

    void (async () => {
      try {
        const list = await fetchTopCoinsClient(limit, 10000);
        if (cancelled) return;
        if (list.length > 0) {
          // Giữ market_cap từ SSR nếu cùng id
          if (initial.length > 0) {
            const byId = new Map(initial.map((c) => [c.id, c]));
            const merged = list.map((c) => {
              const prev = byId.get(c.id);
              if (!prev) return c;
              return {
                ...c,
                name: prev.name || c.name,
                image: prev.image || c.image,
                market_cap: prev.market_cap || c.market_cap,
                market_cap_rank: prev.market_cap_rank || c.market_cap_rank,
                price_change_percentage_1h_in_currency:
                  prev.price_change_percentage_1h_in_currency ??
                  c.price_change_percentage_1h_in_currency,
                price_change_percentage_7d_in_currency:
                  prev.price_change_percentage_7d_in_currency ??
                  c.price_change_percentage_7d_in_currency,
              };
            });
            // thêm coin SSR không có trên Binance list
            for (const p of initial) {
              if (!merged.some((m) => m.id === p.id)) merged.push(p);
            }
            setCoins(merged.slice(0, limit));
          } else {
            setCoins(list);
          }
          setError(null);
        } else if (initial.length === 0) {
          setError("Không tải được dữ liệu giá. Kiểm tra mạng rồi thử lại.");
        }
      } catch {
        if (!cancelled && initial.length === 0) {
          setError("Không tải được dữ liệu giá. Kiểm tra mạng rồi thử lại.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const reload = () => {
    setLoading(true);
    setError(null);
    void fetchTopCoinsClient(limit, 10000)
      .then((list) => {
        if (list.length) setCoins(list);
        else setError("Không tải được dữ liệu giá. Thử lại sau vài phút.");
      })
      .catch(() =>
        setError("Không tải được dữ liệu giá. Thử lại sau vài phút."),
      )
      .finally(() => setLoading(false));
  };

  return { coins, loading, error, reload };
}
