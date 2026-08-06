"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
} from "lightweight-charts";
import type { Candle } from "@/lib/binance";
import { toBinanceSymbol } from "@/lib/binance";
import {
  fetchBinanceKlinesFast,
  fetchChartCandlesClient,
  peekChartCache,
} from "@/lib/binance-klines-client";
import {
  RANGE_TO_INTERVAL,
  binanceKlineStreamUrl,
  type ChartRange,
  type KlineWsMessage,
  type MiniTickerWsMessage,
} from "@/lib/binance-ws";
import { formatUsd } from "@/lib/format";

const RANGES = [
  { id: "1d" as const, label: "1 ngày" },
  { id: "7d" as const, label: "7 ngày" },
  { id: "30d" as const, label: "30 ngày" },
  { id: "90d" as const, label: "90 ngày" },
];

function toSeriesData(candles: Candle[]): CandlestickData<Time>[] {
  const map = new Map<number, CandlestickData<Time>>();
  for (const c of candles) {
    if (!Number.isFinite(c.time) || !Number.isFinite(c.close)) continue;
    const t = Math.floor(c.time);
    map.set(t, {
      time: t as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });
  }
  return [...map.values()].sort(
    (a, b) => (a.time as number) - (b.time as number),
  );
}

function sourceLabel(source: string, pair: string | null) {
  if (source === "binance" && pair) return pair;
  if (source === "coingecko-ohlc" || source === "coingecko") return "Lịch sử";
  return "";
}

