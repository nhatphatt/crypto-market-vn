/**
 * OG 1200×630 = abstract art + logo chính xác của web + chữ gọn.
 * Usage: node scripts/build-og-image.mjs [source.jpg]
 */
import sharp from "sharp";
import { stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const src =
  process.argv[2] || path.join(ROOT, "assets", "og-source.jpg");

// Logo monogram — khớp public/logo.svg + Logo.tsx
const logoMark = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="72" height="72" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="6" y1="2" x2="34" y2="38" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22272E"/>
      <stop offset="1" stop-color="#161A1F"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="9" fill="url(#bg)"/>
  <rect x="0.5" y="0.5" width="39" height="39" rx="8.5" stroke="#343B44" stroke-width="1"/>
  <path d="M17.2 13.2C15.1 13.2 13.4 15.1 13.4 17.6V22.4C13.4 24.9 15.1 26.8 17.2 26.8C18.55 26.8 19.7 26.05 20.25 24.9" stroke="#EAECEF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21.2 26.5V15.8L24.6 22.2L28 15.8V26.5" stroke="#EAECEF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="28.2" cy="14.2" r="1.35" fill="#B89A2E"/>
</svg>`;

// Overlay chữ — chỉ nửa trái, không đè art bên phải
const overlay = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Vignette trái: chữ đọc rõ, art phải vẫn nổi -->
    <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0B0E11" stop-opacity="0.88"/>
      <stop offset="55%" stop-color="#0B0E11" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0B0E11" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#FCD535"/>
      <stop offset="1" stop-color="#E5A911"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="620" height="630" fill="url(#leftFade)"/>
  <rect x="0" y="0" width="5" height="630" fill="#FCD535"/>

  <!-- Brand wordmark — khớp Logo.tsx: "Crypto Market" + "VN" cùng hàng, tagline dưới -->
  <text x="148" y="82" fill="#EAECEF" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="-0.3">Crypto Market</text>
  <text x="352" y="82" fill="#929AA5" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="1.6">VN</text>
  <text x="148" y="108" fill="#707A8A" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="12" font-weight="500" letter-spacing="0.8">Thị trường · Tin tức · Phân tích</text>

  <!-- Headline gọn 2 dòng -->
  <text x="64" y="250" fill="#FFFFFF" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="46" font-weight="700" letter-spacing="-0.8">Nắm bắt thị trường</text>
  <text x="64" y="308" fill="#FFFFFF" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="46" font-weight="700" letter-spacing="-0.8">crypto mỗi ngày</text>

  <!-- 1 dòng mô tả -->
  <text x="64" y="368" fill="#A0A8B4" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="20" font-weight="500">Giá realtime · Fear &#38; Greed · Chart nến · Tin tiếng Việt</text>

  <!-- CTA -->
  <rect x="64" y="420" width="188" height="50" rx="12" fill="url(#gold)"/>
  <text x="158" y="452" text-anchor="middle" fill="#181A20" font-family="Segoe UI, Arial, sans-serif" font-size="17" font-weight="700">Xem thị trường</text>

  <text x="64" y="580" fill="#5E6673" font-family="Segoe UI, Arial, sans-serif" font-size="14">crypto-market-vn.pages.dev</text>
</svg>`;

// Upscale → downscale + sharpen
const baseBuf = await sharp(src)
  .resize(2400, 1260, { fit: "cover", position: "centre", kernel: "lanczos3" })
  .sharpen({ sigma: 0.8, m1: 0.6, m2: 0.3 })
  .resize(1200, 630, { fit: "fill", kernel: "lanczos3" })
  .sharpen({ sigma: 0.55, m1: 0.8, m2: 0.4 })
  .toBuffer();

const logoPng = await sharp(Buffer.from(logoMark))
  .resize(72, 72, { kernel: "lanczos3" })
  .png()
  .toBuffer();
const overlayPng = await sharp(Buffer.from(overlay))
  .resize(1200, 630, { kernel: "lanczos3" })
  .png()
  .toBuffer();

const composed = await sharp(baseBuf)
  .composite([
    { input: overlayPng, top: 0, left: 0 },
    { input: logoPng, top: 52, left: 64 },
  ])
  .sharpen({ sigma: 0.4, m1: 0.5, m2: 0.25 })
  .toBuffer();

await sharp(composed)
  .png({ compressionLevel: 6, quality: 100 })
  .toFile(path.join(PUBLIC, "og-image.png"));
await sharp(composed)
  .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: "4:4:4" })
  .toFile(path.join(PUBLIC, "og-image.jpg"));

console.log("og-image.png", (await stat(path.join(PUBLIC, "og-image.png"))).size);
console.log("og-image.jpg", (await stat(path.join(PUBLIC, "og-image.jpg"))).size);
console.log("done");
