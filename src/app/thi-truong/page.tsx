import type { Metadata } from "next";
import { UpdatedBadge } from "@/components/UpdatedBadge";
import { MarketWorkspace } from "@/components/MarketWorkspace";
import { MarketOverviewLive } from "@/components/MarketOverviewLive";
import {
  getFearGreed,
  getGlobalMarket,
  getTopCoins,
} from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Thị trường",
  description:
    "Bảng giá realtime top coin, tìm kiếm, lọc tăng giảm, volume và theo dõi.",
};

export default async function MarketPage() {
  const [coins, fear] = await Promise.all([
    getTopCoins(100),
    getFearGreed(),
  ]);
  const global = await getGlobalMarket(coins);
  const overviewUpdated = global?.updated_at || new Date().toISOString();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:space-y-7 md:px-6 md:py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-body md:text-3xl">
            Thị trường
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Giá realtime, bấm coin để xem chart
          </p>
        </div>
        <UpdatedBadge iso={overviewUpdated} label="Cập nhật" compact />
      </header>

      <MarketOverviewLive global={global} fear={fear} />
      <MarketWorkspace coins={coins} />
    </div>
  );
}
