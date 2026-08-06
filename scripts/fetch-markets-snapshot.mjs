/**
 * Snapshot thị trường — local & production bake CÙNG file.
 * markets endpoint đã có 1h/24h/7d + mcap + logo.
 * details (mô tả/ATH) chỉ top 25, retry nhẹ.
 *
 * npm run snapshot
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "markets-snapshot.json");
const CG = "https://api.coingecko.com/api/v3";
const UA = "CryptoMarketVN-Snapshot/1.0";
const DETAIL_N = 25;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 429) {
        const wait = 5000 * (i + 1);
        console.warn(`  429 wait ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        await sleep(1500 * (i + 1));
        continue;
      }
      return await res.json();
    } catch (e) {
      console.warn(`  err ${e.message || e}`);
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadPrev() {
  try {
    return JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });
  const prev = await loadPrev();

  console.log("1) markets (1h/24h/7d + mcap + image)…");
  let markets = await fetchJson(
    `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d`,
  );
  if (!Array.isArray(markets) || !markets.length) {
    markets = prev?.markets || [];
    console.warn("  markets API fail → keep previous:", markets.length);
  } else {
    console.log("  ok", markets.length, "coins");
  }

  console.log("2) global…");
  await sleep(2000);
  const globalRaw = await fetchJson(`${CG}/global`);

  console.log("3) fear greed…");
  await sleep(1000);
  const fngRaw = await fetchJson("https://api.alternative.me/fng/?limit=1");

  let global = prev?.global || null;
  if (globalRaw?.data) {
    const d = globalRaw.data;
    global = {
      total_market_cap_usd: d.total_market_cap?.usd ?? 0,
      total_volume_usd: d.total_volume?.usd ?? 0,
      btc_dominance: d.market_cap_percentage?.btc ?? 0,
      eth_dominance: d.market_cap_percentage?.eth ?? 0,
      market_cap_change_percentage_24h:
        d.market_cap_change_percentage_24h_usd ?? 0,
      updated_at: d.updated_at
        ? new Date(d.updated_at * 1000).toISOString()
        : new Date().toISOString(),
    };
    console.log("  mcap", global.total_market_cap_usd);
  }

  let fear = prev?.fear || null;
  const row = fngRaw?.data?.[0];
  if (row) {
    const mapVi = {
      "Extreme Fear": "Sợ hãi cực độ",
      Fear: "Sợ hãi",
      Neutral: "Trung lập",
      Greed: "Tham lam",
      "Extreme Greed": "Tham lam cực độ",
    };
    fear = {
      value: Number(row.value),
      classification: row.value_classification,
      classificationVi:
        mapVi[row.value_classification] ?? row.value_classification,
      timestamp: new Date(Number(row.timestamp) * 1000).toISOString(),
    };
    console.log("  fng", fear.value, fear.classificationVi);
  }

  // details từ markets row (đã có 1h/7d) + enrich mô tả top N
  const details = { ...(prev?.details || {}) };
  for (const c of markets) {
    if (details[c.id]?.descriptionVi) continue;
    details[c.id] = {
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image || "",
      descriptionVi: details[c.id]?.descriptionVi || "",
      homepage: details[c.id]?.homepage || null,
      categories: details[c.id]?.categories || [],
      market_cap_rank: c.market_cap_rank ?? null,
      current_price: c.current_price,
      market_cap: c.market_cap ?? 0,
      total_volume: c.total_volume ?? 0,
      high_24h: c.high_24h ?? null,
      low_24h: c.low_24h ?? null,
      ath: details[c.id]?.ath ?? c.ath ?? null,
      ath_change_percentage:
        details[c.id]?.ath_change_percentage ??
        c.ath_change_percentage ??
        null,
      ath_date: details[c.id]?.ath_date ?? null,
      atl: details[c.id]?.atl ?? null,
      circulating_supply:
        details[c.id]?.circulating_supply ?? c.circulating_supply ?? null,
      total_supply: details[c.id]?.total_supply ?? c.total_supply ?? null,
      max_supply: details[c.id]?.max_supply ?? c.max_supply ?? null,
      price_change_percentage_24h:
        c.price_change_percentage_24h ??
        c.price_change_percentage_24h_in_currency ??
        null,
      price_change_percentage_7d:
        c.price_change_percentage_7d_in_currency ?? null,
      price_change_percentage_30d: null,
      price_change_percentage_1h:
        c.price_change_percentage_1h_in_currency ?? null,
      last_updated: c.last_updated || new Date().toISOString(),
    };
  }

  console.log(`4) enrich description top ${DETAIL_N}…`);
  const topIds = markets.slice(0, DETAIL_N).map((c) => c.id);
  for (let i = 0; i < topIds.length; i++) {
    const id = topIds[i];
    if (details[id]?.descriptionVi?.length > 80) {
      console.log(`  skip ${id} (have desc)`);
      continue;
    }
    process.stdout.write(`  ${i + 1}/${topIds.length} ${id}… `);
    await sleep(2000);
    const j = await fetchJson(
      `${CG}/coins/${encodeURIComponent(id)}?localization=true&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      3,
    );
    if (!j?.id) {
      console.log("skip");
      continue;
    }
    const md = j.market_data || {};
    const descEn = stripHtml(j.description?.en || "");
    const descVi = stripHtml(j.description?.vi || "");
    details[id] = {
      ...details[id],
      id: j.id,
      symbol: j.symbol,
      name: j.name,
      image: j.image?.large || j.image?.small || details[id]?.image || "",
      descriptionVi:
        descVi.length > 80 ? descVi.slice(0, 1200) : descEn.slice(0, 1200) || "",
      homepage: (j.links?.homepage || []).find(Boolean) || null,
      categories: (j.categories || []).filter(Boolean).slice(0, 6),
      market_cap_rank: j.market_cap_rank ?? details[id]?.market_cap_rank,
      current_price: md.current_price?.usd ?? details[id]?.current_price ?? 0,
      market_cap: md.market_cap?.usd ?? details[id]?.market_cap ?? 0,
      total_volume: md.total_volume?.usd ?? details[id]?.total_volume ?? 0,
      high_24h: md.high_24h?.usd ?? null,
      low_24h: md.low_24h?.usd ?? null,
      ath: md.ath?.usd ?? null,
      ath_change_percentage: md.ath_change_percentage?.usd ?? null,
      ath_date: md.ath_date?.usd ?? null,
      atl: md.atl?.usd ?? null,
      circulating_supply: md.circulating_supply ?? null,
      total_supply: md.total_supply ?? null,
      max_supply: md.max_supply ?? null,
      price_change_percentage_24h:
        md.price_change_percentage_24h ??
        details[id]?.price_change_percentage_24h,
      price_change_percentage_7d:
        md.price_change_percentage_7d ??
        details[id]?.price_change_percentage_7d,
      price_change_percentage_30d: md.price_change_percentage_30d ?? null,
      price_change_percentage_1h:
        md.price_change_percentage_1h_in_currency?.usd ??
        details[id]?.price_change_percentage_1h,
      last_updated:
        md.last_updated || j.last_updated || new Date().toISOString(),
    };
    console.log("ok");
  }

  if (!markets.length) {
    console.error("FATAL: no markets");
    process.exit(1);
  }

  const snapshot = {
    updatedAt: new Date().toISOString(),
    markets,
    global,
    fear,
    details,
  };
  await writeFile(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  const btc = details.bitcoin;
  console.log(
    `\nOK ${OUT}\n markets=${markets.length} details=${Object.keys(details).length}\n btc 1h=${btc?.price_change_percentage_1h} 7d=${btc?.price_change_percentage_7d} mcap=${btc?.market_cap} desc=${btc?.descriptionVi?.length || 0} chars`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
