import { SMA, EMA, RSI, MACD, BollingerBands } from "technicalindicators";
import type { IndicatorData, SimplePrice } from "./types";

export function computeIndicators(prices: SimplePrice[]): IndicatorData {
  const closePrices = prices.map((p) => p.value);

  // SMA
  const sma20Values = SMA.calculate({ period: 20, values: closePrices });
  const sma50Values = SMA.calculate({ period: 50, values: closePrices });

  // EMA
  const ema12Values = EMA.calculate({ period: 12, values: closePrices });
  const ema26Values = EMA.calculate({ period: 26, values: closePrices });

  // RSI
  const rsiValues = RSI.calculate({ period: 14, values: closePrices });

  // MACD
  const macdResult = MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  // Bollinger Bands
  const bbResult = BollingerBands.calculate({
    period: 20,
    values: closePrices,
    stdDev: 2,
  });

  // Pad arrays so they align with price data (indicators start later due to lookback)
  const padStart = (arr: number[], total: number) => {
    const padding = new Array(total - arr.length).fill(null);
    return [...padding, ...arr];
  };

  const n = closePrices.length;

  return {
    sma20: padStart(sma20Values, n) as number[],
    sma50: padStart(sma50Values, n) as number[],
    ema12: padStart(ema12Values, n) as number[],
    ema26: padStart(ema26Values, n) as number[],
    rsi: padStart(rsiValues, n) as number[],
    macd: {
      macd: padStart(
        macdResult.map((m) => m.MACD ?? 0),
        n
      ) as number[],
      signal: padStart(
        macdResult.map((m) => m.signal ?? 0),
        n
      ) as number[],
      histogram: padStart(
        macdResult.map((m) => m.histogram ?? 0),
        n
      ) as number[],
    },
    bollingerBands: {
      upper: padStart(
        bbResult.map((b) => b.upper),
        n
      ) as number[],
      middle: padStart(
        bbResult.map((b) => b.middle),
        n
      ) as number[],
      lower: padStart(
        bbResult.map((b) => b.lower),
        n
      ) as number[],
    },
  };
}

export function getLatestIndicatorSummary(indicators: IndicatorData) {
  const last = (arr: number[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] != null) return arr[i];
    }
    return 0;
  };

  return {
    rsiLatest: last(indicators.rsi),
    sma20Latest: last(indicators.sma20),
    sma50Latest: last(indicators.sma50),
    ema12Latest: last(indicators.ema12),
    ema26Latest: last(indicators.ema26),
    macdLatest: last(indicators.macd.macd),
    macdSignalLatest: last(indicators.macd.signal),
    macdHistogramLatest: last(indicators.macd.histogram),
    bollingerUpper: last(indicators.bollingerBands.upper),
    bollingerMiddle: last(indicators.bollingerBands.middle),
    bollingerLower: last(indicators.bollingerBands.lower),
  };
}
