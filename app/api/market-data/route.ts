import { NextRequest } from "next/server";
import { getMarketChart } from "@/lib/coingecko";
import { computeIndicators } from "@/lib/indicators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const coin = searchParams.get("coin") || "bitcoin";
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (days < 1 || days > 365) {
      return Response.json(
        { error: "Days must be between 1 and 365" },
        { status: 400 }
      );
    }

    const { prices, change24h, lastPrice } = await getMarketChart(coin, days);

    // For very short timeframes (1-3 days), we may have fewer data points
    // Indicators need at least 50 points - skip them if not enough
    const hasEnoughForIndicators = prices.length >= 50;

    const indicators = hasEnoughForIndicators
      ? computeIndicators(prices)
      : {
          sma20: [],
          sma50: [],
          ema12: [],
          ema26: [],
          rsi: [],
          macd: { macd: [], signal: [], histogram: [] },
          bollingerBands: { upper: [], middle: [], lower: [] },
        };

    return Response.json({
      prices,
      ohlc: [],
      indicators,
      metadata: {
        coin,
        days,
        lastPrice,
        change24h,
      },
    });
  } catch (error) {
    console.error("Market data error:", error);
    const message =
      error instanceof Error && error.message.includes("429")
        ? "Rate limited by data provider. Please wait a moment and try again."
        : "Failed to fetch market data. Please try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
