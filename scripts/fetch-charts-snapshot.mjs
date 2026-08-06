/**
 * Bake chart candles for every market coin → data/charts-snapshot.json
 * + public/charts/{id}.json (same-origin, no CORS / rate-limit at runtime).
 *
 * npm run charts
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MARKETS = path.join(ROOT, "data", "markets-snapshot.json");
const OUT_DATA = path.join(ROOT, "data", "charts-snapshot.json");
const OUT_PUBLIC = path.join(ROOT, "public", "charts");

const BN_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
];
const CG = "https://api.coingecko.com/api/v3";
const UA = "CryptoMarketVN-Charts/1.0";

const RANGES = {
  "1d": { interval: "15m", limit: 96, cgDays: 1 },
  "7d": { interval: "1h", limit: 168, cgDays: 7 },
  "30d": { interval: "4h", limit: 180, cgDays: 30 },
  "90d": { interval: "1d", limit: 90, cgDays: 90 },
};

const SKIP_BN = new Set([
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
  "pyusd",
  "usdg",
  "usdf",
  "usdd",
  "gho",
  "usdc",
]);

/** CoinGecko id → pair Binance (tránh symbol đụng: lit/lighter, m/…) */
const ID_PAIR = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  binancecoin: "BNBUSDT",
  ripple: "XRPUSDT",
  cardano: "ADAUSDT",
  dogecoin: "DOGEUSDT",
  "the-open-network": "TONUSDT",
  toncoin: "TONUSDT",
  aptos: "APTUSDT",
  arbitrum: "ARBUSDT",
  cosmos: "ATOMUSDT",
  filecoin: "FILUSDT",
  "render-token": "RENDERUSDT",
  "jupiter-exchange-solana": "JUPUSDT",
  // không map Binance (symbol đụng / không có spot)
  lighter: null,
  memecore: null,
  bianrensheng: null,
  beldex: null,
  kaspa: null,
  "pi-network": null,
  "bitget-token": null,
  "gatechain-token": null,
  "crypto-com-chain": null,
  okb: null,
  hyperliquid: null,
};

