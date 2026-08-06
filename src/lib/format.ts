/**
 * Format số cố định giữa server Node và browser
 * (tránh hydration mismatch do Intl compact / locale khác nhau).
 */

function isBad(value: unknown): value is null | undefined {
  return value == null || (typeof value === "number" && Number.isNaN(value));
}

/** Rút gọn ổn định: 1.30B, 45.2M, 12.5K (luôn dấu chấm thập phân) */
function compactNumber(value: number, maxFrac = 2): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [div, suffix] of units) {
    if (abs >= div) {
      const n = abs / div;
      // tối đa maxFrac chữ số thập phân, bỏ zero thừa
      let s = n.toFixed(maxFrac);
      s = s.replace(/\.?0+$/, "");
      return `${sign}${s}${suffix}`;
    }
  }
  if (abs >= 1) return `${sign}${abs.toFixed(0)}`;
  return `${sign}${abs.toPrecision(3)}`;
}

/** Giá USD đầy đủ, deterministic */
function fullUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "$0.00";
  if (abs >= 1) {
    // 2 chữ số thập phân, phân tách hàng nghìn bằng dấu phẩy
    const fixed = abs.toFixed(2);
    const [intPart, dec] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${value < 0 ? "-" : ""}$${withCommas}.${dec}`;
  }
  // giá nhỏ: tối đa 6 chữ số có nghĩa sau dấu chấm, bỏ 0 thừa
  let s = abs.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  if (!s.includes(".")) s += ".00";
  return `${value < 0 ? "-" : ""}$${s}`;
}

export function formatUsd(value: number, compact = false): string {
  if (isBad(value)) return "—";
  if (compact) return `$${compactNumber(value, 2)}`;
  return fullUsd(value);
}

export function formatVnd(usd: number, rate: number | null | undefined): string {
  if (isBad(usd) || !rate) return "—";
  const v = Math.round(usd * rate);
  const abs = Math.abs(v);
  const withDots = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${v < 0 ? "-" : ""}${withDots}₫`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (isBad(value)) return "—";
  const abs = Math.abs(value);
  if (digits === 0) {
    const n = Math.round(abs);
    const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${value < 0 ? "-" : ""}${s}`;
  }
  const fixed = abs.toFixed(digits);
  const [intPart, dec] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value < 0 ? "-" : ""}${withCommas}.${dec}`;
}

/**
 * Thời gian tương đối – chỉ dùng an toàn trên client
 * hoặc khi đã mounted (tránh Date.now() lệch SSR).
 */
export function formatRelativeTime(iso: string, nowMs?: number): string {
  try {
    const now = nowMs ?? Date.now();
    const diff = now - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "vừa xong";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} phút trước`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return `${d} ngày trước`;
  } catch {
    return "";
  }
}

export function formatPct(value: number | null | undefined): string {
  if (isBad(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Ngày giờ cố định timezone + en-GB-like numeric → ổn định SSR */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    // Asia/Ho_Chi_Minh = UTC+7 cố định (không DST)
    const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
    const vn = new Date(utc + 7 * 60 * 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dd = pad(vn.getUTCDate());
    const mm = pad(vn.getUTCMonth() + 1);
    const yyyy = vn.getUTCFullYear();
    const hh = pad(vn.getUTCHours());
    const mi = pad(vn.getUTCMinutes());
    return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
    const vn = new Date(utc + 7 * 60 * 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
  } catch {
    return iso;
  }
}

export function pctTone(
  value: number | null | undefined,
): "up" | "down" | "flat" {
  if (isBad(value) || Math.abs(value) < 0.005) return "flat";
  return value > 0 ? "up" : "down";
}
