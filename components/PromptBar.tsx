"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const COINS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "binancecoin", name: "BNB", symbol: "BNB" },
  { id: "solana", name: "Solana", symbol: "SOL" },
  { id: "ripple", name: "XRP", symbol: "XRP" },
  { id: "cardano", name: "Cardano", symbol: "ADA" },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  { id: "polkadot", name: "Polkadot", symbol: "DOT" },
  { id: "avalanche-2", name: "Avalanche", symbol: "AVAX" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK" },
  { id: "litecoin", name: "Litecoin", symbol: "LTC" },
  { id: "uniswap", name: "Uniswap", symbol: "UNI" },
  { id: "near", name: "NEAR Protocol", symbol: "NEAR" },
  { id: "stellar", name: "Stellar", symbol: "XLM" },
];

const SUGGESTIONS = [
  "Is this a good entry point for swing trading?",
  "Analyze for a DCA strategy over the next month",
  "Should I hold or take profit at current levels?",
  "What does the RSI divergence suggest right now?",
  "Break down the MACD crossover signal",
];

export function PromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
  const [showCoinPicker, setShowCoinPicker] = useState(false);
  const [coinSearch, setCoinSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const coinPickerRef = useRef<HTMLDivElement>(null);

  const filteredCoins = COINS.filter(
    (c) =>
      c.name.toLowerCase().includes(coinSearch.toLowerCase()) ||
      c.symbol.toLowerCase().includes(coinSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        coinPickerRef.current &&
        !coinPickerRef.current.contains(e.target as Node)
      ) {
        setShowCoinPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = () => {
    const strategy = prompt.trim();
    const params = new URLSearchParams({ coin: selectedCoin.id });
    if (strategy) params.set("strategy", strategy);
    router.push(`/analyze?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main prompt container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className={cn(
          "relative rounded-2xl border transition-all duration-500",
          focused
            ? "border-white/15 bg-white/[0.04] shadow-[0_0_40px_rgba(255,255,255,0.03)]"
            : "border-white/[0.06] bg-white/[0.02]"
        )}
      >
        {/* Top row: coin selector */}
        <div className="flex items-center border-b border-white/[0.04] px-4 py-2.5">
          <div ref={coinPickerRef} className="relative">
            <button
              onClick={() => setShowCoinPicker(!showCoinPicker)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all text-xs"
            >
              <span className="text-white/70 font-medium">
                {selectedCoin.symbol}
              </span>
              <span className="text-white/25">{selectedCoin.name}</span>
              <svg
                className={cn(
                  "w-3 h-3 text-white/20 transition-transform",
                  showCoinPicker && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <AnimatePresence>
              {showCoinPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 sm:right-auto mt-2 w-full sm:w-56 bg-black border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-50"
                >
                  <div className="p-2 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.03] rounded-lg">
                      <Search className="w-3 h-3 text-white/20" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={coinSearch}
                        onChange={(e) => setCoinSearch(e.target.value)}
                        className="bg-transparent text-xs text-white placeholder:text-white/20 outline-none flex-1"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {filteredCoins.map((coin) => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setSelectedCoin(coin);
                          setShowCoinPicker(false);
                          setCoinSearch("");
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                          "hover:bg-white/[0.04] transition-colors text-left",
                          coin.id === selectedCoin.id
                            ? "bg-white/[0.06] text-white"
                            : "text-white/40"
                        )}
                      >
                        <span className="font-medium text-white/60">
                          {coin.symbol}
                        </span>
                        <span className="text-white/25">{coin.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Textarea */}
        <div className="relative px-4 py-3">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your strategy or what you want to analyze..."
            rows={2}
            className="w-full bg-transparent text-xs sm:text-sm text-white/80 placeholder:text-white/15 outline-none resize-none leading-relaxed font-light pr-12"
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            className="absolute right-4 bottom-3 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl bg-white text-black hover:scale-105 active:scale-95 transition-transform"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="flex flex-wrap justify-center gap-2 mt-4"
      >
        {SUGGESTIONS.slice(0, 3).map((s) => (
          <button
            key={s}
            onClick={() => {
              setPrompt(s);
              inputRef.current?.focus();
            }}
            className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] text-white/20 border border-white/[0.04] rounded-full hover:border-white/[0.1] hover:text-white/35 transition-all duration-300"
          >
            {s}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
