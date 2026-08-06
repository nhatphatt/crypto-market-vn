/**
 * Fetch klines TRỰC TIẾP browser → Binance (CORS *).
 * Race multi-host + multi-alias, cache tab, không chờ tuần tự.
 */

import type { Candle } from "./binance";
import { expandBinanceAliases, toBinanceSymbol } from "./binance";
import type { ChartRange } from "./chart-data";

const HOSTS = [
  "https://api.binance.com",
  "https://data-api.binance.vision",
] as const;

export const RANGE_KLINES: Record<
  ChartRange,
  { interval: string; limit: number }
> = {
  "1d": { interval: "15m", limit: 96 },
  "7d": { interval: "1h", limit: 168 },
  "30d": { interval: "4h", limit: 180 },
  "90d": { interval: "1d", limit: 90 },
};

/** Cache session (tab) – đổi range / quay lại coin không fetch lại */
const cache = new Map<string, { at: number; candles: Candle[]; pair: string }>();
const CACHE_TTL = 90_000;
/** In-flight dedupe – nhiều component cùng fetch 1 pair */
const inflight = new Map<string, Promise<{ candles: Candle[]; pair: string }>>();

function cacheKey(pair: string, interval: string, limit: number) {
  return `${pair}:${interval}:${limit}`;
}

function parseKlines(rows: unknown): Candle[] {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const map = new Map<number, Candle>();
  for (const r of rows as Array<unknown[]>) {
    if (!Array.isArray(r) || r.length < 6) continue;
    const time = Math.floor(Number(r[0]) / 1000);
    const open = Number(r[1]);
    const high = Number(r[2]);
    const low = Number(r[3]);
    const close = Number(r[4]);
    const volume = Number(r[5]);
    if (!Number.isFinite(time) || !Number.isFinite(close) || close <= 0)
      continue;
    const o = Number.isFinite(open) ? open : close;
    const h = Number.isFinite(high) ? high : Math.max(o, close);
    const l = Number.isFinite(low) ? low : Math.min(o, close);
    map.set(time, {
      time,
      open: o,
      high: Math.max(o, close, h),
      low: Math.min(o, close, l),
      close,
      volume: Number.isFinite(volume) ? volume : 0,
    });
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

async function fetchOneHost(
  host: string,
  pair: string,
  interval: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const url = `${host}/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
    mode: "cors",
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const candles = parseKlines(await res.json());
  if (candles.length < 3) throw new Error("empty");
  return candles;
}

function uniquePairs(symbol: string): string[] {
  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const a of expandBinanceAliases(symbol)) {
    const p = toBinanceSymbol(a);
    if (p && !seen.has(p)) {
      seen.add(p);
      pairs.push(p);
    }
  }
  return pairs;
}

/**
 * Race tất cả host × alias – host/alias nào trả data trước thắng.
 * Timeout cứng; cache + inflight dedupe.
 */
export async function fetchBinanceKlinesFast(
  symbol: string,
  range: ChartRange = "7d",
  timeoutMs = 2800,
): Promise<{ candles: Candle[]; pair: string | null }> {
  const cfg = RANGE_KLINES[range];
  const pairs = uniquePairs(symbol);
  if (!pairs.length) return { candles: [], pair: null };

  // Cache hit trên bất kỳ pair nào
  for (const pair of pairs) {
    const key = cacheKey(pair, cfg.interval, cfg.limit);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL && hit.candles.length >= 3) {
      return { candles: hit.candles, pair: hit.pair };
    }
  }

  // Dedupe: key theo symbol+range (alias set ổn định)
  const flightKey = `${symbol.toLowerCase()}|${range}|${cfg.interval}|${cfg.limit}`;
  const existing = inflight.get(flightKey);
  if (existing) {
    try {
      return await existing;
    } catch {
      return { candles: [], pair: pairs[0] ?? null };
    }
  }

  const run = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      // Race: mỗi (host, pair) là 1 candidate
      const tasks: Promise<{ candles: Candle[]; pair: string }>[] = [];
      for (const pair of pairs) {
        for (const host of HOSTS) {
          tasks.push(
            fetchOneHost(
              host,
              pair,
              cfg.interval,
              cfg.limit,
              ctrl.signal,
            ).then((candles) => ({ candles, pair })),
          );
        }
      }

      const winner = await Promise.any(tasks);
      // abort các request còn lại
      try {
        ctrl.abort();
      } catch {
        /* */
      }
      clearTimeout(timer);

      const key = cacheKey(winner.pair, cfg.interval, cfg.limit);
      cache.set(key, {
        at: Date.now(),
        candles: winner.candles,
        pair: winner.pair,
      });
      return winner;
    } catch {
      clearTimeout(timer);
      throw new Error("all failed");
    }
  })();

  inflight.set(flightKey, run);
  try {
    return await run;
  } catch {
    return { candles: [], pair: pairs[0] ?? null };
  } finally {
    inflight.delete(flightKey);
  }
}

export function peekChartCache(
  symbol: string,
  range: ChartRange,
): Candle[] | null {
  const cfg = RANGE_KLINES[range];
  for (const pair of uniquePairs(symbol)) {
    const hit = cache.get(cacheKey(pair, cfg.interval, cfg.limit));
    if (hit && Date.now() - hit.at < CACHE_TTL && hit.candles.length >= 3) {
      return hit.candles;
    }
  }
  return null;
}

/** Prefetch nền – hover coin / soft refresh */
export function prefetchBinanceKlines(
  symbol: string,
  range: ChartRange = "7d",
): void {
  if (peekChartCache(symbol, range)) return;
  void fetchBinanceKlinesFast(symbol, range, 2500);
}
