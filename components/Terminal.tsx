"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "system" | "heading";
  text: string;
}

const HELP_TEXT = `Available commands:

  price <coin>                    Get current price & 24h change
  analyze <coin>                  AI analysis of technical indicators
  backtest <coin> <strategy>      Generate & backtest a strategy
  indicators <coin>               Show latest indicator values
  coins                           List supported coins
  clear                           Clear terminal
  help                            Show this message

Timeframes: add any timeframe to your command (default: 30D)

  $ analyze bitcoin 7d
  $ backtest ethereum 1y aggressive momentum
  $ indicators solana 90d

Or just ask anything in plain English:

  $ is bitcoin overbought right now?
  $ backtest a scalping strategy on eth for 30 days
  $ what does the MACD say about ethereum this week?
  $ explain RSI divergence`;

const COINS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  solana: "SOL",
  ripple: "XRP",
  cardano: "ADA",
  dogecoin: "DOGE",
  polkadot: "DOT",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  litecoin: "LTC",
  uniswap: "UNI",
  near: "NEAR",
  stellar: "XLM",
};

const WELCOME = [
  "cryptolens v1.0.0",
  "",
  'Type "help" for commands, or just ask anything.',
  "",
];

export function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  // Context memory - persists across commands
  const ctx = useRef<{
    coin: string | null;
    strategy: string | null;
    days: number;
    lastAnalysis: string | null;
    lastBacktestSummary: string | null;
    lastAiResponse: string | null;
    conversationHistory: { role: "user" | "assistant"; content: string }[];
  }>({
    coin: null,
    strategy: null,
    days: 30,
    lastAnalysis: null,
    lastBacktestSummary: null,
    lastAiResponse: null,
    conversationHistory: [],
  });

  const nextId = () => ++idRef.current;

  const addLine = useCallback(
    (type: TerminalLine["type"], text: string) => {
      setLines((prev) => [...prev, { id: nextId(), type, text }]);
    },
    []
  );

  const addLines = useCallback(
    (type: TerminalLine["type"], texts: string[]) => {
      setLines((prev) => [
        ...prev,
        ...texts.map((text) => ({ id: nextId(), type, text })),
      ]);
    },
    []
  );

  // Welcome message
  useEffect(() => {
    addLines("system", WELCOME);
  }, [addLines]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim().toLowerCase();
      const parts = trimmed.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      if (!command) return;

      addLine("input", `$ ${cmd.trim()}`);
      setHistory((prev) => [cmd.trim(), ...prev]);
      setHistoryIdx(-1);
      setProcessing(true);

      try {
        switch (command) {
          case "help": {
            addLines("output", HELP_TEXT.split("\n"));
            break;
          }

          case "clear": {
            setLines([]);
            addLines("system", WELCOME);
            ctx.current = {
              coin: null, strategy: null, days: 30,
              lastAnalysis: null, lastBacktestSummary: null,
              lastAiResponse: null, conversationHistory: [],
            };
            break;
          }

          case "coins": {
            addLine("heading", "Supported coins:");
            addLine("output", "");
            for (const [id, symbol] of Object.entries(COINS)) {
              addLine("output", `  ${symbol.padEnd(8)} ${id}`);
            }
            addLine("output", "");
            break;
          }

          case "price":
          case "fetch":
          case "get":
          case "check":
          case "lookup":
          case "show": {
            const coin = args[0];
            const resolved = coin ? resolveCoin(coin) : ctx.current.coin;
            if (!resolved) {
              addLine("error", 'Usage: price <coin>  (e.g. "price bitcoin")');
              break;
            }
            ctx.current.coin = resolved;

            addLine("system", `Fetching ${resolved}...`);

            const res = await fetch(`/api/market-data?coin=${resolved}&days=1`);
            if (!res.ok) throw new Error("Failed to fetch price data");
            const data = await res.json();

            const price = data.metadata.lastPrice;
            const change = data.metadata.change24h;
            const arrow = change >= 0 ? "▲" : "▼";
            const sign = change >= 0 ? "+" : "";

            addLine("output", "");
            addLine("heading", `  ${resolved.toUpperCase()}`);
            addLine("output", `  Price:    $${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
            addLine("output", `  24h:      ${arrow} ${sign}${change.toFixed(2)}%`);
            addLine("output", `  Data pts: ${data.prices.length}`);
            addLine("output", "");
            break;
          }

          case "indicators":
          case "ind":
          case "ta": {
            const coin = args[0];
            const resolved = coin ? resolveCoin(coin) : ctx.current.coin;
            if (!resolved) {
              addLine("error", 'Usage: indicators <coin>');
              break;
            }
            ctx.current.coin = resolved;

            const indDays = detectTimeframe(trimmed) || ctx.current.days;
            ctx.current.days = indDays;
            addLine("system", `Computing indicators for ${resolved} (${indDays}D)...`);

            const res = await fetch(`/api/market-data?coin=${resolved}&days=${indDays}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const data = await res.json();

            const ind = data.indicators;
            const last = (arr: number[]) => {
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i] != null) return arr[i];
              }
              return 0;
            };

            addLine("output", "");
            addLine("heading", `  ${resolved.toUpperCase()} - Technical Indicators (${indDays}D)`);
            addLine("output", "");
            addLine("output", `  RSI (14):        ${last(ind.rsi).toFixed(2)}`);
            addLine("output", `  SMA 20:          $${last(ind.sma20).toFixed(2)}`);
            addLine("output", `  SMA 50:          $${last(ind.sma50).toFixed(2)}`);
            addLine("output", `  EMA 12:          $${last(ind.ema12).toFixed(2)}`);
            addLine("output", `  EMA 26:          $${last(ind.ema26).toFixed(2)}`);
            addLine("output", `  MACD:            ${last(ind.macd.macd).toFixed(2)}`);
            addLine("output", `  MACD Signal:     ${last(ind.macd.signal).toFixed(2)}`);
            addLine("output", `  BB Upper:        $${last(ind.bollingerBands.upper).toFixed(2)}`);
            addLine("output", `  BB Lower:        $${last(ind.bollingerBands.lower).toFixed(2)}`);
            addLine("output", "");
            break;
          }

          case "analyze":
          case "analyse":
          case "analysis": {
            const coin = args[0];
            const resolved = coin ? resolveCoin(coin) : ctx.current.coin;
            if (!resolved) {
              addLine("error", 'Usage: analyze <coin>');
              break;
            }
            ctx.current.coin = resolved;

            const analyzeDays = detectTimeframe(trimmed) || ctx.current.days;
            ctx.current.days = analyzeDays;
            addLine("system", `Fetching ${analyzeDays}D market data for ${resolved}...`);

            const marketRes = await fetch(`/api/market-data?coin=${resolved}&days=${analyzeDays}`);
            if (!marketRes.ok) throw new Error("Failed to fetch data");
            const data = await marketRes.json();

            const ind = data.indicators;
            const last = (arr: number[]) => {
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i] != null) return arr[i];
              }
              return 0;
            };

            const prices = data.prices;
            const recentPrices = prices.slice(-5);
            const recentAction = recentPrices
              .map((p: { value: number }) =>
                `$${p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              )
              .join(" → ");

            addLine("system", "Running AI analysis...");

            const analyzeRes = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                coin: resolved,
                timeframe: `${analyzeDays} days`,
                currentPrice: data.metadata.lastPrice,
                indicators: {
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
                },
                recentPriceAction: `Last 5 data points: ${recentAction}`,
              }),
            });

            if (!analyzeRes.ok) throw new Error("Analysis failed");
            const analysis = await analyzeRes.json();

            addLine("output", "");
            addLine("heading", `  ${resolved.toUpperCase()} - AI Analysis`);
            addLine("output", "");
            addLine("output", `  Trend:        ${analysis.trend} (${analysis.confidence} confidence)`);
            addLine("output", `  ${analysis.trendExplanation}`);
            addLine("output", "");
            addLine("output", `  Momentum:     ${analysis.momentum}`);
            addLine("output", "");
            addLine("output", `  Support:      $${analysis.keyLevels.support.toLocaleString()}`);
            addLine("output", `  Resistance:   $${analysis.keyLevels.resistance.toLocaleString()}`);
            addLine("output", `  ${analysis.keyLevels.explanation}`);
            addLine("output", "");
            addLine("output", `  Summary:      ${analysis.signalSummary}`);
            addLine("output", "");
            addLine("system", `  ${analysis.disclaimer}`);
            addLine("output", "");

            // Save to context
            ctx.current.lastAnalysis = `${analysis.trend} (${analysis.confidence}) - ${analysis.trendExplanation} ${analysis.signalSummary}`;
            ctx.current.conversationHistory.push(
              { role: "user", content: `analyze ${resolved}` },
              { role: "assistant", content: `Analysis for ${resolved}: ${analysis.trend} trend, ${analysis.confidence} confidence. ${analysis.trendExplanation} ${analysis.momentum} Support: $${analysis.keyLevels.support}, Resistance: $${analysis.keyLevels.resistance}. ${analysis.signalSummary}` }
            );
            break;
          }

          case "backtest":
          case "bt":
          case "test":
          case "run":
          case "simulate": {
            // Try to resolve coin from args, then context
            const coin = args[0];
            let resolved = coin ? resolveCoin(coin) : null;
            let strategyArgs = resolved ? args.slice(1) : args;

            // "backtest it" / "backtest that" / just "backtest" - use context
            if (!resolved) {
              // Maybe first arg is part of strategy text, not a coin
              const detectedInArgs = coin ? resolveCoin(coin) : null;
              if (detectedInArgs) {
                resolved = detectedInArgs;
                strategyArgs = args.slice(1);
              } else {
                resolved = ctx.current.coin;
                strategyArgs = args; // all args are strategy text
              }
            }

            if (!resolved) {
              addLine("error", 'No coin specified. Usage: backtest <coin> <strategy>');
              addLine("error", 'Or first use another command like "price bitcoin", then "backtest it"');
              break;
            }
            ctx.current.coin = resolved;

            // Build strategy text: use args, fall back to context, then default
            const rawStrategy = strategyArgs
              .filter((a) => !/^(it|that|this|the|same|again|for|me|my|please)$/i.test(a))
              .join(" ")
              .trim();
            const hasRealStrategy = rawStrategy.replace(/\W/g, "").length >= 3;
            const strategyText = (hasRealStrategy ? rawStrategy : null) || ctx.current.strategy || "balanced swing trading using RSI and MACD";
            if (hasRealStrategy) ctx.current.strategy = strategyText;

            const btDays = detectTimeframe(trimmed) || ctx.current.days;
            ctx.current.days = btDays;

            addLine("system", `Fetching ${btDays}D data for ${resolved}...`);

            const marketRes = await fetch(`/api/market-data?coin=${resolved}&days=${btDays}`);
            if (!marketRes.ok) throw new Error("Failed to fetch data");
            const data = await marketRes.json();

            const ind = data.indicators;
            const last = (arr: number[]) => {
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i] != null) return arr[i];
              }
              return 0;
            };

            addLine("system", `Generating strategy: "${strategyText}"...`);

            const stratRes = await fetch("/api/generate-strategy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                coin: resolved,
                timeframe: `${btDays} days`,
                currentPrice: data.metadata.lastPrice,
                strategy: strategyText,
                indicators: {
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
                },
              }),
            });

            if (!stratRes.ok) throw new Error("Strategy generation failed");
            const strategy = await stratRes.json();

            addLine("system", "Running backtest...");

            // Import and run backtest client-side
            const { runBacktest } = await import("@/lib/backtest");
            const result = runBacktest({
              strategy,
              prices: data.prices,
              indicators: data.indicators,
            });

            const m = result.metrics;

            addLine("output", "");
            addLine("heading", `  ${resolved.toUpperCase()} - Backtest Results`);
            addLine("output", `  Strategy:     ${strategy.name}`);
            addLine("output", "");
            addLine("output", `  Total Return: ${m.totalReturn >= 0 ? "+" : ""}${m.totalReturn.toFixed(1)}%`);
            addLine("output", `  Win Rate:     ${m.winRate.toFixed(0)}%`);
            addLine("output", `  Total Trades: ${m.totalTrades}`);
            addLine("output", `  Max Drawdown: -${m.maxDrawdown.toFixed(1)}%`);
            addLine("output", `  Sharpe Ratio: ${m.sharpeRatio.toFixed(2)}`);
            addLine("output", `  Profit Factor:${m.profitFactor === Infinity ? " ∞" : " " + m.profitFactor.toFixed(2)}`);
            addLine("output", `  Best Trade:   +${m.bestTrade.toFixed(1)}%`);
            addLine("output", `  Worst Trade:  ${m.worstTrade.toFixed(1)}%`);
            addLine("output", "");

            if (result.trades.length > 0) {
              addLine("heading", "  Trade Log:");
              addLine("output", `  ${"#".padEnd(4)} ${"Entry".padEnd(12)} ${"Exit".padEnd(12)} ${"Return".padEnd(10)} Reason`);
              addLine("output", `  ${"─".repeat(60)}`);
              for (let i = 0; i < Math.min(result.trades.length, 10); i++) {
                const t = result.trades[i];
                const entryDate = new Date(t.entryTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const exitDate = new Date(t.exitTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const ret = `${t.returnPercent >= 0 ? "+" : ""}${t.returnPercent.toFixed(1)}%`;
                addLine("output", `  ${String(i + 1).padEnd(4)} ${entryDate.padEnd(12)} ${exitDate.padEnd(12)} ${ret.padEnd(10)} ${t.exitReason}`);
              }
              if (result.trades.length > 10) {
                addLine("system", `  ... and ${result.trades.length - 10} more trades`);
              }
              addLine("output", "");
            }

            addLine("system", "  Educational only - not financial advice.");
            addLine("output", "");

            // Save backtest to context
            ctx.current.lastBacktestSummary = `${strategy.name}: ${m.totalReturn >= 0 ? "+" : ""}${m.totalReturn.toFixed(1)}% return, ${m.winRate.toFixed(0)}% win rate, ${m.totalTrades} trades, -${m.maxDrawdown.toFixed(1)}% max drawdown`;
            ctx.current.conversationHistory.push(
              { role: "user", content: `backtest ${resolved} ${strategyText}` },
              { role: "assistant", content: `Backtest of "${strategy.name}" on ${resolved}: ${m.totalReturn >= 0 ? "+" : ""}${m.totalReturn.toFixed(1)}% total return, ${m.winRate.toFixed(0)}% win rate, ${m.totalTrades} trades, Sharpe ${m.sharpeRatio.toFixed(2)}, max drawdown -${m.maxDrawdown.toFixed(1)}%` }
            );
            break;
          }

          default: {
            if (command.includes("cryptolens") || command.includes("./") || command.includes(".sh")) {
              addLine("system", "You're already inside the CryptoLens terminal.");
              addLine("system", 'Type a command directly - e.g. "price bitcoin" or "analyze ethereum"');
              addLine("system", 'Type "help" to see all available commands.');
              break;
            }

            // ── Detect intent from natural language ──
            const intentCoin = detectCoin(trimmed) || ctx.current.coin;
            const backtestIntent = /backtest|back test|back-test|test.*strategy|run.*strategy|simulate|test it|test that|backtest it|backtest that|run it|run that/i.test(trimmed);
            const analyzeIntent = /analy[sz]e|analysis|what.*think|outlook|forecast|predict/i.test(trimmed) && !backtestIntent;
            const priceIntent = /price|how much|what.*worth|cost|value|trading at/i.test(trimmed) && !analyzeIntent && !backtestIntent;

            // Route to the actual command if intent is detected
            if (backtestIntent && intentCoin) {
              ctx.current.coin = intentCoin;
              // Extract strategy description - remove the coin name and backtest keywords
              const rawNlStrategy = trimmed
                .replace(/can you |please |could you |run |do |perform /gi, "")
                .replace(/backtest|back test|back-test|simulate|test/gi, "")
                .replace(new RegExp(intentCoin, "gi"), "")
                .replace(/\b(it|that|this|the|same|again|on|for|a|an|my|me|strategy)\b/gi, "")
                .replace(/\s+/g, " ")
                .trim();
              // Only use extracted text if it's actually meaningful (3+ meaningful chars)
              // Otherwise fall back to context strategy
              const hasRealContent = rawNlStrategy.replace(/\W/g, "").length >= 3;
              const strategyText = (hasRealContent ? rawNlStrategy : null) || ctx.current.strategy || "balanced swing trading using RSI and MACD";
              // Only overwrite context if we have new real content
              if (hasRealContent) ctx.current.strategy = strategyText;

              // Reuse the backtest command logic
              const nlBtDays = detectTimeframe(trimmed) || 90;
              addLine("system", `Fetching ${nlBtDays}D data for ${intentCoin}...`);

              const mktRes = await fetch(`/api/market-data?coin=${intentCoin}&days=${nlBtDays}`);
              if (!mktRes.ok) throw new Error("Failed to fetch data");
              const mktData = await mktRes.json();

              const ind2 = mktData.indicators;
              const last2 = (arr: number[]) => {
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (arr[i] != null) return arr[i];
                }
                return 0;
              };

              addLine("system", `Generating strategy: "${strategyText}"...`);

              const sRes = await fetch("/api/generate-strategy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  coin: intentCoin,
                  timeframe: `${nlBtDays} days`,
                  currentPrice: mktData.metadata.lastPrice,
                  strategy: strategyText,
                  indicators: {
                    rsiLatest: last2(ind2.rsi),
                    sma20Latest: last2(ind2.sma20),
                    sma50Latest: last2(ind2.sma50),
                    ema12Latest: last2(ind2.ema12),
                    ema26Latest: last2(ind2.ema26),
                    macdLatest: last2(ind2.macd.macd),
                    macdSignalLatest: last2(ind2.macd.signal),
                    macdHistogramLatest: last2(ind2.macd.histogram),
                    bollingerUpper: last2(ind2.bollingerBands.upper),
                    bollingerMiddle: last2(ind2.bollingerBands.middle),
                    bollingerLower: last2(ind2.bollingerBands.lower),
                  },
                }),
              });

              if (!sRes.ok) throw new Error("Strategy generation failed");
              const strat = await sRes.json();

              addLine("system", "Running backtest...");

              const { runBacktest: runBt } = await import("@/lib/backtest");
              const btResult = runBt({
                strategy: strat,
                prices: mktData.prices,
                indicators: mktData.indicators,
              });

              const bm = btResult.metrics;

              addLine("output", "");
              addLine("heading", `  ${intentCoin.toUpperCase()} - Backtest Results`);
              addLine("output", `  Strategy:     ${strat.name}`);
              addLine("output", "");
              addLine("output", `  Total Return: ${bm.totalReturn >= 0 ? "+" : ""}${bm.totalReturn.toFixed(1)}%`);
              addLine("output", `  Win Rate:     ${bm.winRate.toFixed(0)}%`);
              addLine("output", `  Total Trades: ${bm.totalTrades}`);
              addLine("output", `  Max Drawdown: -${bm.maxDrawdown.toFixed(1)}%`);
              addLine("output", `  Sharpe Ratio: ${bm.sharpeRatio.toFixed(2)}`);
              addLine("output", `  Profit Factor:${bm.profitFactor === Infinity ? " ∞" : " " + bm.profitFactor.toFixed(2)}`);
              addLine("output", `  Best Trade:   +${bm.bestTrade.toFixed(1)}%`);
              addLine("output", `  Worst Trade:  ${bm.worstTrade.toFixed(1)}%`);
              addLine("output", "");

              if (btResult.trades.length > 0) {
                addLine("heading", "  Trade Log:");
                addLine("output", `  ${"#".padEnd(4)} ${"Entry".padEnd(12)} ${"Exit".padEnd(12)} ${"Return".padEnd(10)} Reason`);
                addLine("output", `  ${"─".repeat(60)}`);
                for (let i = 0; i < Math.min(btResult.trades.length, 10); i++) {
                  const t = btResult.trades[i];
                  const eD = new Date(t.entryTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const xD = new Date(t.exitTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const r = `${t.returnPercent >= 0 ? "+" : ""}${t.returnPercent.toFixed(1)}%`;
                  addLine("output", `  ${String(i + 1).padEnd(4)} ${eD.padEnd(12)} ${xD.padEnd(12)} ${r.padEnd(10)} ${t.exitReason}`);
                }
                if (btResult.trades.length > 10) {
                  addLine("system", `  ... and ${btResult.trades.length - 10} more trades`);
                }
                addLine("output", "");
              }

              addLine("system", "  Educational only - not financial advice.");
              addLine("output", "");

              // Save to context
              ctx.current.lastBacktestSummary = `${strat.name}: ${bm.totalReturn >= 0 ? "+" : ""}${bm.totalReturn.toFixed(1)}% return, ${bm.winRate.toFixed(0)}% win rate, ${bm.totalTrades} trades`;
              ctx.current.conversationHistory.push(
                { role: "user", content: cmd.trim() },
                { role: "assistant", content: `Backtested "${strat.name}" on ${intentCoin}: ${bm.totalReturn >= 0 ? "+" : ""}${bm.totalReturn.toFixed(1)}% return, ${bm.winRate.toFixed(0)}% win rate, ${bm.totalTrades} trades` }
              );
              break;
            }

            if (analyzeIntent && intentCoin) {
              ctx.current.coin = intentCoin;
              const nlAnalyzeDays = detectTimeframe(trimmed) || ctx.current.days;
              addLine("system", `Running ${nlAnalyzeDays}D analysis on ${intentCoin}...`);

              const amRes = await fetch(`/api/market-data?coin=${intentCoin}&days=${nlAnalyzeDays}`);
              if (!amRes.ok) throw new Error("Failed to fetch data");
              const amData = await amRes.json();
              const aInd = amData.indicators;
              const aLast = (arr: number[]) => {
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (arr[i] != null) return arr[i];
                }
                return 0;
              };

              const aPrices = amData.prices;
              const aRecent = aPrices.slice(-5)
                .map((p: { value: number }) => `$${p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
                .join(" → ");

              const aRes = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  coin: intentCoin,
                  timeframe: `${nlAnalyzeDays} days`,
                  currentPrice: amData.metadata.lastPrice,
                  indicators: {
                    rsiLatest: aLast(aInd.rsi),
                    sma20Latest: aLast(aInd.sma20),
                    sma50Latest: aLast(aInd.sma50),
                    ema12Latest: aLast(aInd.ema12),
                    ema26Latest: aLast(aInd.ema26),
                    macdLatest: aLast(aInd.macd.macd),
                    macdSignalLatest: aLast(aInd.macd.signal),
                    macdHistogramLatest: aLast(aInd.macd.histogram),
                    bollingerUpper: aLast(aInd.bollingerBands.upper),
                    bollingerMiddle: aLast(aInd.bollingerBands.middle),
                    bollingerLower: aLast(aInd.bollingerBands.lower),
                  },
                  recentPriceAction: `Last 5 data points: ${aRecent}`,
                  strategy: trimmed,
                }),
              });

              if (!aRes.ok) throw new Error("Analysis failed");
              const aResult = await aRes.json();

              addLine("output", "");
              addLine("heading", `  ${intentCoin.toUpperCase()} - AI Analysis`);
              addLine("output", "");
              addLine("output", `  Trend:        ${aResult.trend} (${aResult.confidence} confidence)`);
              addLine("output", `  ${aResult.trendExplanation}`);
              addLine("output", "");
              addLine("output", `  Momentum:     ${aResult.momentum}`);
              addLine("output", "");
              addLine("output", `  Support:      $${aResult.keyLevels.support.toLocaleString()}`);
              addLine("output", `  Resistance:   $${aResult.keyLevels.resistance.toLocaleString()}`);
              addLine("output", `  ${aResult.keyLevels.explanation}`);
              addLine("output", "");
              addLine("output", `  Summary:      ${aResult.signalSummary}`);
              addLine("output", "");
              addLine("system", `  ${aResult.disclaimer}`);
              addLine("output", "");

              // Save to context
              ctx.current.lastAnalysis = `${aResult.trend} (${aResult.confidence}) - ${aResult.trendExplanation} ${aResult.signalSummary}`;
              ctx.current.conversationHistory.push(
                { role: "user", content: cmd.trim() },
                { role: "assistant", content: `${intentCoin} analysis: ${aResult.trend}, ${aResult.confidence} confidence. ${aResult.signalSummary}` }
              );
              break;
            }

            if (priceIntent && intentCoin) {
              ctx.current.coin = intentCoin;
              addLine("system", `Fetching ${intentCoin} price...`);
              const pRes = await fetch(`/api/market-data?coin=${intentCoin}&days=1`);
              if (!pRes.ok) throw new Error("Failed to fetch");
              const pData = await pRes.json();
              const pp = pData.metadata.lastPrice;
              const pc = pData.metadata.change24h;
              addLine("output", "");
              addLine("heading", `  ${intentCoin.toUpperCase()}`);
              addLine("output", `  Price:    $${pp.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
              addLine("output", `  24h:      ${pc >= 0 ? "▲ +" : "▼ "}${pc.toFixed(2)}%`);
              addLine("output", "");
              break;
            }

            // ── Free-form AI chat (fallback) ──
            const detectedCoin = detectCoin(trimmed) || ctx.current.coin;
            let coinData = null;

            if (detectedCoin) {
              ctx.current.coin = detectedCoin;
              addLine("system", `Fetching ${detectedCoin} data...`);
              try {
                const mRes = await fetch(`/api/market-data?coin=${detectedCoin}&days=30`);
                if (mRes.ok) {
                  const mData = await mRes.json();
                  const ind = mData.indicators;
                  const last = (arr: number[]) => {
                    for (let i = arr.length - 1; i >= 0; i--) {
                      if (arr[i] != null) return arr[i];
                    }
                    return 0;
                  };
                  coinData = {
                    coin: detectedCoin,
                    price: mData.metadata.lastPrice.toFixed(2),
                    change24h: mData.metadata.change24h.toFixed(2),
                    rsi: last(ind.rsi).toFixed(2),
                    sma20: last(ind.sma20).toFixed(2),
                    sma50: last(ind.sma50).toFixed(2),
                    ema12: last(ind.ema12).toFixed(2),
                    ema26: last(ind.ema26).toFixed(2),
                    macd: last(ind.macd.macd).toFixed(2),
                    macdSignal: last(ind.macd.signal).toFixed(2),
                    bbUpper: last(ind.bollingerBands.upper).toFixed(2),
                    bbLower: last(ind.bollingerBands.lower).toFixed(2),
                  };
                }
              } catch {
                // Continue without coin data
              }
            }

            addLine("system", "Thinking...");

            // Add user message to conversation history
            ctx.current.conversationHistory.push({
              role: "user",
              content: cmd.trim(),
            });

            const chatRes = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: cmd.trim(),
                coinData,
                conversationHistory: ctx.current.conversationHistory.slice(-6),
                context: {
                  coin: ctx.current.coin,
                  strategy: ctx.current.strategy,
                  lastAnalysis: ctx.current.lastAnalysis,
                  lastBacktestSummary: ctx.current.lastBacktestSummary,
                },
              }),
            });

            if (!chatRes.ok) {
              addLine("error", "Failed to get AI response.");
              break;
            }

            const chatData = await chatRes.json();
            const aiResponse = chatData.response;
            const responseLines = aiResponse.split("\n");

            addLine("output", "");
            for (const line of responseLines) {
              addLine("output", `  ${line}`);
            }
            addLine("output", "");

            // Save AI response to conversation history
            ctx.current.conversationHistory.push({
              role: "assistant",
              content: aiResponse,
            });
            // Keep history bounded
            if (ctx.current.conversationHistory.length > 20) {
              ctx.current.conversationHistory =
                ctx.current.conversationHistory.slice(-12);
            }

            ctx.current.lastAiResponse = aiResponse;

            // Save strategy context if the AI suggested one
            const isStrategyRelated = /strateg|entry|exit|buy.*when|sell.*when|stop.?loss|take.?profit|position|trade.*when|rsi.*below|rsi.*above|macd.*cross|bollinger|sma.*cross|mean.?reversion|scalp|swing|momentum|dca|dollar.?cost/i.test(aiResponse);
            if (isStrategyRelated) {
              ctx.current.strategy = aiResponse
                .replace(/this is educational.*$/i, "")
                .replace(/disclaimer.*$/i, "")
                .trim()
                .slice(0, 500);
            }
          }
        }
      } catch (err) {
        addLine("error", `Error: ${err instanceof Error ? err.message : "Something went wrong"}`);
      } finally {
        setProcessing(false);
      }
    },
    [addLine, addLines]
  );

  function resolveCoin(input: string): string | null {
    const lower = input.toLowerCase();
    if (COINS[lower]) return lower;
    for (const [id, symbol] of Object.entries(COINS)) {
      if (symbol.toLowerCase() === lower) return id;
    }
    for (const id of Object.keys(COINS)) {
      if (id.startsWith(lower)) return id;
    }
    return null;
  }

  function detectCoin(text: string): string | null {
    const lower = text.toLowerCase();
    for (const [id, symbol] of Object.entries(COINS)) {
      if (
        lower.includes(id) ||
        lower.includes(symbol.toLowerCase()) ||
        lower.includes(id.replace("-", " "))
      ) {
        return id;
      }
    }
    return null;
  }

  function detectTimeframe(text: string): number {
    const lower = text.toLowerCase();
    // Exact day patterns
    const dayMatch = lower.match(/(\d+)\s*d(?:ay)?s?/);
    if (dayMatch) return Math.min(parseInt(dayMatch[1], 10), 365);
    // Week patterns
    const weekMatch = lower.match(/(\d+)\s*w(?:eek)?s?/);
    if (weekMatch) return Math.min(parseInt(weekMatch[1], 10) * 7, 365);
    // Month patterns
    const monthMatch = lower.match(/(\d+)\s*m(?:onth)?s?/);
    if (monthMatch) return Math.min(parseInt(monthMatch[1], 10) * 30, 365);
    // Year patterns
    const yearMatch = lower.match(/(\d+)\s*y(?:ear)?s?/);
    if (yearMatch) return Math.min(parseInt(yearMatch[1], 10) * 365, 365);
    // Named timeframes
    if (/\b(1d|today|24h|intraday)\b/.test(lower)) return 1;
    if (/\b(3d|3 day)\b/.test(lower)) return 3;
    if (/\b(1w|one week|a week)\b/.test(lower)) return 7;
    if (/\b(2w|two week)\b/.test(lower)) return 14;
    if (/\b(1m|one month|a month)\b/.test(lower)) return 30;
    if (/\b(3m|three month|quarter)\b/.test(lower)) return 90;
    if (/\b(6m|six month|half year)\b/.test(lower)) return 180;
    if (/\b(1y|one year|a year|annual)\b/.test(lower)) return 365;
    if (/\bshort\s*term\b/.test(lower)) return 7;
    if (/\bmedium\s*term\b/.test(lower)) return 30;
    if (/\blong\s*term\b/.test(lower)) return 90;
    // Default
    return 0; // 0 means not specified
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !processing) {
      handleCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-lg sm:rounded-xl border border-white/[0.06] overflow-hidden bg-[#161618]">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
          </div>
          <span className="text-[10px] text-white/15 font-mono">
            cryptolens
          </span>
          <button
            onClick={() => {
              setLines([]);
              addLines("system", WELCOME);
            }}
            className="text-white/10 hover:text-white/25 transition-colors"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>

        {/* Terminal body */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="h-[400px] sm:h-[500px] overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 cursor-text select-text"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace", fontSize: "13px", lineHeight: "1.75" }}
        >
          {/* Output lines */}
          {lines.map((line) => (
            <div
              key={line.id}
              className={
                line.type === "input"
                  ? "text-[#e0e0e0]"
                  : line.type === "error"
                  ? "text-[#e06c75]"
                  : line.type === "heading"
                  ? "text-[#c8c8c8] font-medium"
                  : line.type === "system"
                  ? "text-[#5c6370]"
                  : "text-[#8b8b8b]"
              }
            >
              <pre className="whitespace-pre-wrap break-words">{line.text || "\u00A0"}</pre>
            </div>
          ))}

          {/* Input line */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[#98c379] select-none">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={processing}
              className="flex-1 bg-transparent text-[#e0e0e0] outline-none disabled:opacity-30"
              style={{ caretColor: "#abb2bf", fontFamily: "inherit", fontSize: "inherit" }}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            {processing && (
              <span className="text-[#5c6370] animate-pulse" style={{ fontSize: "11px" }}>
                processing...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
