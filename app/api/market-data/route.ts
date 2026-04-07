import { NextRequest } from "next/server";
import { getMarketChart, getOHLC } from "@/lib/coingecko";
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

    // Fetch price data and OHLC in parallel
    const [priceResult, ohlc] = await Promise.all([
      getMarketChart(coin, days),
      getOHLC(coin, days),
    ]);

    const { prices, change24h, lastPrice } = priceResult;

    // For very short timeframes (1-3 days), we may have fewer data points
    // Indicators need at least 50 points — skip them if not enough
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
      ohlc,
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
    return Response.json(
      { error: "Failed to fetch market data. Please try again." },
      { status: 500 }
    );
  }
}
