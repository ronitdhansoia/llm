import type {
  StrategyRules,
  BacktestResult,
  Trade,
  SimplePrice,
  IndicatorData,
  MonteCarloResult,
} from "./types";

interface BacktestInput {
  strategy: StrategyRules;
  prices: SimplePrice[];
  indicators: IndicatorData;
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const { strategy, prices, indicators } = input;
  const trades: Trade[] = [];
  const equity: { time: number; value: number }[] = [];

  const startingCapital = 10000;
  let capital = startingCapital;
  let inPosition = false;
  let entryPrice = 0;
  let entryIndex = 0;
  let entryTime = 0;

  // Need at least 50 data points for indicators to be valid
  const startIdx = 50;

  for (let i = startIdx; i < prices.length; i++) {
    const price = prices[i].value;
    const time = prices[i].time;

    const rsi = indicators.rsi[i];
    const sma20 = indicators.sma20[i];
    const sma50 = indicators.sma50[i];
    const prevSma20 = indicators.sma20[i - 1];
    const prevSma50 = indicators.sma50[i - 1];
    const macd = indicators.macd.macd[i];
    const signal = indicators.macd.signal[i];
    const prevMacd = indicators.macd.macd[i - 1];
    const prevSignal = indicators.macd.signal[i - 1];
    const bbLower = indicators.bollingerBands.lower[i];

    if (!inPosition) {
      // ── Check entry conditions ──
      let shouldEnter = false;

      // RSI oversold
      if (rsi != null && rsi <= strategy.rsiOversold) {
        shouldEnter = true;
      }

      // SMA golden cross
      if (
        strategy.useSMACross &&
        sma20 != null &&
        sma50 != null &&
        prevSma20 != null &&
        prevSma50 != null &&
        prevSma20 <= prevSma50 &&
        sma20 > sma50
      ) {
        shouldEnter = true;
      }

      // MACD cross
      if (
        strategy.useMACDCross &&
        macd != null &&
        signal != null &&
        prevMacd != null &&
        prevSignal != null &&
        prevMacd <= prevSignal &&
        macd > signal
      ) {
        shouldEnter = true;
      }

      // Bollinger bounce
      if (
        strategy.useBollingerBounce &&
        bbLower != null &&
        price <= bbLower
      ) {
        shouldEnter = true;
      }

      if (shouldEnter) {
        inPosition = true;
        entryPrice = price;
        entryIndex = i;
        entryTime = time;
      }
    } else {
      // ── Check exit conditions ──
      const changePercent = ((price - entryPrice) / entryPrice) * 100;
      let shouldExit = false;
      let exitReason = "";

      // Stop loss
      if (changePercent <= -strategy.stopLossPercent) {
        shouldExit = true;
        exitReason = "Stop loss";
      }

      // Take profit
      if (changePercent >= strategy.takeProfitPercent) {
        shouldExit = true;
        exitReason = "Take profit";
      }

      // RSI overbought
      if (rsi != null && rsi >= strategy.rsiOverbought) {
        shouldExit = true;
        exitReason = exitReason || "RSI overbought";
      }

      // SMA death cross (if using SMA cross)
      if (
        strategy.useSMACross &&
        sma20 != null &&
        sma50 != null &&
        prevSma20 != null &&
        prevSma50 != null &&
        prevSma20 >= prevSma50 &&
        sma20 < sma50
      ) {
        shouldExit = true;
        exitReason = exitReason || "SMA death cross";
      }

      // MACD bearish cross
      if (
        strategy.useMACDCross &&
        macd != null &&
        signal != null &&
        prevMacd != null &&
        prevSignal != null &&
        prevMacd >= prevSignal &&
        macd < signal
      ) {
        shouldExit = true;
        exitReason = exitReason || "MACD bearish cross";
      }

      if (shouldExit) {
        const returnPercent = ((price - entryPrice) / entryPrice) * 100;
        trades.push({
          entryIndex,
          exitIndex: i,
          entryPrice,
          exitPrice: price,
          entryTime,
          exitTime: time,
          returnPercent,
          type: returnPercent >= 0 ? "win" : "loss",
          exitReason,
        });

        capital = capital * (1 + returnPercent / 100);
        inPosition = false;
      }
    }

    // Track equity
    if (inPosition) {
      const unrealizedReturn =
        ((price - entryPrice) / entryPrice) * 100;
      equity.push({
        time,
        value:
          capital * (1 + unrealizedReturn / 100),
      });
    } else {
      equity.push({ time, value: capital });
    }
  }

  // Close any open position at the end
  if (inPosition) {
    const lastPrice = prices[prices.length - 1].value;
    const returnPercent =
      ((lastPrice - entryPrice) / entryPrice) * 100;
    trades.push({
      entryIndex,
      exitIndex: prices.length - 1,
      entryPrice,
      exitPrice: lastPrice,
      entryTime,
      exitTime: prices[prices.length - 1].time,
      returnPercent,
      type: returnPercent >= 0 ? "win" : "loss",
      exitReason: "End of period",
    });
    capital = capital * (1 + returnPercent / 100);
  }

