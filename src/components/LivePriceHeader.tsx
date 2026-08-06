"use client";

import { useEffect, useState } from "react";
import { toBinanceSymbol } from "@/lib/binance";
import { formatUsd, formatVnd } from "@/lib/format";
import { PriceChange } from "./PriceChange";
import type { MiniTickerWsMessage } from "@/lib/binance-ws";

export function LivePriceHeader({
  symbol,
  initialPrice,
  initialChange24,
  vndRate,
}: {
  symbol: string;
  initialPrice: number;
  initialChange24: number | null | undefined;
  vndRate: number | null;
}) {
  const [price, setPrice] = useState(initialPrice);
  const [change24, setChange24] = useState(initialChange24);
  const [live, setLive] = useState(false);
  const pair = toBinanceSymbol(symbol);

  useEffect(() => {
    if (!pair) return;
    let alive = true;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!alive) return;
      ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@miniTicker`,
      );
      ws.onopen = () => {
        if (alive) setLive(true);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as MiniTickerWsMessage;
          const last = Number(msg.c);
          const open = Number(msg.o);
          if (!Number.isFinite(last)) return;
          setPrice(last);
          if (open > 0) setChange24(((last - open) / open) * 100);
          setLive(true);
        } catch {
          /* */
        }
      };
      ws.onclose = () => {
        setLive(false);
        if (alive) timer = setTimeout(connect, 2000);
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
      if (timer) clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* */
      }
    };
  }, [pair]);

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <p className="font-mono text-3xl font-bold tracking-tight text-body md:text-4xl">
          {formatUsd(price)}
        </p>
        <PriceChange value={change24} className="text-base" />
        {pair && (
          <span
            className={[
              "mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              live
                ? "bg-trading-up/15 text-trading-up"
                : "bg-surface-elevated text-muted",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                live ? "bg-trading-up animate-pulse" : "bg-muted",
              ].join(" ")}
            />
            {live ? "Trực tiếp" : "…"}
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-sm text-muted">
        ≈ {formatVnd(price, vndRate)}
        {pair ? ` · ${pair}` : ""}
      </p>
    </div>
  );
}
