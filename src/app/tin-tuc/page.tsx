import type { Metadata } from "next";
import { BlogCard } from "@/components/BlogCard";
import { Pagination } from "@/components/Pagination";
import { getNewsMeta, getPostsPage } from "@/lib/news";
import { formatDateTime } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tin tức",
  description:
    "Tin crypto mới nhất: nội dung đầy đủ, cập nhật từ nhiều nguồn.",
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  const [{ posts, page, totalPages, total }, meta] = await Promise.all([
    getPostsPage(pageNum),
    getNewsMeta(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-body md:text-4xl">
          Tin tức
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
          Tin mới và đang nóng. Bấm vào bài để đọc đầy đủ.
        </p>
        <p className="mt-3 text-xs text-muted">
          {total} bài
          {totalPages > 1
            ? ` · ${totalPages} trang (đang xem trang ${page})`
            : ""}
          {meta.updatedAt && meta.updatedAt !== new Date(0).toISOString()
            ? ` · Cập nhật ${formatDateTime(meta.updatedAt)}`
            : ""}
        </p>
      </header>

      {posts.length > 0 ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} />
        </>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-hairline bg-surface-card p-12 text-center">
          <p className="text-base font-medium text-body">Chưa có tin nào</p>
          <p className="mt-2 text-sm text-muted">
            Dữ liệu tin đang được cập nhật. Vui lòng quay lại sau.
          </p>
        </div>
      )}
    </div>
  );
}
