import type { FearGreed, GlobalMarket } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { StatCard } from "./StatCard";
import { FearGreedCard } from "./FearGreedCard";

/**
 * Dải overview chuẩn trading UI (CoinMarketCap / Binance style):
 *
 * Desktop (lg+): 1 hàng 5 ô cùng chiều cao
 *   [MCap] [Vol] [BTC%] [ETH%] [FearGreed]
 *
 * Tablet (sm–md): 2 cột stats + Fear full width dưới
 * Mobile: stack dọc
 *
 * Không: Fear max-w-md “mồ côi” | stats 4 cột nhét cạnh Fear | h-full kéo phình card
 */
export function MarketOverviewBand({
  global,
  fear,
}: {
  global: GlobalMarket | null;
  fear: FearGreed | null;
}) {
  const volChange = global?.volume_change_percentage_24h;
  const hasVolChange =
    volChange != null && Number.isFinite(volChange) && volChange !== 0;

  const btcDomChg = global?.btc_dominance_change_24h;
  const ethDomChg = global?.eth_dominance_change_24h;
  const hasBtcDom =
    btcDomChg != null &&
    Number.isFinite(btcDomChg) &&
    Math.abs(btcDomChg) > 0.001;
  const hasEthDom =
    ethDomChg != null &&
    Number.isFinite(ethDomChg) &&
    Math.abs(ethDomChg) > 0.001;

  return (
    <section
      aria-label="Tổng quan thị trường"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3"
    >
      {/* 4 metrics – mobile/tablet 2 cột; desktop mỗi cái 1/5 */}
      <div className="sm:col-span-1">
        <StatCard
          label="Tổng vốn hóa"
          value={
            global && global.total_market_cap_usd > 0
              ? formatUsd(global.total_market_cap_usd, true)
              : "—"
          }
          change={
            global && Number.isFinite(global.market_cap_change_percentage_24h)
              ? global.market_cap_change_percentage_24h
              : null
          }
          changeUnit="percent"
          hint="24 giờ"
        />
      </div>

      <div className="sm:col-span-1">
        <StatCard
          label="Volume 24 giờ"
          value={
            global && global.total_volume_usd > 0
              ? formatUsd(global.total_volume_usd, true)
              : "—"
          }
          change={hasVolChange ? volChange : null}
          changeUnit="percent"
          hint={hasVolChange ? "24 giờ" : "giao dịch"}
        />
      </div>

      <div className="sm:col-span-1">
        <StatCard
          label="Tỷ trọng BTC"
          value={global ? `${global.btc_dominance.toFixed(2)}%` : "—"}
          change={hasBtcDom ? btcDomChg : null}
          changeUnit="points"
          hint="24 giờ"
        />
      </div>

      <div className="sm:col-span-1">
        <StatCard
          label="Tỷ trọng ETH"
          value={global ? `${global.eth_dominance.toFixed(2)}%` : "—"}
          change={hasEthDom ? ethDomChg : null}
          changeUnit="points"
          hint="24 giờ"
        />
      </div>

      {/* Fear: full width dưới tablet; cột 5 trên desktop – cùng hàng, cùng “nhịp” */}
      <div className="sm:col-span-2 lg:col-span-1">
        <FearGreedCard data={fear} variant="compact" />
      </div>
    </section>
  );
}
