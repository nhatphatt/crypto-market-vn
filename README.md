# Crypto Market VN

Dashboard crypto tiếng Việt: giá live, chart Binance, tin tức.

| | |
|--|--|
| Host | **Cloudflare Pages** (static) — `crypto-market-vn.pages.dev` |
| Stack | Next.js static export · Tailwind · Binance client |
| Repo | https://github.com/nhatphatt/crypto-market-vn |

## Live

**https://crypto-market-vn.pages.dev**

## Tự động

| Dữ liệu | Cơ chế |
|---------|--------|
| Giá / % | Browser → Binance WebSocket |
| Chart nến | Browser → Binance REST |
| Tin | `npm run scrape` → build → Pages deploy |
| Market snapshot HTML | Build-time CoinGecko (mỗi lần deploy) |

## Local

```bash
npm install
npm run scrape   # optional
npm run dev
npm run build    # ra thư mục out/
npm run deploy   # wrangler pages deploy out
```

## Deploy Pages

```bash
npx wrangler login
npm run deploy
```

GitHub Actions (`news-scrape`): scrape mỗi 6h. Để auto-deploy trên CI, thêm secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` (`290f69d3cd1b18cd0669a591a9e624b5`)

## Không dùng Workers

Site là **HTML tĩnh** trên Pages. Không OpenNext / Worker runtime.
