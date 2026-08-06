import type { FearGreed } from "./types";

const mapVi: Record<string, string> = {
  "Extreme Fear": "Sợ hãi cực độ",
  Fear: "Sợ hãi",
  Neutral: "Trung lập",
  Greed: "Tham lam",
  "Extreme Greed": "Tham lam cực độ",
};

export async function fetchFearGreed(): Promise<FearGreed | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch("https://api.alternative.me/fng/?limit=1", {
        next: { revalidate: 600 },
        headers: { Accept: "application/json" },
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      if (!res.ok) return null;
      const json = (await res.json()) as {
        data: Array<{
          value: string;
          value_classification: string;
          timestamp: string;
        }>;
      };
      const row = json.data?.[0];
      if (!row) return null;
      const classification = row.value_classification;
      return {
        value: Number(row.value),
        classification,
        classificationVi: mapVi[classification] ?? classification,
        timestamp: new Date(Number(row.timestamp) * 1000).toISOString(),
      };
    } catch {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return null;
}

export function fearGreedTone(value: number): string {
  if (value <= 25) return "text-trading-down";
  if (value <= 45) return "text-amber-400";
  if (value <= 55) return "text-body";
  if (value <= 75) return "text-primary";
  return "text-trading-up";
}
