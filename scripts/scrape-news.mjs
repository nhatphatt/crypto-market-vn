/**
 * Cào tin crypto mới nhất:
 * - Nguồn VN + quốc tế
 * - Lấy full nội dung (RSS content:encoded hoặc trang bài)
 * - Dịch sang tiếng Việt (Google Translate free endpoint)
 * - Ảnh featured (og hoặc card SVG)
 * - Ưu tiên tin mới nhất (48h)
 *
 * npm run scrape
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "news.json");
const IMAGE_DIR = path.join(ROOT, "public", "images", "posts");

/** lang: vi = không dịch; en = dịch sang vi */
const FEEDS = [
  // Ưu tiên nguồn tiếng Việt
  { name: "Cointelegraph VN", url: "https://vn.cointelegraph.com/rss", lang: "vi", weight: 3 },
  { name: "Blog Tiền Ảo", url: "https://blogtienao.com/feed/", lang: "vi", weight: 3 },
  { name: "Coin68", url: "https://coin68.com/feed/", lang: "vi", weight: 3 },
  { name: "Bitcoin Vietnam News", url: "https://news.bitcoinvn.io/feed/", lang: "vi", weight: 2 },
  // Quốc tế (dịch)
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss", lang: "en", weight: 2 },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", lang: "en", weight: 2 },
  { name: "CryptoSlate", url: "https://cryptoslate.com/feed/", lang: "en", weight: 1 },
  { name: "CryptoPotato", url: "https://cryptopotato.com/feed/", lang: "en", weight: 1 },
  { name: "Decrypt", url: "https://decrypt.co/feed", lang: "en", weight: 1 },
  { name: "The Defiant", url: "https://thedefiant.io/feed/", lang: "en", weight: 1 },
];

const MAX_POSTS = 200;
const PER_FEED = 25;
const MAX_BODY_CHARS = 12000;
const HOT_HOURS = 72;
const UA =
  "Mozilla/5.0 (compatible; CryptoMarketVN/2.0; +https://example.local; news reader)";

