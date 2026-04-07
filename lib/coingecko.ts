import type { SimplePrice, PricePoint } from "./types";

const BASE_URL = "https://api.coingecko.com/api/v3";

// In-memory cache with variable TTL
const cache = new Map<
  string,
  { data: unknown; timestamp: number; ttl: number }
>();

async function cachedFetch<T>(url: string, ttl = 60_000): Promise<T> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && now - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }

  // Retry with backoff for rate limiting
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Wait before retry: 1s, 3s
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (res.status === 429) {
        // Rate limited — retry
        lastError = new Error("Rate limited by CoinGecko. Retrying...");
        continue;
      }

      if (!res.ok) {
        throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      cache.set(url, { data, timestamp: now, ttl });
      return data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Network errors — retry
      if (attempt < 2) continue;
    }
  }

  throw lastError || new Error("Failed to fetch from CoinGecko");
}

export async function getMarketChart(
  coin: string,
  days: number
): Promise<{ prices: SimplePrice[]; change24h: number; lastPrice: number }> {
  const url = `${BASE_URL}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`;
  const ttl = days <= 3 ? 30_000 : 60_000;
  const data = await cachedFetch<{
    prices: [number, number][];
  }>(url, ttl);

  const prices: SimplePrice[] = data.prices.map(([time, value]) => ({
    time,
    value,
  }));

  const lastPrice = prices[prices.length - 1]?.value ?? 0;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const priceOneDayAgo =
    prices.find((p) => p.time >= oneDayAgo)?.value ?? prices[0]?.value ?? 0;
  const change24h =
    priceOneDayAgo > 0
      ? ((lastPrice - priceOneDayAgo) / priceOneDayAgo) * 100
      : 0;

  return { prices, change24h, lastPrice };
}

export async function getOHLC(
  coin: string,
  days: number
): Promise<PricePoint[]> {
  const url = `${BASE_URL}/coins/${coin}/ohlc?vs_currency=usd&days=${days}`;
  const ttl = days <= 3 ? 30_000 : 60_000;
  const data = await cachedFetch<[number, number, number, number, number][]>(
    url,
    ttl
  );

  return data.map(([time, open, high, low, close]) => ({
    time,
    open,
    high,
    low,
    close,
  }));
}
