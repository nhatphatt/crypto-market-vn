"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toBinanceSymbol } from "@/lib/binance";

export type LiveQuote = {
  price: number;
  change24: number;
  /** flash direction for UI pulse */
  flash: "up" | "down" | null;
  pair: string;
};

type TickerPayload = {
  e?: string;
  s?: string; // BTCUSDT
  c?: string; // last
  P?: string; // price change percent
  o?: string;
};

/**
 * Stream giá realtime nhiều coin qua Binance combined @ticker.
 * key map = symbol lowercase (btc, eth…)
 */
export function useBinanceLive(coinSymbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [live, setLive] = useState(false);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const pairs = useMemo(() => {
    const list: { sym: string; pair: string }[] = [];
    const seen = new Set<string>();
    for (const raw of coinSymbols) {
      const pair = toBinanceSymbol(raw);
      if (!pair) continue;
      const sym = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(sym)) continue;
      seen.add(sym);
      list.push({ sym, pair });
    }
    // Binance combined stream chịu tốt ~100–200 stream; top 100 market
    return list.slice(0, 100);
  }, [coinSymbols.join("|")]);

  useEffect(() => {
    if (pairs.length === 0) {
      setLive(false);
      return;
    }

    const streams = pairs
      .map((p) => `${p.pair.toLowerCase()}@ticker`)
      .join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    let ws: WebSocket | null = null;
    let alive = true;
    let reconnect: ReturnType<typeof setTimeout> | null = null;
    const pairToSym = new Map(pairs.map((p) => [p.pair, p.sym]));

    const connect = () => {
      if (!alive) return;
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (alive) setLive(true);
      };

      ws.onmessage = (ev) => {
        try {
          const envelope = JSON.parse(ev.data as string) as {
            data?: TickerPayload;
          };
          const d = envelope.data || (envelope as unknown as TickerPayload);
          if (!d?.s || d.c == null) return;
          const sym = pairToSym.get(d.s);
          if (!sym) return;

          const price = Number(d.c);
          let change24 =
            d.P != null
              ? Number(d.P)
              : d.o
                ? ((price - Number(d.o)) / Number(d.o)) * 100
                : 0;
          if (!Number.isFinite(price)) return;
          if (!Number.isFinite(change24)) change24 = 0;

          setQuotes((prev) => {
            const old = prev[sym]?.price;
            let flash: "up" | "down" | null = null;
            if (old != null && price !== old) {
              flash = price > old ? "up" : "down";
              if (flashTimers.current[sym]) {
                clearTimeout(flashTimers.current[sym]);
              }
              flashTimers.current[sym] = setTimeout(() => {
                setQuotes((p2) => {
                  const cur = p2[sym];
                  if (!cur) return p2;
                  return { ...p2, [sym]: { ...cur, flash: null } };
                });
              }, 450);
            }
            return {
              ...prev,
              [sym]: {
                price,
                change24,
                flash: flash ?? prev[sym]?.flash ?? null,
                pair: d.s!,
              },
            };
          });
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        setLive(false);
        if (alive) reconnect = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* */
        }
      };
    };

    connect();

    return () => {
      alive = false;
      if (reconnect) clearTimeout(reconnect);
      Object.values(flashTimers.current).forEach(clearTimeout);
      flashTimers.current = {};
      try {
        ws?.close();
      } catch {
        /* */
      }
    };
  }, [pairs.map((p) => p.pair).join(",")]);

  return { quotes, live, pairCount: pairs.length };
}

export function mergeLivePrice(
  symbol: string,
  fallback: number,
  quotes: Record<string, LiveQuote>,
): number {
  const q = quotes[symbol.toLowerCase().replace(/[^a-z0-9]/g, "")];
  return q?.price ?? fallback;
}

export function mergeLiveChange24(
  symbol: string,
  fallback: number | null | undefined,
  quotes: Record<string, LiveQuote>,
): number | null | undefined {
  const q = quotes[symbol.toLowerCase().replace(/[^a-z0-9]/g, "")];
  return q?.change24 ?? fallback;
}
