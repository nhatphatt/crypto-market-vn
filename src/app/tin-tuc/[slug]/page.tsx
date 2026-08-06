import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { getAllPosts, getPostBySlug } from "@/lib/news";
import { formatDateTime } from "@/lib/format";
import { NewsCover } from "@/components/NewsCover";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy" };
  const title = post.titleVi || post.title;
  const description = (post.summaryVi || post.summary || "").slice(0, 180);
  // Mạng xã hội ưu tiên JPG/PNG 1200×630 — SVG brand card thường không hiện
  const remote =
    (post.coverRemote && post.coverRemote.startsWith("http")
      ? post.coverRemote
      : null) ||
    (post.featuredImage && post.featuredImage.startsWith("http")
      ? post.featuredImage
      : null);
  const image = remote || "/og-image.png";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "article",
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

function bodyParagraphs(post: {
  contentVi?: string;
  content?: string;
  summaryVi?: string;
  summary?: string;
}): string[] {
  const raw =
    post.contentVi?.trim() ||
    post.content?.trim() ||
    post.summaryVi?.trim() ||
    post.summary?.trim() ||
    "";
  if (!raw) return [];
  return raw
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 20)
    .filter(
      (p) =>
        !/^(chia sẻ|share|đọc \d+|copy link|theo dõi|subscribe)/i.test(p),
    );
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const title = post.titleVi || post.title;
  const paragraphs = bodyParagraphs(post);
  const isHot =
    post.tags?.includes("hot") ||
    post.tags?.includes("moi") ||
    Date.now() - new Date(post.publishedAt).getTime() < 1000 * 60 * 60 * 24;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <Link
        href="/tin-tuc"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-strong transition-colors hover:text-primary"
      >
        <ArrowLeft weight="bold" className="h-4 w-4" />
        Về danh sách tin
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted">
        {isHot && (
          <span className="rounded-sm bg-primary/15 px-2 py-1 font-semibold text-primary">
            Mới
          </span>
        )}
        <span className="rounded-sm bg-surface-elevated px-2 py-1 font-medium text-muted-strong">
          {post.source}
        </span>
        <time dateTime={post.publishedAt}>
          {formatDateTime(post.publishedAt)}
        </time>
      </div>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-body md:text-4xl md:leading-[1.2]">
        {title}
      </h1>

      <div className="relative mt-6 aspect-[1200/630] overflow-hidden rounded-xl border border-hairline bg-surface-card">
        <NewsCover
          featuredImage={post.featuredImage}
          brandCard={post.brandCard}
          alt={title}
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="mt-8 space-y-4">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-base leading-[1.75] text-muted-strong"
            >
              {p}
            </p>
          ))
        ) : (
          <p className="text-base leading-relaxed text-muted">
            Chưa tải được nội dung đầy đủ cho bài này.
          </p>
        )}
      </div>

      {post.coins.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.coins.map((c) => (
            <span
              key={c}
              className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold uppercase text-primary"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-ink transition-colors hover:bg-primary-active"
        >
          Xem nguồn gốc
          <ArrowSquareOut weight="bold" className="h-4 w-4" />
        </a>
        <Link
          href="/tin-tuc"
          className="inline-flex h-11 items-center rounded-md border border-hairline bg-surface-card px-5 text-sm font-semibold text-body"
        >
          Tin khác
        </Link>
      </div>

      <p className="mt-10 border-t border-hairline pt-6 text-xs leading-relaxed text-muted">
        Nguồn: {post.source}. Thông tin tham khảo, không phải tư vấn đầu tư.
      </p>
    </article>
  );
}
