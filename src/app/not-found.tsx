import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <LogoMark size={48} />
      <p className="mt-4 font-mono text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-body">
        Không tìm thấy trang
      </h1>
      <p className="mt-2 text-sm text-muted">
        Link có thể đã hết hạn hoặc bài tin chưa được cào.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-ink hover:bg-primary-active"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