export function PriceChart({
  coinId,
  symbol,
  initialCandles,
  initialSource,
}: {
  coinId: string;
  symbol: string;
  initialCandles: Candle[];
  initialSource: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<Candle[] | null>(
    initialCandles.length >= 2 ? initialCandles : null,
  );
  const loadGen = useRef(0);

  const [range, setRange] = useState<ChartRange>("7d");
  const [source, setSource] = useState(initialSource);
  const [pairLabel, setPairLabel] = useState<string | null>(
    toBinanceSymbol(symbol),
  );
  const [candleCount, setCandleCount] = useState(initialCandles.length);
  const [loading, setLoading] = useState(initialCandles.length < 2);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(
    initialCandles.length
      ? initialCandles[initialCandles.length - 1].close
      : null,
  );
  const [liveChange, setLiveChange] = useState<number | null>(null);

  const pair = toBinanceSymbol(symbol);
  const canStream = Boolean(pair) && source === "binance";

  /** Apply an toàn: nếu chart chưa mount → giữ pending, không mất data */
  const applyCandles = useCallback((candles: Candle[], fit = true) => {
    if (!candles || candles.length < 2) return false;
    pendingRef.current = candles;

    if (!readyRef.current || !seriesRef.current || !chartRef.current) {
      // Chart chưa sẵn sàng – sẽ apply khi mount
      setCandleCount(candles.length);
      setLivePrice(candles[candles.length - 1].close);
      return true;
    }

    const data = toSeriesData(candles);
    if (data.length < 2) {
      setCandleCount(data.length);
      return false;
    }
    try {
      seriesRef.current.setData(data);
      if (fit) chartRef.current.timeScale().fitContent();
      setCandleCount(data.length);
      setLivePrice(data[data.length - 1].close as number);
      setLoadError(null);
      return true;
    } catch {
      setLoadError("Dữ liệu nến không hợp lệ");
      return false;
    }
  }, []);

  // Init chart shell
  useEffect(() => {
    if (!wrapRef.current) return;
    const chart = createChart(wrapRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1e2329" },
        textColor: "#929aa5",
        fontFamily: "var(--font-plex), monospace",
      },
      grid: {
        vertLines: { color: "#2b3139" },
        horzLines: { color: "#2b3139" },
      },
      rightPriceScale: { borderColor: "#2b3139" },
      timeScale: {
        borderColor: "#2b3139",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
      height: 380,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderUpColor: "#0ecb81",
      borderDownColor: "#f6465d",
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    readyRef.current = true;

    // Flush pending (SSR hoặc fetch xong trước khi chart mount)
    const pending = pendingRef.current;
    if (pending && pending.length >= 2) {
      const data = toSeriesData(pending);
      if (data.length >= 2) {
        try {
          series.setData(data);
          chart.timeScale().fitContent();
          setCandleCount(data.length);
          setLivePrice(data[data.length - 1].close as number);
          setLoading(false);
          setLoadError(null);
        } catch {
          /* */
        }
      }
    }

    const ro = new ResizeObserver(() => {
      if (wrapRef.current) {
        chart.applyOptions({ width: wrapRef.current.clientWidth });
      }
    });
    ro.observe(wrapRef.current);

    return () => {
      readyRef.current = false;
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Static Pages: Binance (browser) → CoinGecko fallback.
   * Soft: không xóa nến SSR / không báo lỗi mạng nếu đã có data.
   */
  const loadRange = useCallback(
    async (next: ChartRange, opts?: { soft?: boolean }) => {
      const gen = ++loadGen.current;
      setRange(next);
      setLive(false);
      if (!opts?.soft) setLoadError(null);

      const cached = peekChartCache(symbol, next);
      if (cached && cached.length >= 2) {
        setSource("binance");
        setPairLabel(toBinanceSymbol(symbol));
        applyCandles(cached, true);
        setLoading(false);
        setLoadError(null);
        void fetchBinanceKlinesFast(symbol, next, 8000).then((bn) => {
          if (gen !== loadGen.current) return;
          if (bn.candles.length >= 2) applyCandles(bn.candles, false);
        });
        return;
      }

      const hadData = (pendingRef.current?.length ?? 0) >= 2;
      if (!opts?.soft || !hadData) setLoading(true);

      let result = await fetchChartCandlesClient(coinId, symbol, next);
      if (gen !== loadGen.current) return;

      if (result.candles.length < 2) {
        // retry một lần (CG 429 / mạng chập chờn)
        await new Promise((r) => setTimeout(r, 400));
        if (gen !== loadGen.current) return;
        result = await fetchChartCandlesClient(coinId, symbol, next);
        if (gen !== loadGen.current) return;
      }

      if (result.candles.length >= 2) {
        setSource(result.source);
        setPairLabel(result.pair);
        applyCandles(result.candles, true);
        setLoading(false);
        setLoadError(null);
        return;
      }

      // Soft fail: giữ nến cũ, không báo “mạng hỏng” oan
      if (opts?.soft && hadData) {
        setLoading(false);
        return;
      }

      if ((pendingRef.current?.length ?? 0) < 2) {
        setLoadError(
          "Chưa tải được biểu đồ cho coin này. Thử lại sau vài giây (Binance/CoinGecko có thể đang giới hạn).",
        );
      }
      if (gen === loadGen.current) setLoading(false);
    },
    [applyCandles, coinId, symbol],
  );

  // Mount: paint SSR ngay; client luôn cố lấy data tươi + fallback
  useEffect(() => {
    if (initialCandles.length >= 2) {
      applyCandles(initialCandles, true);
      setLoading(false);
      setLoadError(null);
      // Soft refresh: Binance realtime nếu được; fail thì giữ SSR
      void loadRange("7d", { soft: true });
      return;
    }
    void loadRange("7d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, symbol]);

  // WebSocket realtime
  useEffect(() => {
    if (!canStream || !pair) {
      setLive(false);
      return;
    }

    const interval = RANGE_TO_INTERVAL[range];
    let alive = true;
    let klineWs: WebSocket | null = null;
    let tickerWs: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!alive) return;
      klineWs = new WebSocket(binanceKlineStreamUrl(pair, interval));
      klineWs.onopen = () => {
        if (alive) setLive(true);
      };
      klineWs.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as KlineWsMessage;
          if (msg.e !== "kline" || !msg.k || !seriesRef.current) return;
          const k = msg.k;
          seriesRef.current.update({
            time: Math.floor(k.t / 1000) as Time,
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
          });
          setLivePrice(Number(k.c));
          setLive(true);
        } catch {
          /* */
        }
      };
      klineWs.onclose = () => {
        setLive(false);
        if (alive) reconnect = setTimeout(connect, 2000);
      };

      tickerWs = new WebSocket(
        `wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@miniTicker`,
      );
      tickerWs.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as MiniTickerWsMessage;
          if (!msg.c) return;
          const last = Number(msg.c);
          const open = Number(msg.o);
          setLivePrice(last);
          if (open > 0) setLiveChange(((last - open) / open) * 100);
        } catch {
          /* */
        }
      };
    };

    connect();
    return () => {
      alive = false;
      if (reconnect) clearTimeout(reconnect);
      try {
        klineWs?.close();
      } catch {
        /* */
      }
      try {
        tickerWs?.close();
      } catch {
        /* */
      }
    };
  }, [canStream, pair, range]);

  const changeTone =
    liveChange == null
      ? "text-muted"
      : liveChange >= 0
        ? "text-trading-up"
        : "text-trading-down";

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-body">Biểu đồ giá</p>
            {canStream && (
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
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
            {loading && (
              <span className="text-[11px] text-muted">Đang tải…</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            {livePrice != null && (
              <span className="font-mono text-lg font-bold text-body">
                {formatUsd(livePrice)}
              </span>
            )}
            {liveChange != null && (
              <span className={`font-mono text-xs font-semibold ${changeTone}`}>
                {liveChange >= 0 ? "+" : ""}
                {liveChange.toFixed(2)}%
              </span>
            )}
          </div>
          {(sourceLabel(source, pairLabel) || candleCount > 0) && (
            <p className="mt-0.5 text-xs text-muted">
              {[
                sourceLabel(source, pairLabel),
                candleCount > 0 ? `${candleCount} nến` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={loading && range === r.id}
              onClick={() => void loadRange(r.id)}
              className={[
                "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                range === r.id
                  ? "bg-primary text-ink"
                  : "bg-surface-elevated text-muted-strong hover:text-body",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full min-h-[380px]">
        {loading && candleCount < 2 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-card/60 text-sm text-muted">
            Đang tải biểu đồ…
          </div>
        )}
      </div>

      {loadError && candleCount < 2 && !loading && (
        <div className="border-t border-hairline px-4 py-3 text-center">
          <p className="text-sm text-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadRange(range)}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
