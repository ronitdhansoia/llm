import type { SimplePrice, PricePoint } from "./types";

const BASE_URL = "https://api.coingecko.com/api/v3";

// In-memory cache with variable TTL
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

async function cachedFetch<T>(url: string, ttl = 60_000): Promise<T> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && now - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cache.set(url, { data, timestamp: now, ttl });
  return data as T;
}

export async function getMarketChart(
  coin: string,
  days: number
): Promise<{ prices: SimplePrice[]; change24h: number; lastPrice: number }> {
  const url = `${BASE_URL}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`;
  // Shorter cache for short timeframes
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
