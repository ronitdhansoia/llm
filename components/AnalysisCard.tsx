"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Target,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@/lib/types";

interface AnalysisCardProps {
  analysis: AnalysisResponse;
}

const trendConfig = {
  Bullish: { icon: TrendingUp, label: "Bullish" },
  Bearish: { icon: TrendingDown, label: "Bearish" },
  Neutral: { icon: Minus, label: "Neutral" },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const trend = trendConfig[analysis.trend];
  const TrendIcon = trend.icon;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* Trend */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center">
              <TrendIcon className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <p className="text-[10px] text-white/20 uppercase tracking-widest">
                Overall Trend
              </p>
              <p className="text-lg font-bold text-white tracking-tight">
                {analysis.trend}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase bg-white/[0.04] border border-white/[0.06] text-white/40">
            {analysis.confidence}
          </span>
        </div>
        <p className="text-white/40 text-sm leading-relaxed font-light">
          {analysis.trendExplanation}
        </p>
      </motion.div>

      {/* Momentum + Key Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div
          variants={item}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-3.5 h-3.5 text-white/25" />
            <p className="text-[10px] text-white/20 uppercase tracking-widest">
              Momentum
            </p>
          </div>
          <p className="text-white/40 text-sm leading-relaxed font-light">
            {analysis.momentum}
          </p>
        </motion.div>

        <motion.div
          variants={item}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3.5 h-3.5 text-white/25" />
            <p className="text-[10px] text-white/20 uppercase tracking-widest">
              Key Levels
            </p>
          </div>
          <div className="flex gap-6 mb-3">
            <div>
              <p className="text-[10px] text-white/15 uppercase tracking-wider">Support</p>
              <p className="text-white/70 font-semibold text-sm">
                ${analysis.keyLevels.support.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/15 uppercase tracking-wider">Resistance</p>
              <p className="text-white/70 font-semibold text-sm">
                ${analysis.keyLevels.resistance.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-white/25 text-xs leading-relaxed font-light">
            {analysis.keyLevels.explanation}
          </p>
        </motion.div>
      </div>

      {/* Signal Summary */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-3.5 h-3.5 text-white/25" />
          <p className="text-[10px] text-white/20 uppercase tracking-widest">
            Signal Summary
          </p>
        </div>
        <p className="text-white/40 text-sm leading-relaxed font-light">
          {analysis.signalSummary}
        </p>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        variants={item}
        className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.04]"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-white/15 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-white/20 leading-relaxed font-light">
          {analysis.disclaimer}
        </p>
      </motion.div>
    </motion.div>
  );
}
