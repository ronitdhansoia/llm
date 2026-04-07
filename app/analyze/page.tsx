"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  X,
  FlaskConical,
  Loader2,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CoinSelector } from "@/components/CoinSelector";
import { TimeframeToggle } from "@/components/TimeframeToggle";
import { PriceChart, RSIChart, MACDChart } from "@/components/PriceChart";
import { AnalysisCard } from "@/components/AnalysisCard";
import { AnalysisSkeleton } from "@/components/AnalyzeButton";
import { BacktestDashboard } from "@/components/BacktestDashboard";
import { MonteCarloChart } from "@/components/MonteCarloChart";
import { PineScriptViewer } from "@/components/PineScriptViewer";
import { GlassCard } from "@/components/ui/glass-card";
import { runBacktest, runMonteCarlo } from "@/lib/backtest";
import type {
  MarketDataResponse,
  AnalysisResponse,
  BacktestResult,
  MonteCarloResult,
  StrategyRules,
} from "@/lib/types";

const TIMEFRAME_LABELS: Record<number, string> = {
  7: "7 days",
  30: "30 days",
  90: "90 days",
  365: "1 year",
};

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen bg-black">
          <Navbar />
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-24">
            <div className="h-[400px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
          </div>
        </main>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const initialCoin = searchParams.get("coin") || "bitcoin";
  const initialStrategy = searchParams.get("strategy") || "";
  const initialFetchDone = useRef(false);

  const [coin, setCoin] = useState(initialCoin);
  const [days, setDays] = useState(30);
  const [strategy, setStrategy] = useState(initialStrategy);
  const [strategyInput, setStrategyInput] = useState(initialStrategy);
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [backtesting, setBacktesting] = useState(false);

  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);

  const [promptFocused, setPromptFocused] = useState(false);
  const promptRef = useRef<HTMLInputElement>(null);
  const backtestRef = useRef<HTMLDivElement>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchMarketData = useCallback(
    async (selectedCoin: string, selectedDays: number) => {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setBacktestResult(null);
      setMonteCarloResult(null);

      try {
        const res = await fetch(
          `/api/market-data?coin=${selectedCoin}&days=${selectedDays}`
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch market data");
        }
        const data: MarketDataResponse = await res.json();
        setMarketData(data);
        return data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch market data"
        );
        setMarketData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getIndicatorSummary = useCallback((data: MarketDataResponse) => {
    const ind = data.indicators;
    const last = (arr: number[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null) return arr[i];
      }
      return 0;
    };
    return {
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
  }, []);

  const runAnalysis = useCallback(
    async (data: MarketDataResponse, strat: string) => {
      setAnalyzing(true);
      setError(null);

      try {
        const prices = data.prices;
        const recentPrices = prices.slice(-5);
        const recentAction = recentPrices
          .map(
            (p) =>
              `$${p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          )
          .join(" → ");

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coin,
            timeframe: TIMEFRAME_LABELS[days] || `${days} days`,
            currentPrice: data.metadata.lastPrice,
            indicators: getIndicatorSummary(data),
            recentPriceAction: `Last 5 data points: ${recentAction}`,
            strategy: strat || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate analysis");
        }

        const result: AnalysisResponse = await res.json();
        setAnalysis(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate analysis"
        );
      } finally {
        setAnalyzing(false);
      }
    },
    [coin, days, getIndicatorSummary]
  );

  const handleBacktest = useCallback(async () => {
    if (!marketData) return;

    setBacktesting(true);
    setBacktestResult(null);
    setMonteCarloResult(null);
    setError(null);

    try {
      const stratRes = await fetch("/api/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin,
          timeframe: TIMEFRAME_LABELS[days] || `${days} days`,
          currentPrice: marketData.metadata.lastPrice,
          strategy:
            strategy ||
            strategyInput ||
            "A balanced swing trading strategy using RSI and MACD",
          indicators: getIndicatorSummary(marketData),
        }),
      });

      if (!stratRes.ok) {
        const err = await stratRes.json();
        throw new Error(err.error || "Failed to generate strategy");
      }

      const strategyRules: StrategyRules = await stratRes.json();

      const result = runBacktest({
        strategy: strategyRules,
        prices: marketData.prices,
        indicators: marketData.indicators,
      });
      setBacktestResult(result);

      if (result.trades.length >= 2) {
        const mc = runMonteCarlo(result.trades, 500);
        setMonteCarloResult(mc);
      }

      setTimeout(() => {
        backtestRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run backtest"
      );
    } finally {
      setBacktesting(false);
    }
  }, [marketData, coin, days, strategy, strategyInput, getIndicatorSummary]);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    (async () => {
      const data = await fetchMarketData(initialCoin, 30);
      if (data && initialStrategy) {
        await runAnalysis(data, initialStrategy);
      }
    })();
  }, [initialCoin, initialStrategy, fetchMarketData, runAnalysis]);

  // Auto-refresh for short timeframes (every 30s for 1D/3D)
  useEffect(() => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }

    if (days <= 3 && !loading) {
      refreshInterval.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/market-data?coin=${coin}&days=${days}`);
          if (res.ok) {
            const data: MarketDataResponse = await res.json();
            setMarketData(data);
          }
        } catch {
          // Silent fail on auto-refresh
        }
      }, 60_000);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [coin, days, loading]);

  const handleCoinChange = (newCoin: string) => {
    setCoin(newCoin);
    fetchMarketData(newCoin, days);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    fetchMarketData(coin, newDays);
  };

  const handleSubmit = () => {
    if (!marketData || (!strategyInput.trim() && !analyzing)) return;
    setStrategy(strategyInput);
    setBacktestResult(null);
    setMonteCarloResult(null);
    runAnalysis(marketData, strategyInput);
  };

  return (
    <main className="relative min-h-screen pb-24 sm:pb-28 bg-black">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-20 sm:pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                Dashboard
              </h1>
              <p className="text-white/30 mt-1.5 sm:mt-2 text-xs sm:text-sm font-light">
                Select a cryptocurrency and timeframe to visualize charts and
                get AI insights.
              </p>
            </div>

            {/* Active strategy badge - top right */}
            <AnimatePresence>
              {strategy && analysis && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]"
                >
                  <Sparkles className="w-3 h-3 text-white/20" />
                  <span className="text-[11px] text-white/35 font-light max-w-[200px] truncate">
                    {strategy}
                  </span>
                  <button
                    onClick={() => {
                      setStrategy("");
                      setStrategyInput("");
                    }}
                    className="text-white/15 hover:text-white/30 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8"
        >
          <CoinSelector selected={coin} onSelect={handleCoinChange} />
          <TimeframeToggle selected={days} onSelect={handleDaysChange} />
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

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-[280px] sm:h-[400px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="h-[140px] sm:h-[180px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
              <div className="h-[140px] sm:h-[180px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
            </div>
          </div>
        )}

        {/* Charts */}
        {marketData && !loading && (
          <div className="space-y-4">
            {/* Price info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-baseline gap-3 mb-2"
            >
              <span className="text-2xl font-bold text-white tracking-tight">
                $
                {marketData.metadata.lastPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`text-xs font-medium ${
                  marketData.metadata.change24h >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {marketData.metadata.change24h >= 0 ? "+" : ""}
                {marketData.metadata.change24h.toFixed(2)}%
              </span>
              <span className="text-[10px] text-white/20 uppercase tracking-wider">
                24h
              </span>
            </motion.div>

            {/* Chart controls */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button
                onClick={() => setShowSMA(!showSMA)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all duration-300 ${
                  showSMA
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
              >
                SMA (20/50)
              </button>
              <button
                onClick={() => setShowEMA(!showEMA)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all duration-300 ${
                  showEMA
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
              >
                EMA (12/26)
              </button>
              <button
                onClick={() => setShowBollinger(!showBollinger)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all duration-300 ${
                  showBollinger
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
              >
                Bollinger Bands
              </button>

              {/* Live indicator for short timeframes */}
              {days <= 3 && !loading && (
                <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 animate-pulse" />
                  Live · 60s
                </span>
              )}
            </div>

            <PriceChart
              data={marketData}
              showSMA={showSMA}
              showEMA={showEMA}
              showBollinger={showBollinger}
              trades={backtestResult?.trades}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <RSIChart data={marketData} />
              <MACDChart data={marketData} />
            </div>

            {/* AI Analysis */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    AI Analysis
                  </h2>
                  <p className="text-xs text-white/25 mt-1 font-light">
                    {strategy
                      ? `Strategy: "${strategy}"`
                      : "AI interpretation of all indicators"}
                  </p>
                </div>
                {/* Analyze button only when no analysis yet */}
                {!analysis && !analyzing && (
                  <button
                    onClick={() => {
                      promptRef.current?.focus();
                    }}
                    className="px-4 py-2 text-xs font-medium text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-full hover:bg-white/[0.06] hover:text-white/80 transition-all"
                  >
                    Type a prompt below
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {analyzing && (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <AnalysisSkeleton />
                  </motion.div>
                )}

                {analysis && !analyzing && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <AnalysisCard analysis={analysis} />

                    {/* Backtest CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex justify-center pt-2"
                    >
                      <button
                        onClick={handleBacktest}
                        disabled={backtesting}
                        className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-black bg-white rounded-full transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.12)] hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {backtesting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating &amp; backtesting...
                          </>
                        ) : (
                          <>
                            <FlaskConical className="w-4 h-4" />
                            Backtest this Strategy
                          </>
                        )}
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {!analysis && !analyzing && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <GlassCard className="text-center py-14">
                      <p className="text-white/20 text-sm font-light">
                        Type a strategy or question in the prompt bar below and
                        press Enter.
                      </p>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Backtest Results (inline) ── */}
            <div ref={backtestRef}>
              <AnimatePresence>
                {backtesting && !backtestResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-10 space-y-4"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-20 bg-white/[0.02] border border-white/[0.04] rounded-xl shimmer"
                        />
                      ))}
                    </div>
                    <div className="h-[200px] sm:h-[280px] bg-white/[0.02] border border-white/[0.04] rounded-2xl shimmer" />
                    <p className="text-center text-xs text-white/20 font-light py-4">
                      Generating strategy and running backtest...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {backtestResult && marketData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-10 space-y-10"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[10px] text-white/15 uppercase tracking-widest">
                      Backtest Results
                    </span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  <PineScriptViewer strategy={backtestResult.strategy} />

                  <BacktestDashboard
                    result={backtestResult}
                    prices={marketData.prices}
                    coin={coin}
                  />

                  {monteCarloResult && (
                    <MonteCarloChart result={monteCarloResult} />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed bottom prompt bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="h-6 sm:h-8 bg-gradient-to-t from-black to-transparent pointer-events-none" />

        <div className="bg-black/80 backdrop-blur-2xl border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div
              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                promptFocused
                  ? "bg-white/[0.05] border-white/[0.12] shadow-[0_0_30px_rgba(255,255,255,0.03)]"
                  : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              <input
                ref={promptRef}
                type="text"
                value={strategyInput}
                onChange={(e) => setStrategyInput(e.target.value)}
                onFocus={() => setPromptFocused(true)}
                onBlur={() => setPromptFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Describe a strategy..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-white/70 placeholder:text-white/20 outline-none font-light min-w-0"
                disabled={analyzing || !marketData}
              />

              {strategyInput && (
                <button
                  onClick={() => setStrategyInput("")}
                  className="text-white/15 hover:text-white/30 transition-colors flex-shrink-0 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={analyzing || !marketData || !strategyInput.trim()}
                className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl bg-white text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100 flex-shrink-0"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-center text-[9px] sm:text-[10px] text-white/10 mt-1 sm:mt-1.5 hidden sm:block">
              Press Enter to analyze · Results are educational, not financial
              advice
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