const parser = new Parser({
  timeout: 25000,
  headers: {
    "User-Agent": UA,
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

const COIN_MAP = [
  ["bitcoin", "BTC"],
  ["btc", "BTC"],
  ["ethereum", "ETH"],
  [" eth", "ETH"],
  ["solana", "SOL"],
  ["xrp", "XRP"],
  ["ripple", "XRP"],
  ["bnb", "BNB"],
  ["dogecoin", "DOGE"],
  ["cardano", "ADA"],
  ["avalanche", "AVAX"],
  ["chainlink", "LINK"],
  ["toncoin", "TON"],
  ["sui", "SUI"],
  ["pepe", "PEPE"],
  ["tiền ảo", "CRYPTO"],
  ["crypto", "CRYPTO"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function decodeEntities(s = "") {
  return String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripHtml(html = "") {
  return decodeEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function htmlToParagraphs(html = "") {
  const text = stripHtml(html);
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40);
}

function looksVietnamese(text) {
  if (!text) return false;
  const marks = (
    text.match(
      /[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi,
    ) || []
  ).length;
  return marks >= 8 || marks / Math.max(text.length, 1) > 0.015;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function detectCoins(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [key, sym] of COIN_MAP) {
    if (lower.includes(key)) found.add(sym);
  }
  return [...found].filter((c) => c !== "CRYPTO").slice(0, 5);
}

function wrapTitle(title, maxLen = 42) {
  const words = title.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = w;
      if (lines.length >= 3) break;
    } else line = next;
  }
  if (line && lines.length < 3) lines.push(line);
  return lines.map((l) => (l.length > maxLen ? `${l.slice(0, maxLen - 1)}…` : l));
}

function generateFeaturedSvg({ title, source, coins, dateLabel }) {
  const lines = wrapTitle(title, 40);
  const coinLabel = coins.length ? coins.slice(0, 3).join(" · ") : "CRYPTO";
  const titleSvg = lines
    .map(
      (line, i) =>
        `<text x="64" y="${250 + i * 46}" fill="#EAECEF" font-family="Segoe UI, system-ui, sans-serif" font-size="34" font-weight="700">${escapeXml(line)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B0E11"/>
      <stop offset="100%" stop-color="#1E2329"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#FCD535"/>
      <stop offset="1" stop-color="#F0B90B"/>
    </linearGradient>
    <radialGradient id="glow" cx="88%" cy="12%" r="42%">
      <stop offset="0%" stop-color="#FCD535" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#FCD535" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="8" height="630" fill="#FCD535"/>
  <!-- Logo monogram CM -->
  <rect x="56" y="48" width="40" height="40" rx="9" fill="#161A1F" stroke="#343B44"/>
  <path d="M73.2 61.2C71.1 61.2 69.4 63.1 69.4 65.6V70.4C69.4 72.9 71.1 74.8 73.2 74.8C74.55 74.8 75.7 74.05 76.25 72.9" stroke="#E8EAED" stroke-width="2.1" stroke-linecap="round"/>
  <path d="M77.2 74.5V63.8L80.6 70.2L84 63.8V74.5" stroke="#E8EAED" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="84.2" cy="62.2" r="1.35" fill="#B89A2E"/>
  <text x="108" y="66" fill="#EAECEF" font-family="Segoe UI, system-ui, sans-serif" font-size="18" font-weight="600">Crypto Market <tspan fill="#929AA5" font-size="12" font-weight="600">VN</tspan></text>
  <text x="108" y="86" fill="#707A8A" font-family="Segoe UI, system-ui, sans-serif" font-size="11">Thị trường · Tin tức · Phân tích</text>
  <text x="64" y="128" fill="#929AA5" font-family="Segoe UI, system-ui, sans-serif" font-size="15">${escapeXml(source)} · ${escapeXml(dateLabel)}</text>
  ${titleSvg}
  <rect x="64" y="480" width="200" height="38" rx="6" fill="#FCD535"/>
  <text x="164" y="505" text-anchor="middle" fill="#181A20" font-family="Segoe UI, system-ui, sans-serif" font-size="14" font-weight="700">${escapeXml(coinLabel)}</text>
  <text x="64" y="560" fill="#707A8A" font-family="Segoe UI, system-ui, sans-serif" font-size="13">Tin thị trường · Tham khảo, không phải tư vấn đầu tư</text>
</svg>`;


function extractImageFromItem(item) {
  if (item.enclosure?.url && /\.(jpe?g|png|webp|gif)/i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  for (const m of item.mediaContent || []) {
    const url = m?.$?.url || m?.url;
    if (url) return url;
  }
  for (const m of item.mediaThumbnail || []) {
    const url = m?.$?.url || m?.url;
    if (url) return url;
  }
  const html = item.contentEncoded || item.content || "";
  const img = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return img?.[1] || null;
}

function extractBodyFromHtml(html) {
  if (!html) return "";
  let h = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const candidates = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*post__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*content-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*article__body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const re of candidates) {
    const m = h.match(re);
    if (m?.[1] && stripHtml(m[1]).length > 200) return m[1];
  }

  const ps = [...h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[0])
    .join("\n");
  if (stripHtml(ps).length > 200) return ps;
  return "";
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "vi,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchOgAndBody(pageUrl) {
  const html = await fetchPage(pageUrl);
  if (!html) return { og: null, bodyHtml: "" };
  const og =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ) ||
    html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    );
  return {
    og: og?.[1] || null,
    bodyHtml: extractBodyFromHtml(html),
  };
}

function chunkText(text, size = 3500) {
  const parts = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.5) cut = rest.lastIndexOf(". ", size);
    if (cut < size * 0.5) cut = size;
    parts.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) parts.push(rest);
  return parts;
}

async function translateChunk(text) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "vi");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = await res.json();
  return (data?.[0] || []).map((row) => row?.[0] || "").join("");
}

async function translateToVi(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (looksVietnamese(raw) && raw.length > 80) return raw;

  const chunks = chunkText(raw, 3200);
  const out = [];
  for (const chunk of chunks) {
    try {
      out.push(await translateChunk(chunk));
      await sleep(250);
    } catch (e) {
      console.warn("  ! dịch lỗi, giữ đoạn gốc:", e.message);
      out.push(chunk);
      await sleep(800);
    }
  }
  return out.join("").trim();
}

function paragraphsToContent(paragraphs) {
  return paragraphs.join("\n\n").slice(0, MAX_BODY_CHARS);
}

function cleanJunk(text) {
  return String(text || "")
    .replace(/Đọc\s*\d+\s*phút[^\n]*/gi, "")
    .replace(/Read\s*\d+\s*min[^\n]*/gi, "")
    .replace(/Share this article[^\n]*/gi, "")
    .replace(/Chia sẻ bài viết này[^\n]*/gi, "")
    .replace(/Sao chép liên kết[^\n]*/gi, "")
    .replace(/Copy link[^\n]*/gi, "")
    .replace(/Follow us[^\n]*/gi, "")
    .replace(/Subscribe[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function makeSummary(content, max = 280) {
  const one = cleanJunk(content).replace(/\n+/g, " ").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const dot = cut.lastIndexOf(".");
  return (dot > 120 ? cut.slice(0, dot + 1) : cut.trim()) + (dot > 120 ? "" : "…");
}

function hotScore(publishedAt, weight = 1) {
  const ageH =
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  // Tin càng mới điểm càng cao; trong HOT_HOURS được boost
  const recency = Math.max(0, HOT_HOURS - ageH);
  return recency * 10 + weight * 5 - ageH * 0.1;
}

async function loadExisting() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { updatedAt: null, posts: [], sources: [] };
  }
}

async function main() {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await mkdir(IMAGE_DIR, { recursive: true });

  // Làm mới toàn bộ để ưu tiên tin mới + full content VI
  const byId = new Map();
  const sourcesHit = new Set();

  console.log("Cào tin mới nhất + full nội dung + dịch tiếng Việt…\n");

  for (const feed of FEEDS) {
    try {
      console.log(`→ ${feed.name} (${feed.lang})`);
      const parsed = await parser.parseURL(feed.url);
      sourcesHit.add(feed.name);
      const items = (parsed.items || []).slice(0, PER_FEED);

      for (const item of items) {
        const link = item.link || item.guid;
        if (!link || typeof link !== "string") continue;
        const id = createHash("sha1").update(link).digest("hex").slice(0, 16);
        if (byId.has(id)) continue;

        const titleRaw = stripHtml(item.title || "Không tiêu đề").slice(0, 240);
        const publishedAt = item.isoDate
          ? new Date(item.isoDate).toISOString()
          : item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString();

        // Giữ tin trong 14 ngày (vẫn ưu tiên mới qua hotScore)
        const ageDays =
          (Date.now() - new Date(publishedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        if (ageDays > 14) continue;

        let bodyHtml =
          item.contentEncoded ||
          (item.content && item.content.length > 400 ? item.content : "") ||
          "";
        let image = extractImageFromItem(item);

        const page = await fetchOgAndBody(link);
        if (page.og && !image) image = page.og;
        if (stripHtml(page.bodyHtml).length > stripHtml(bodyHtml).length) {
          bodyHtml = page.bodyHtml;
        }

        let paragraphs = htmlToParagraphs(bodyHtml);
        if (paragraphs.length < 2) {
          const snip = stripHtml(
            item.contentSnippet || item.summary || item.content || "",
          );
          if (snip.length > 80) paragraphs = [snip];
        }

        let content = cleanJunk(paragraphsToContent(paragraphs));
        if (content.length < 120) {
          content = cleanJunk(
            stripHtml(item.contentSnippet || item.summary || titleRaw),
          );
        }

        console.log(`   · ${titleRaw.slice(0, 70)}… (${content.length} ký tự)`);

        let titleVi = titleRaw;
        let contentVi = content;
        if (feed.lang !== "vi" || !looksVietnamese(content + titleRaw)) {
          titleVi = cleanJunk(await translateToVi(titleRaw));
          contentVi = cleanJunk(await translateToVi(content));
        } else {
          contentVi = cleanJunk(content);
          titleVi = cleanJunk(titleRaw);
        }

        const summaryVi = makeSummary(contentVi);
        const coins = detectCoins(`${titleRaw} ${content} ${titleVi}`);
        const slugBase = slugify(titleVi) || slugify(titleRaw) || id;
        const slug = `${slugBase}-${id.slice(0, 6)}`;

        // Ảnh: remote og (mỗi bài khác) + brandCard local làm fallback
        const dateLabel = new Date(publishedAt).toLocaleDateString("vi-VN");
        const svg = generateFeaturedSvg({
          title: titleVi,
          source: feed.name,
          coins,
          dateLabel,
        });
        const cardPath = `/images/posts/${slug}-card.svg`;
        await writeFile(path.join(IMAGE_DIR, `${slug}-card.svg`), svg, "utf8");

        let remoteImage = image || null;
        if (remoteImage?.startsWith("//")) {
          remoteImage = `https:${remoteImage}`;
        }
        if (
          remoteImage &&
          !remoteImage.startsWith("http://") &&
          !remoteImage.startsWith("https://")
        ) {
          remoteImage = null;
        }

        // featuredImage = ảnh gốc nếu có (đa dạng); không thì card local
        const featuredImage = remoteImage || cardPath;
        const imageSource = remoteImage ? "og" : "generated";

        byId.set(id, {
          id,
          slug,
          title: titleRaw,
          titleVi,
          summary: makeSummary(content),
          summaryVi,
          content,
          contentVi,
          source: feed.name,
          sourceUrl: link,
          publishedAt,
          coins,
          featuredImage,
          brandCard: cardPath,
          coverRemote: remoteImage,
          imageSource,
          tags: ageDays < 1 ? ["moi", "hot"] : ageDays < 3 ? ["moi"] : ["tin"],
          lang: feed.lang,
          score: hotScore(publishedAt, feed.weight),
        });

        await sleep(150);
      }
    } catch (err) {
      console.error(`  ✗ ${feed.name}:`, err.message || err);
    }
  }

  const posts = [...byId.values()]
    .sort((a, b) => {
      // Điểm hot trước, rồi thời gian
      if (b.score !== a.score) return b.score - a.score;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    })
    .slice(0, MAX_POSTS);

  const index = {
    updatedAt: new Date().toISOString(),
    posts,
    sources: [...sourcesHit],
  };

  await writeFile(DATA_FILE, JSON.stringify(index, null, 2), "utf8");
  console.log(
    `\nXong: ${posts.length} bài · nguồn: ${index.sources.join(", ")}`,
  );
  console.log(`File: ${DATA_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
