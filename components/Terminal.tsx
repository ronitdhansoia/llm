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

Or just ask anything in plain English:

  $ is bitcoin overbought right now?
  $ what does the MACD say about ethereum?
  $ should I DCA into solana at this price?
  $ explain RSI divergence
  $ compare SMA and EMA crossover strategies`;

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

          case "price": {
            const coin = args[0];
            if (!coin) {
              addLine("error", 'Usage: price <coin>  (e.g. "price bitcoin")');
              break;
            }
            const resolved = resolveCoin(coin);
            if (!resolved) {
              addLine("error", `Unknown coin: ${coin}. Type "coins" to see supported list.`);
              break;
            }

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

          case "indicators": {
            const coin = args[0];
            if (!coin) {
              addLine("error", 'Usage: indicators <coin>');
              break;
            }
            const resolved = resolveCoin(coin);
            if (!resolved) {
              addLine("error", `Unknown coin: ${coin}`);
              break;
            }

            addLine("system", `Computing indicators for ${resolved}...`);

            const res = await fetch(`/api/market-data?coin=${resolved}&days=30`);
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
            addLine("heading", `  ${resolved.toUpperCase()} — Technical Indicators (30D)`);
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

          case "analyze": {
            const coin = args[0];
            if (!coin) {
              addLine("error", 'Usage: analyze <coin>');
              break;
            }
            const resolved = resolveCoin(coin);
            if (!resolved) {
              addLine("error", `Unknown coin: ${coin}`);
              break;
            }

            addLine("system", `Fetching market data for ${resolved}...`);

            const marketRes = await fetch(`/api/market-data?coin=${resolved}&days=30`);
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
                timeframe: "30 days",
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
            addLine("heading", `  ${resolved.toUpperCase()} — AI Analysis`);
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
            break;
          }

          case "backtest": {
            const coin = args[0];
            if (!coin) {
              addLine("error", 'Usage: backtest <coin> <strategy description>');
              break;
            }
            const resolved = resolveCoin(coin);
            if (!resolved) {
              addLine("error", `Unknown coin: ${coin}`);
              break;
            }

            const strategyText = args.slice(1).join(" ") || "balanced swing trading using RSI and MACD";

            addLine("system", `Fetching 90D data for ${resolved}...`);

            const marketRes = await fetch(`/api/market-data?coin=${resolved}&days=90`);
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
                timeframe: "90 days",
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
            addLine("heading", `  ${resolved.toUpperCase()} — Backtest Results`);
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

            addLine("system", "  Educational only — not financial advice.");
            addLine("output", "");
            break;
          }

          default: {
            if (command.includes("cryptolens") || command.includes("./") || command.includes(".sh")) {
              addLine("system", "You're already inside the CryptoLens terminal.");
              addLine("system", 'Type a command directly — e.g. "price bitcoin" or "analyze ethereum"');
              addLine("system", 'Type "help" to see all available commands.');
              break;
            }

            // ── Free-form AI chat ──
            // Detect if any coin is mentioned in the full input
            const detectedCoin = detectCoin(trimmed);
            let coinData = null;

            if (detectedCoin) {
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

            const chatRes = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: cmd.trim(),
                coinData,
              }),
            });

            if (!chatRes.ok) {
              addLine("error", "Failed to get AI response.");
              break;
            }

            const chatData = await chatRes.json();
            const responseLines = chatData.response.split("\n");

            addLine("output", "");
            for (const line of responseLines) {
              addLine("output", `  ${line}`);
            }
            addLine("output", "");
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
    // Check for coin names and symbols in the text
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0a0a0a]">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-white/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-white/[0.06]" />
          </div>
          <span className="text-[10px] text-white/15 font-mono tracking-wider">
            cryptolens
          </span>
          <button
            onClick={() => {
              setLines([]);
              addLines("system", WELCOME);
            }}
            className="text-white/15 hover:text-white/30 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Terminal body */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="h-[400px] sm:h-[500px] overflow-y-auto p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed cursor-text select-text"
        >
          {/* Output lines */}
          {lines.map((line) => (
            <div
              key={line.id}
              className={
                line.type === "input"
                  ? "text-white/70"
                  : line.type === "error"
                  ? "text-red-400/70"
                  : line.type === "heading"
                  ? "text-white/80 font-medium"
                  : line.type === "system"
                  ? "text-white/25"
                  : "text-white/40"
              }
            >
              <pre className="whitespace-pre-wrap break-words">{line.text || "\u00A0"}</pre>
            </div>
          ))}

          {/* Input line */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/30 select-none">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={processing}
              className="flex-1 bg-transparent text-white/70 outline-none caret-white/50 disabled:opacity-30"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            {processing && (
              <span className="text-white/20 animate-pulse text-[10px]">
                processing...
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
