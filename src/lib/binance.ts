export type BinanceTicker = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
};

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const BASE = "https://data-api.binance.vision/api/v3";

/** Symbol CoinGecko → cặp Binance USDT phổ biến */
const SYMBOL_ALIAS: Record<string, string> = {
  btc: "BTCUSDT",
  eth: "ETHUSDT",
  bnb: "BNBUSDT",
  sol: "SOLUSDT",
  xrp: "XRPUSDT",
  ada: "ADAUSDT",
  doge: "DOGEUSDT",
  ton: "TONUSDT",
  avax: "AVAXUSDT",
  link: "LINKUSDT",
  dot: "DOTUSDT",
  matic: "MATICUSDT",
  pol: "POLUSDT",
  near: "NEARUSDT",
  apt: "APTUSDT",
  arb: "ARBUSDT",
  op: "OPUSDT",
  sui: "SUIUSDT",
  pepe: "PEPEUSDT",
  shib: "SHIBUSDT",
  ltc: "LTCUSDT",
  uni: "UNIUSDT",
  atom: "ATOMUSDT",
  trx: "TRXUSDT",
  etc: "ETCUSDT",
  fil: "FILUSDT",
  icp: "ICPUSDT",
  inj: "INJUSDT",
  sei: "SEIUSDT",
  wif: "WIFUSDT",
  bonk: "BONKUSDT",
  render: "RENDERUSDT",
  fet: "FETUSDT",
  aave: "AAVEUSDT",
  mkr: "MKRUSDT",
  imx: "IMXUSDT",
  stx: "STXUSDT",
  algo: "ALGOUSDT",
  xlm: "XLMUSDT",
  hbar: "HBARUSDT",
  vet: "VETUSDT",
  grt: "GRTUSDT",
  sand: "SANDUSDT",
  mana: "MANAUSDT",
  axs: "AXSUSDT",
  theta: "THETAUSDT",
  egld: "EGLDUSDT",
  flow: "FLOWUSDT",
  chz: "CHZUSDT",
  ens: "ENSUSDT",
  crv: "CRVUSDT",
  ldo: "LDOUSDT",
  rune: "RUNEUSDT",
  cake: "CAKEUSDT",
  gala: "GALAUSDT",
  snx: "SNXUSDT",
  comp: "COMPUSDT",
  wld: "WLDUSDT",
  tia: "TIAUSDT",
  jup: "JUPUSDT",
  pyth: "PYTHUSDT",
  jto: "JTOUSDT",
  w: "WUSDT",
  bch: "BCHUSDT",
  usdc: "USDCUSDT",
  dai: "DAIUSDT",
  fdusd: "FDUSDUSDT",
  steth: "STETHUSDT",
  wbtc: "WBTCUSDT",
  weeth: "WEETHUSDT",
};

/** Symbol không có spot USDT hữu ích trên Binance (stable / wrapped đặc biệt) */
const SKIP_BINANCE = new Set([
  "usdt",
  "usd",
  "usde",
  "usds",
  "usdy",
  "dai",
  "tusd",
  "usdp",
  "gusd",
  "busd",
  "eurs",
  "eurc",
]);

export function toBinanceSymbol(coinSymbol: string): string | null {
  const s = coinSymbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s || SKIP_BINANCE.has(s)) return null;
  if (SYMBOL_ALIAS[s]) return SYMBOL_ALIAS[s];
  // đoán cặp USDT – độ dài base 2–10
  if (s.length < 2 || s.length > 10) return null;
  const guess = `${s.toUpperCase()}USDT`;
  if (guess.length >= 6 && guess.length <= 15) return guess;
  return null;
}

/** Thêm alias hay gặp (CoinGecko id / symbol lệch) */
export function expandBinanceAliases(symbol: string): string[] {
  const s = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  const out = new Set<string>([s]);
  const extra: Record<string, string[]> = {
    pol: ["matic", "pol"],
    matic: ["matic", "pol"],
    render: ["render", "rndr"],
    rndr: ["render", "rndr"],
    weth: ["eth", "weth"],
    steth: ["steth"],
    "weeth": ["weeth"],
    cbeth: ["cbeth"],
    reth: ["reth"],
    bgb: ["bgb"],
    okb: ["okb"],
    leo: ["leo"],
    cro: ["cro"],
    hype: ["hype"],
    tao: ["tao"],
    bera: ["bera"],
    om: ["om"],
    move: ["move"],
    ena: ["ena"],
    ethfi: ["ethfi"],
    eigen: ["eigen"],
    pendle: ["pendle"],
    jto: ["jto"],
    w: ["w"],
    floki: ["floki"],
    bonk: ["bonk"],
    ray: ["ray"],
    ordi: ["ordi"],
    sats: ["1000sats", "sats"],
  };
  for (const a of extra[s] || []) out.add(a);
  return [...out];
}

export async function fetchBinanceTicker(
  coinSymbol: string,
): Promise<BinanceTicker | null> {
  const pair = toBinanceSymbol(coinSymbol);
  if (!pair) return null;
  try {
    const res = await fetch(`${BASE}/ticker/24hr?symbol=${pair}`, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, string>;
    return {
      symbol: j.symbol,
      lastPrice: Number(j.lastPrice),
      priceChangePercent: Number(j.priceChangePercent),
      highPrice: Number(j.highPrice),
      lowPrice: Number(j.lowPrice),
      volume: Number(j.volume),
      quoteVolume: Number(j.quoteVolume),
    };
  } catch {
    return null;
  }
}

async function fetchKlinesForPair(
  pair: string,
  interval: string,
  limit: number,
): Promise<Candle[]> {
  const url = new URL(`${BASE}/klines`);
  url.searchParams.set("symbol", pair);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<
    [number, string, string, string, string, string, ...unknown[]]
  >;
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.map((r) => ({
    time: Math.floor(r[0] / 1000),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

export async function fetchBinanceKlines(
  coinSymbol: string,
  interval: "15m" | "1h" | "4h" | "1d" = "1h",
  limit = 168,
): Promise<Candle[]> {
  // Thử symbol gốc + alias (matic/pol, render/rndr…)
  const aliases = expandBinanceAliases(coinSymbol);
  for (const a of aliases) {
    const pair = toBinanceSymbol(a);
    if (!pair) continue;
    try {
      const rows = await fetchKlinesForPair(pair, interval, limit);
      if (rows.length >= 3) return rows;
    } catch {
      /* try next */
    }
  }
  return [];
}

/** Nhiều ticker một lần (tối đa ~100 symbol) */
export async function fetchBinanceTickersMap(
  symbols: string[],
): Promise<Map<string, BinanceTicker>> {
  const map = new Map<string, BinanceTicker>();
  const pairs = [
    ...new Set(
      symbols
        .map((s) => toBinanceSymbol(s))
        .filter((p): p is string => Boolean(p)),
    ),
  ].slice(0, 80);

  await Promise.all(
    pairs.map(async (pair) => {
      try {
        const res = await fetch(`${BASE}/ticker/24hr?symbol=${pair}`, {
          next: { revalidate: 30 },
        });
        if (!res.ok) return;
        const j = (await res.json()) as Record<string, string>;
        const base = pair.replace(/USDT$/, "").toLowerCase();
        map.set(base, {
          symbol: j.symbol,
          lastPrice: Number(j.lastPrice),
          priceChangePercent: Number(j.priceChangePercent),
          highPrice: Number(j.highPrice),
          lowPrice: Number(j.lowPrice),
          volume: Number(j.volume),
          quoteVolume: Number(j.quoteVolume),
        });
      } catch {
        /* skip */
      }
    }),
  );
  return map;
}