  // ── Calculate metrics ──
  const winningTrades = trades.filter((t) => t.type === "win");
  const losingTrades = trades.filter((t) => t.type === "loss");

  const totalReturn =
    ((capital - startingCapital) / startingCapital) * 100;
  const winRate =
    trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((s, t) => s + t.returnPercent, 0) /
        winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((s, t) => s + t.returnPercent, 0) /
        losingTrades.length
      : 0;

  const grossProfit = winningTrades.reduce(
    (s, t) => s + t.returnPercent,
    0
  );
  const grossLoss = Math.abs(
    losingTrades.reduce((s, t) => s + t.returnPercent, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const returns = trades.map((t) => t.returnPercent);
  const bestTrade = returns.length > 0 ? Math.max(...returns) : 0;
  const worstTrade = returns.length > 0 ? Math.min(...returns) : 0;

  // Max drawdown from equity curve
  let maxDrawdown = 0;
  let peak = equity.length > 0 ? equity[0].value : startingCapital;
  for (const point of equity) {
    if (point.value > peak) peak = point.value;
    const drawdown = ((peak - point.value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Sharpe ratio (simplified: annualized, assuming daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1].value > 0) {
      dailyReturns.push(
        (equity[i].value - equity[i - 1].value) / equity[i - 1].value
      );
    }
  }
  const meanReturn =
    dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;
  const stdDev =
    dailyReturns.length > 1
      ? Math.sqrt(
          dailyReturns.reduce(
            (s, r) => s + (r - meanReturn) ** 2,
            0
          ) /
            (dailyReturns.length - 1)
        )
      : 0;
  const sharpeRatio =
    stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(365) : 0;

  return {
    strategy,
    trades,
    equity,
    metrics: {
      totalReturn,
      winRate,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      maxDrawdown,
      sharpeRatio,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade,
      worstTrade,
    },
  };
}

// ── Monte Carlo Simulation ──

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runMonteCarlo(
  trades: Trade[],
  numSimulations = 500
): MonteCarloResult {
  const returns = trades.map((t) => t.returnPercent);
  const numTrades = returns.length;

  if (numTrades === 0) {
    return {
      simulations: numSimulations,
      percentiles: { p5: [], p25: [], p50: [], p75: [], p95: [] },
      finalReturns: [],
      medianReturn: 0,
      meanReturn: 0,
      p5Return: 0,
      p95Return: 0,
      probabilityOfProfit: 0,
      probabilityOfDoubling: 0,
      maxDrawdowns: [],
      medianMaxDrawdown: 0,
    };
  }

  // Each simulation: shuffle trade order, build equity curve
  const allEquities: number[][] = [];
  const finalReturns: number[] = [];
  const maxDrawdowns: number[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const shuffled = shuffle(returns);
    const equity: number[] = [10000];
    let capital = 10000;
    let peak = capital;
    let maxDD = 0;

    for (const ret of shuffled) {
      capital = capital * (1 + ret / 100);
      equity.push(capital);
      if (capital > peak) peak = capital;
      const dd = ((peak - capital) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }

    allEquities.push(equity);
    finalReturns.push(((capital - 10000) / 10000) * 100);
    maxDrawdowns.push(maxDD);
  }

  // Build percentile bands at each step
  const steps = numTrades + 1; // including starting point
  const p5: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p95: number[] = [];

  for (let step = 0; step < steps; step++) {
    const values = allEquities
      .map((eq) => eq[step])
      .sort((a, b) => a - b);
    p5.push(percentile(values, 5));
    p25.push(percentile(values, 25));
    p50.push(percentile(values, 50));
    p75.push(percentile(values, 75));
    p95.push(percentile(values, 95));
  }

  const sortedFinal = [...finalReturns].sort((a, b) => a - b);
  const sortedDD = [...maxDrawdowns].sort((a, b) => a - b);

  return {
    simulations: numSimulations,
    percentiles: { p5, p25, p50, p75, p95 },
    finalReturns,
    medianReturn: percentile(sortedFinal, 50),
    meanReturn:
      finalReturns.reduce((s, r) => s + r, 0) / finalReturns.length,
    p5Return: percentile(sortedFinal, 5),
    p95Return: percentile(sortedFinal, 95),
    probabilityOfProfit:
      (finalReturns.filter((r) => r > 0).length / numSimulations) * 100,
    probabilityOfDoubling:
      (finalReturns.filter((r) => r > 100).length / numSimulations) * 100,
    maxDrawdowns,
    medianMaxDrawdown: percentile(sortedDD, 50),
  };
}
