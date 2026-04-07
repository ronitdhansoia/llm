"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoinOption } from "@/lib/types";

const COINS: CoinOption[] = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", image: "" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", image: "" },
  { id: "binancecoin", name: "BNB", symbol: "BNB", image: "" },
  { id: "solana", name: "Solana", symbol: "SOL", image: "" },
  { id: "ripple", name: "XRP", symbol: "XRP", image: "" },
  { id: "cardano", name: "Cardano", symbol: "ADA", image: "" },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", image: "" },
  { id: "polkadot", name: "Polkadot", symbol: "DOT", image: "" },
  { id: "avalanche-2", name: "Avalanche", symbol: "AVAX", image: "" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK", image: "" },
  { id: "polygon-ecosystem-token", name: "POL (ex-MATIC)", symbol: "POL", image: "" },
  { id: "uniswap", name: "Uniswap", symbol: "UNI", image: "" },
  { id: "litecoin", name: "Litecoin", symbol: "LTC", image: "" },
  { id: "near", name: "NEAR Protocol", symbol: "NEAR", image: "" },
  { id: "stellar", name: "Stellar", symbol: "XLM", image: "" },
];

interface CoinSelectorProps {
  selected: string;
  onSelect: (coinId: string) => void;
}

export function CoinSelector({ selected, onSelect }: CoinSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedCoin = COINS.find((c) => c.id === selected);
  const filtered = COINS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-2.5",
          "bg-white/[0.03] border border-white/[0.06] rounded-full",
          "hover:bg-white/[0.05] transition-all duration-300",
          "text-left text-sm"
        )}
      >
        <span className="text-white/70 font-medium">
          {selectedCoin
            ? `${selectedCoin.name} (${selectedCoin.symbol})`
            : "Select a coin"}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-white/25 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-black border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg">
                <Search className="w-3.5 h-3.5 text-white/20" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder:text-white/20 outline-none flex-1"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    onSelect(coin.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs",
                    "hover:bg-white/[0.04] transition-colors text-left",
                    coin.id === selected
                      ? "bg-white/[0.06] text-white"
                      : "text-white/50"
                  )}
                >
                  <span className="font-medium">{coin.name}</span>
                  <span className="text-white/20 ml-auto text-[10px] tracking-wider">
                    {coin.symbol}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-white/20 text-center py-4">
                  No coins found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
