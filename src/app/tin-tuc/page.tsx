import type { Metadata } from "next";
import { NewsBrowser } from "@/components/NewsBrowser";
import { getAllPosts, getNewsMeta } from "@/lib/news";

export const metadata: Metadata = {
  title: "Tin tức",
  description:
    "Tin crypto mới nhất: nội dung đầy đủ, cập nhật từ nhiều nguồn.",
};

/** Static export: phân trang client, data bake lúc build */
export default async function NewsPage() {
  const [posts, meta] = await Promise.all([getAllPosts(), getNewsMeta()]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
      <NewsBrowser posts={posts} updatedAt={meta.updatedAt} />
    </div>
  );
}