const ALIAS = {
  btc: "BTCUSDT",
  eth: "ETHUSDT",
  bnb: "BNBUSDT",
  sol: "SOLUSDT",
  xrp: "XRPUSDT",
  ada: "ADAUSDT",
  doge: "DOGEUSDT",
  ton: "TONUSDT",
  gram: "TONUSDT",
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
  fil: "FILUSDT",
  render: "RENDERUSDT",
  rndr: "RENDERUSDT",
  jup: "JUPUSDT",
  inj: "INJUSDT",
  sei: "SEIUSDT",
  tia: "TIAUSDT",
  wif: "WIFUSDT",
  bonk: "BONKUSDT",
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
  pyth: "PYTHUSDT",
  jto: "JTOUSDT",
  bch: "BCHUSDT",
  etc: "ETCUSDT",
  icp: "ICPUSDT",
  wbtc: "WBTCUSDT",
  steth: "STETHUSDT",
  weeth: "WEETHUSDT",
  fdusd: "FDUSDUSDT",
  tao: "TAOUSDT",
  ena: "ENAUSDT",
  pendle: "PENDLEUSDT",
  ethfi: "ETHFIUSDT",
  eigen: "EIGENUSDT",
  bera: "BERAUSDT",
  move: "MOVEUSDT",
  om: "OMUSDT",
  floki: "FLOKIUSDT",
  ray: "RAYUSDT",
  ordi: "ORDIUSDT",
  w: "WUSDT",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toPair(symbol, coinId) {
  if (coinId && Object.prototype.hasOwnProperty.call(ID_PAIR, coinId)) {
    return ID_PAIR[coinId];
  }
  const s = String(symbol || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!s || SKIP_BN.has(s)) return null;
  // symbol 1 ký tự / non-ascii → không đoán Binance
  if (s.length < 2 || s.length > 10) return null;
  if (ALIAS[s]) return ALIAS[s];
  // lit = Lighter hoặc Litentry — không đoán mù
  if (s === "lit") return null;
  const guess = `${s.toUpperCase()}USDT`;
  if (guess.length >= 6 && guess.length <= 15) return guess;
  return null;
}

function normalize(rows) {
  const map = new Map();
  for (const c of rows) {
    if (!Number.isFinite(c.time) || !Number.isFinite(c.close) || c.close <= 0)
      continue;
    const t = Math.floor(c.time);
    const open = Number.isFinite(c.open) ? c.open : c.close;
    const high = Math.max(
      open,
      c.close,
      Number.isFinite(c.high) ? c.high : c.close,
    );
    const low = Math.min(
      open,
      c.close,
      Number.isFinite(c.low) ? c.low : c.close,
    );
    map.set(t, {
      time: t,
      open,
      high: high >= low ? high : low,
      low: low <= high ? low : high,
      close: c.close,
      volume: c.volume || 0,
    });
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

function parseBn(rows) {
  if (!Array.isArray(rows)) return [];
  return normalize(
    rows.map((r) => ({
      time: Math.floor(Number(r[0]) / 1000),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    })),
  );
}

async function bnKlines(pair, interval, limit) {
  for (const host of BN_HOSTS) {
    try {
      const url = `${host}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const candles = parseBn(await res.json());
      if (candles.length >= 3) return candles;
    } catch {
      /* next host */
    }
  }
  return [];
}

async function cgOhlc(id, days) {
  const allowed = [1, 7, 14, 30, 90, 180, 365];
  const d = allowed.includes(days)
    ? days
    : allowed.reduce((a, b) =>
        Math.abs(b - days) < Math.abs(a - days) ? b : a,
      );
  for (let i = 0; i < 4; i++) {
    try {
      const url = `${CG}/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${d}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        await sleep(4000 * (i + 1));
        continue;
      }
      if (!res.ok) return [];
      const rows = await res.json();
      if (!Array.isArray(rows)) return [];
      return normalize(
        rows.map((r) => ({
          time: Math.floor(Number(r[0]) / 1000),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          volume: 0,
        })),
      );
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return [];
}

/** Nến synthetic quanh giá hiện tại — luôn có chart (stable / delisted pair) */
function syntheticCandles(price, points, intervalSec) {
  const p0 = Number(price);
  if (!Number.isFinite(p0) || p0 <= 0) return [];
  const now = Math.floor(Date.now() / 1000);
  // deterministic mild walk (không random mỗi build)
  let p = p0;
  const out = [];
  for (let i = points; i >= 0; i--) {
    const t = now - i * intervalSec;
    const seed = (t / intervalSec) % 97;
    const wobble = Math.sin(seed) * p0 * 0.0015 + Math.cos(seed * 0.7) * p0 * 0.0008;
    const open = p;
    const close = Math.max(p0 * 0.0000001, p0 + wobble * (i / points));
    const high = Math.max(open, close) * (1 + 0.0004);
    const low = Math.min(open, close) * (1 - 0.0004);
    out.push({
      time: t,
      open,
      high,
      low,
      close,
      volume: 0,
    });
    p = close;
  }
  // neo nến cuối về đúng giá hiện tại
  if (out.length) {
    const last = out[out.length - 1];
    last.close = p0;
    last.high = Math.max(last.open, last.close, last.high);
    last.low = Math.min(last.open, last.close, last.low);
  }
  return normalize(out);
}

function sliceByRange(candles, range) {
  if (!candles.length) return [];
  const now = candles[candles.length - 1].time;
  const span =
    range === "1d"
      ? 86400
      : range === "7d"
        ? 7 * 86400
        : range === "30d"
          ? 30 * 86400
          : 90 * 86400;
  return candles.filter((c) => c.time >= now - span);
}

async function loadMarkets() {
  const raw = JSON.parse(await readFile(MARKETS, "utf8"));
  return Array.isArray(raw.markets) ? raw.markets : [];
}

async function main() {
  await mkdir(path.dirname(OUT_DATA), { recursive: true });
  await mkdir(OUT_PUBLIC, { recursive: true });

  const markets = await loadMarkets();
  if (!markets.length) {
    console.error("No markets in snapshot — run npm run snapshot first");
    process.exit(1);
  }

  /** @type {Record<string, any>} */
  const charts = {};
  let bnHits = 0;
  let cgHits = 0;
  let synthHits = 0;

  console.log(`Baking charts for ${markets.length} coins…`);

  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    const id = m.id;
    const symbol = m.symbol;
    const price = m.current_price || m.currentPrice || 0;
    const pair = toPair(symbol, id);
    const ranges = {};
    let source = "none";
    let usedPair = null;

    // 1) Binance all ranges if pair exists
    if (pair) {
      let any = false;
      for (const [range, cfg] of Object.entries(RANGES)) {
        const candles = await bnKlines(pair, cfg.interval, cfg.limit);
        if (candles.length >= 3) {
          ranges[range] = candles;
          any = true;
        }
      }
      if (any) {
        source = "binance";
        usedPair = pair;
        bnHits++;
      }
    }

    // 2) CoinGecko once (90d) → slice ranges
    if (Object.keys(ranges).length < 4) {
      // mild pacing to avoid 429
      if (source !== "binance") await sleep(1100);
      const full = await cgOhlc(id, 90);
      if (full.length >= 3) {
        for (const range of Object.keys(RANGES)) {
          if (ranges[range]?.length >= 3) continue;
          const sliced = sliceByRange(full, range);
          if (sliced.length >= 3) ranges[range] = sliced;
          else if (full.length >= 3) ranges[range] = full;
        }
        if (source === "none") {
          source = "coingecko-ohlc";
          cgHits++;
        }
      } else if (source === "none") {
        // retry 7d only
        await sleep(1500);
        const week = await cgOhlc(id, 7);
        if (week.length >= 3) {
          ranges["7d"] = week;
          ranges["1d"] = sliceByRange(week, "1d");
          if (ranges["1d"].length < 3) ranges["1d"] = week;
          ranges["30d"] = week;
          ranges["90d"] = week;
          source = "coingecko-ohlc";
          cgHits++;
        }
      }
    }

    // 3) Synthetic always as last resort — chart never empty
    if (Object.keys(ranges).length === 0 || !ranges["7d"]?.length) {
      const synthMap = {
        "1d": syntheticCandles(price, 96, 15 * 60),
        "7d": syntheticCandles(price, 168, 3600),
        "30d": syntheticCandles(price, 180, 4 * 3600),
        "90d": syntheticCandles(price, 90, 86400),
      };
      for (const [range, candles] of Object.entries(synthMap)) {
        if (!ranges[range]?.length && candles.length >= 3) {
          ranges[range] = candles;
        }
      }
      if (source === "none") {
        source = "synthetic";
        synthHits++;
      }
    }

    // fill missing ranges from best available
    const best =
      ranges["7d"] || ranges["30d"] || ranges["90d"] || ranges["1d"] || [];
    for (const range of Object.keys(RANGES)) {
      if (!ranges[range]?.length && best.length) {
        ranges[range] =
          range === "1d" || range === "7d" ? sliceByRange(best, range) : best;
        if (ranges[range].length < 3) ranges[range] = best;
      }
    }

    const entry = {
      id,
      symbol,
      pair: usedPair,
      source,
      updatedAt: new Date().toISOString(),
      ranges: {
        "1d": ranges["1d"] || [],
        "7d": ranges["7d"] || [],
        "30d": ranges["30d"] || [],
        "90d": ranges["90d"] || [],
      },
    };
    charts[id] = entry;

    // per-coin public file for client
    await writeFile(
      path.join(OUT_PUBLIC, `${id}.json`),
      JSON.stringify(entry),
      "utf8",
    );

    const n7 = entry.ranges["7d"].length;
    console.log(
      `  [${i + 1}/${markets.length}] ${id} ${source} 7d=${n7} pair=${usedPair || "-"}`,
    );
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    count: Object.keys(charts).length,
    charts,
  };
  await writeFile(OUT_DATA, JSON.stringify(payload), "utf8");
  // also expose full index for debugging
  await writeFile(
    path.join(OUT_PUBLIC, "index.json"),
    JSON.stringify({
      updatedAt: payload.updatedAt,
      count: payload.count,
      ids: Object.keys(charts),
    }),
    "utf8",
  );

  console.log(
    `done: bn=${bnHits} cg=${cgHits} synth=${synthHits} total=${payload.count}`,
  );
  console.log(`→ ${OUT_DATA}`);
  console.log(`→ ${OUT_PUBLIC}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
