# Crypto Market VN

Site theo dõi **giá coin realtime**, **Fear & Greed**, **top tăng/giảm** và **tin crypto** tiếng Việt.

| | |
|--|--|
| Stack | Next.js 16 · Tailwind v4 · Phosphor · lightweight-charts |
| Deploy | **Cloudflare** (OpenNext Workers) · `*.pages.dev` / workers.dev |
| Traffic | X (không phụ thuộc Google SEO) |
| Design | `DESIGN.md` (Binance dark + vàng `#FCD535`) |

---

## Tự động cập nhật (quan trọng)

| Dữ liệu | Cơ chế | Tần suất |
|---------|--------|----------|
| **Giá / % 24h** | Browser → Binance WebSocket + REST | Realtime khi mở trang |
| **Chart nến** | Browser → Binance klines (race 2 host) + fallback `/api/chart` | Cache tab ~90s |
| **Vốn hóa, volume, dominance** | Server fetch CoinGecko (ISR) | ~30–120s revalidate |
| **Fear & Greed** | alternative.me | ~10 phút |
| **Tin tức** | GitHub Actions cào RSS → commit `data/news.json` → CF rebuild | **Mỗi 6 giờ** (+ chạy tay) |

> Máy local **tắt** vẫn cập nhật: scrape chạy trên GitHub Actions; giá live chạy trên máy **người xem** (Binance public API).

Workflow: `.github/workflows/daily-scrape.yml`  
CI build: `.github/workflows/ci.yml`

---

## Chạy local

```bash
npm install
npm run scrape   # optional: cào tin mới
npm run dev      # http://localhost:3000
```

| Lệnh | Việc |
|------|------|
| `npm run dev` | Dev server |
| `npm run scrape` | Cào RSS → `data/news.json` + `public/images/posts/*` |
| `npm run build` | Production Next build (kiểm tra) |
| `npm run pages:build` | Build OpenNext cho Cloudflare |
| `npm run preview` | Preview bản CF local (Wrangler) |
| `npm run deploy` | Deploy lên Cloudflare Workers |

Biến môi trường: copy `.env.example` → `.env.local`

```
NEXT_PUBLIC_SITE_URL=https://your-domain.pages.dev
```

---

## Deploy Cloudflare

### A. Kết nối Git (khuyến nghị)

1. Push repo lên GitHub  
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → Create  
3. Chọn framework **OpenNext** / hoặc build custom:

| Setting | Value |
|---------|--------|
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` (hoặc preset OpenNext) |
| Root | `/` |
| Node | 22 |

4. Env vars (Production):  
   `NEXT_PUBLIC_SITE_URL` = URL public của site  

5. Bật **GitHub Actions** trên repo (Settings → Actions → allow) để workflow cào tin chạy được.

### B. Deploy từ máy

```bash
npx wrangler login
npm run deploy
```

Cần account Cloudflare + quyền Workers.

### Sau khi deploy

- Mỗi lần **Actions scrape** push tin → GitHub webhook → Cloudflare rebuild → tin mới lên production  
- Giá / chart **không cần** rebuild (client gọi Binance)

---

## Nguồn dữ liệu

| Loại | Nguồn | Key? |
|------|--------|------|
| Giá live, nến | Binance public REST/WS | Không |
| Market cap, list coin | CoinGecko free | Không (có rate limit) |
| Fear & Greed | alternative.me | Không |
| Tin | RSS (Cointelegraph, CoinDesk, VN…) | Không |

---

## Cấu trúc

```
src/app/                 # /, /thi-truong, /tin-tuc, /coin/[id], /api/chart
src/components/          # UI
src/lib/                 # markets, binance, chart, news…
scripts/scrape-news.mjs  # Cào tin
data/news.json           # Snapshot tin (commit vào git)
public/images/posts/     # Ảnh featured SVG
.github/workflows/       # scrape + CI
wrangler.toml            # Cloudflare Worker
open-next.config.ts
```

---

## Checklist trước go-live

- [ ] `npm run build` pass  
- [ ] Repo trên GitHub, Actions enabled  
- [ ] Cloudflare project connected / `npm run deploy` ok  
- [ ] `NEXT_PUBLIC_SITE_URL` đúng domain  
- [ ] Chạy thử workflow **Cào tin tự động** (Run workflow)  
- [ ] Mở production: giá live, chart BTC, tin hiển thị  

---

## Pháp lý

Thông tin tham khảo, **không phải tư vấn đầu tư**. Link nguồn tin gốc; tự quản lý rủi ro.
