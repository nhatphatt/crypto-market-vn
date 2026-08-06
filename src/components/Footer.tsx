import Link from "next/link";
import { SITE, NAV } from "@/lib/constants";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-hairline bg-canvas">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:px-6">
        <div>
          <Logo size={40} showTagline href="/" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            {SITE.description}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Thông tin chỉ mang tính tham khảo, không phải lời khuyên đầu tư.
            Giá lấy từ CoinGecko, Binance và alternative.me. Tin tổng hợp từ
            nhiều nguồn; luôn tự nghiên cứu và quản lý rủi ro.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Điều hướng
            </p>
            <ul className="mt-3 space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-strong transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Nguồn dữ liệu
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-strong">
              <li>CoinGecko</li>
              <li>Binance</li>
              <li>Fear and Greed</li>
              <li>Tin trong nước và quốc tế</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-4 text-xs text-muted md:px-6">
          <Logo variant="mark" size={22} href={null} showTagline={false} />
          <span>
            © {new Date().getFullYear()} {SITE.name}. Dùng để học hỏi và theo
            dõi thị trường.
          </span>
        </div>
      </div>
    </footer>
  );
}
