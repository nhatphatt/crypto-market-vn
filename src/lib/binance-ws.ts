/** Helper client: map range chart → interval stream Binance */
export const RANGE_TO_INTERVAL = {
  "1d": "15m",
  "7d": "1h",
  "30d": "4h",
  "90d": "1d",
} as const;

export type ChartRange = keyof typeof RANGE_TO_INTERVAL;

export function binanceKlineStreamUrl(pair: string, interval: string) {
  // stream.binance.com – realtime public
  const stream = `${pair.toLowerCase()}@kline_${interval}`;
  return `wss://stream.binance.com:9443/ws/${stream}`;
}

export function binanceMiniTickerUrl(pair: string) {
  return `wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@miniTicker`;
}

export type KlineWsMessage = {
  e: "kline";
  k: {
    t: number; // open time ms
    T: number;
    s: string;
    i: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    x: boolean; // is closed
  };
};

export type MiniTickerWsMessage = {
  e: "24hrMiniTicker";
  s: string;
  c: string; // close / last
  o: string;
  h: string;
  l: string;
  v: string;
  q: string;
};
