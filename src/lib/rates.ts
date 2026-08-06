/** Tỷ giá USD → VND (CoinGecko) */
export async function fetchUsdVndRate(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd",
      { next: { revalidate: 3600 }, headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { tether?: { vnd?: number } };
    return j.tether?.vnd ?? null;
  } catch {
    return null;
  }
}
