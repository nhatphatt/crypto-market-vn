import { readFile } from "fs/promises";
import path from "path";
import type { NewsIndex, NewsPost } from "./types";

const PAGE_SIZE = 12;

/** Fallback rỗng — luôn an toàn khi thiếu file */
const EMPTY: NewsIndex = {
  updatedAt: new Date(0).toISOString(),
  posts: [],
  sources: [],
};

export function getPageSize() {
  return PAGE_SIZE;
}

/**
 * Load news.json:
 * 1) import tĩnh (bundle vào build — Cloudflare/OpenNext ổn định)
 * 2) fallback đọc disk (dev / rebuild local)
 */
async function loadIndex(): Promise<NewsIndex> {
  // Dynamic import JSON — Next/OpenNext bundle được
  try {
    const mod = await import("../../data/news.json");
    const data = (mod as { default?: NewsIndex } & NewsIndex).default ?? mod;
    if (data && Array.isArray((data as NewsIndex).posts)) {
      return data as NewsIndex;
    }
  } catch {
    /* fallback fs */
  }

  try {
    const file = path.join(process.cwd(), "data", "news.json");
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as NewsIndex;
    if (Array.isArray(parsed.posts)) return parsed;
  } catch {
    /* empty */
  }

  return { ...EMPTY };
}

/**
 * Sắp xếp tin: MỚI NHẤT LÊN ĐẦU.
 *
 * Trước đây ưu tiên `score` rồi mới tới ngày, nhưng `score` được tính một lần
 * lúc cào rồi đóng băng trong news.json — bài cũ giữ điểm cao vĩnh viễn và
 * đè lên bài mới. Giờ sắp thuần theo thời gian đăng.
 */
function sortPosts(posts: NewsPost[]): NewsPost[] {
  return posts.slice().sort((a, b) => {
    const tb = new Date(b.publishedAt).getTime();
    const ta = new Date(a.publishedAt).getTime();
    const bValid = Number.isFinite(tb);
    const aValid = Number.isFinite(ta);
    // Bài thiếu/hỏng ngày đẩy xuống cuối thay vì nhảy lên đầu
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;
    if (tb !== ta) return tb - ta;
    // Cùng thời điểm thì bài "hot" hơn lên trước
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export async function getAllPosts(): Promise<NewsPost[]> {
  const index = await loadIndex();
  return sortPosts(index.posts || []);
}

export async function getNewsMeta() {
  const index = await loadIndex();
  return {
    updatedAt: index.updatedAt,
    sources: index.sources || [],
    total: (index.posts || []).length,
  };
}

export async function getPostsPage(page: number) {
  const posts = await getAllPosts();
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    posts: posts.slice(start, start + PAGE_SIZE),
    page: safePage,
    totalPages,
    total,
  };
}

export async function getPostBySlug(slug: string): Promise<NewsPost | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export async function getLatestPosts(n = 6): Promise<NewsPost[]> {
  const posts = await getAllPosts();
  return posts.slice(0, n);
}
