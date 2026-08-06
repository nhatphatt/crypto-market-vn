"use client";

import { useEffect, useState } from "react";
import type { CoinMarket } from "./types";
import { fetchTopCoinsClient } from "./markets-client";

/**
 * Coins SSR/static + luôn refresh client (CoinGecko → Binance).
 * Đảm bảo live luôn có vốn hóa, logo, % 1h/7d khi CG available.
 */
export function useMarketCoins(initial: CoinMarket[], limit = 100) {
  const [coins, setCoins] = useState<CoinMarket[]>(initial);
  const [loading, setLoading] = useState(initial.length < 5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial.length > 0) {
      setCoins(initial);
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    if (initial.length < 5) setLoading(true);

    void (async () => {
      try {
        const list = await fetchTopCoinsClient(limit);
        if (cancelled) return;
        if (list.length > 0) {
          setCoins(list);
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
    void fetchTopCoinsClient(limit)
      .then((list) => {
        if (list.length) {
          setCoins(list);
          setError(null);
        } else {
          setError("Không tải được dữ liệu giá. Thử lại sau vài phút.");
        }
      })
      .catch(() =>
        setError("Không tải được dữ liệu giá. Thử lại sau vài phút."),
      )
      .finally(() => setLoading(false));
  };

  return { coins, loading, error, reload };
}
