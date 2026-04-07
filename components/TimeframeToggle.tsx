"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TIMEFRAMES = [
  { label: "1D", value: 1 },
  { label: "3D", value: 3 },
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "1Y", value: 365 },
];

interface TimeframeToggleProps {
  selected: number;
  onSelect: (days: number) => void;
}

export function TimeframeToggle({ selected, onSelect }: TimeframeToggleProps) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-white/[0.03] rounded-full border border-white/[0.06]">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onSelect(tf.value)}
          className={cn(
            "relative px-3.5 py-2 text-xs font-medium rounded-full transition-colors",
            selected === tf.value
              ? "text-white"
              : "text-white/25 hover:text-white/50"
          )}
        >
          {selected === tf.value && (
            <motion.div
              layoutId="timeframe-active"
              className="absolute inset-0 bg-white/10 border border-white/[0.08] rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tf.label}</span>
        </button>
      ))}
    </div>
  );
}
