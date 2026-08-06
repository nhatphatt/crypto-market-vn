import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Phân trang gọn:
 * - Nút Trước / số trang / Sau
 * - Luôn có trang 1 và trang cuối trong dãy số (kèm …)
 * - Không nhãn "Trang X/Y", không link "Tới trang cuối"
 */
function buildPageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const set = new Set<number>();
  set.add(1);
  set.add(totalPages);
  set.add(page);
  set.add(page - 1);
  set.add(page + 1);
  set.add(page - 2);
  set.add(page + 2);

  if (page <= 3) {
    set.add(2);
    set.add(3);
    set.add(4);
    set.add(5);
  }
  if (page >= totalPages - 2) {
    set.add(totalPages - 1);
    set.add(totalPages - 2);
    set.add(totalPages - 3);
    set.add(totalPages - 4);
  }

  const sorted = [...set]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  basePath = "/tin-tuc",
}: {
  page: number;
  totalPages: number;
  basePath?: string;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  const items = buildPageList(page, totalPages);

  const btnBase =
    "inline-flex h-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors";
  const btnIdle =
    "border-hairline bg-surface-card text-body hover:border-primary/40 hover:text-primary";
  const btnActive = "border-primary bg-primary text-ink";
  const btnDisabled =
    "pointer-events-none opacity-40 border-hairline bg-surface-card text-muted";

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
      aria-label="Phân trang tin tức"
    >
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        aria-label="Trang trước"
        className={[
          btnBase,
          "gap-1 px-3",
          page <= 1 ? btnDisabled : btnIdle,
        ].join(" ")}
      >
        <CaretLeft weight="bold" className="h-4 w-4" />
        <span className="hidden sm:inline">Trước</span>
      </Link>

      {items.map((item, i) =>
        item === "…" ? (
          <span
            key={`e-${i}`}
            className="inline-flex h-10 min-w-8 items-center justify-center px-1 text-sm text-muted"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Trang ${item}`}
            className={[
              btnBase,
              "min-w-10 px-2.5 tabular-nums",
              item === page ? btnActive : btnIdle,
            ].join(" ")}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        aria-label="Trang sau"
        className={[
          btnBase,
          "gap-1 px-3",
          page >= totalPages ? btnDisabled : btnIdle,
        ].join(" ")}
      >
        <span className="hidden sm:inline">Sau</span>
        <CaretRight weight="bold" className="h-4 w-4" />
      </Link>
    </nav>
  );
}
