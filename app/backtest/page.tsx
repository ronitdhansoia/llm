"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BacktestDashboard } from "@/components/BacktestDashboard";
import { MonteCarloChart } from "@/components/MonteCarloChart";
import { PineScriptViewer } from "@/components/PineScriptViewer";
import { runBacktest, runMonteCarlo } from "@/lib/backtest";
import type {
  MarketDataResponse,
  StrategyRules,
  BacktestResult,
  MonteCarloResult,
} from "@/lib/types";

export default function BacktestPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen bg-black">
          <Navbar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-20 sm:pt-24">
            <div className="h-[400px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
          </div>
        </main>
      }
    >
      <BacktestContent />
    </Suspense>
  );
}

function BacktestContent() {
  const searchParams = useSearchParams();
  const coin = searchParams.get("coin") || "bitcoin";
  const days = parseInt(searchParams.get("days") || "90", 10);
  const strategyPrompt = searchParams.get("strategy") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const hasRun = useRef(false);

  const runFullBacktest = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch market data
      const marketRes = await fetch(
        `/api/market-data?coin=${coin}&days=${days}`
      );
      if (!marketRes.ok) {
        const err = await marketRes.json();
        throw new Error(err.error || "Failed to fetch market data");
      }
      const data: MarketDataResponse = await marketRes.json();
      setMarketData(data);

      // 2. Get latest indicator values for strategy generation
      const ind = data.indicators;
      const last = (arr: number[]) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] != null) return arr[i];
        }
        return 0;
      };

      const indicators = {
        rsiLatest: last(ind.rsi),
        sma20Latest: last(ind.sma20),
        sma50Latest: last(ind.sma50),
        ema12Latest: last(ind.ema12),
        ema26Latest: last(ind.ema26),
        macdLatest: last(ind.macd.macd),
        macdSignalLatest: last(ind.macd.signal),
        macdHistogramLatest: last(ind.macd.histogram),
        bollingerUpper: last(ind.bollingerBands.upper),
        bollingerMiddle: last(ind.bollingerBands.middle),
        bollingerLower: last(ind.bollingerBands.lower),
      };

      // 3. Generate strategy via AI
      const stratRes = await fetch("/api/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin,
          timeframe: `${days} days`,
          currentPrice: data.metadata.lastPrice,
          strategy: strategyPrompt || "A balanced swing trading strategy using RSI and MACD",
          indicators,
        }),
      });

      if (!stratRes.ok) {
        const err = await stratRes.json();
        throw new Error(err.error || "Failed to generate strategy");
      }

      const strategy: StrategyRules = await stratRes.json();

      // 4. Run backtest
      const result = runBacktest({
        strategy,
        prices: data.prices,
        indicators: data.indicators,
      });

      setBacktestResult(result);

      // 5. Run Monte Carlo simulation
      if (result.trades.length >= 2) {
        const mc = runMonteCarlo(result.trades, 500);
        setMonteCarloResult(mc);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [coin, days, strategyPrompt]);

  useEffect(() => {
    runFullBacktest();
  }, [runFullBacktest]);

  return (
    <main className="relative min-h-screen pb-20 bg-black">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-20 sm:pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <Link
            href={`/analyze?coin=${coin}`}
            className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors mb-4"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Analyzer
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Backtest
          </h1>
          <p className="text-white/30 mt-2 text-sm font-light">
            {strategyPrompt ? (
              <>
                Strategy: &quot;{strategyPrompt}&quot; -{" "}
                {coin.charAt(0).toUpperCase() + coin.slice(1)}, {days} days
              </>
            ) : (
              <>
                {coin.charAt(0).toUpperCase() + coin.slice(1)} - {days} day
                backtest
              </>
            )}
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <AlertCircle className="w-4 h-4 text-white/40 flex-shrink-0" />
              <p className="text-sm text-white/50">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-white/[0.02] border border-white/[0.04] rounded-xl shimmer"
                />
              ))}
            </div>
            <div className="h-[200px] sm:h-[280px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
            <div className="h-[200px] sm:h-[280px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <p className="text-xs text-white/20 font-light">
                Generating strategy and running backtest...
              </p>
            </motion.div>
          </div>
        )}

        {/* Results */}
        {backtestResult && marketData && !loading && (
          <div className="space-y-10">
            {/* PineScript Export */}
            <PineScriptViewer strategy={backtestResult.strategy} />

            <BacktestDashboard
              result={backtestResult}
              prices={marketData.prices}
              coin={coin}
            />

            {/* Monte Carlo */}
            {monteCarloResult && (
              <MonteCarloChart result={monteCarloResult} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
