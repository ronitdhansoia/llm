"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Shuffle,
  TrendingUp,
  Shield,
  Percent,
} from "lucide-react";
import type { MonteCarloResult } from "@/lib/types";

interface MonteCarloChartProps {
  result: MonteCarloResult;
}

const tooltipStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "10px 14px",
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function MCMetric({
  label,
  value,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  positive?: boolean | null;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-white/20" />
        <span className="text-[10px] text-white/20 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p
        className={`text-lg font-bold tracking-tight ${
          positive === true
            ? "text-green-400"
            : positive === false
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function MonteCarloChart({ result }: MonteCarloChartProps) {
  // ── Fan chart data ──
  const fanData = useMemo(() => {
    const steps = result.percentiles.p50.length;
    return Array.from({ length: steps }, (_, i) => ({
      trade: i,
      p5: parseFloat(result.percentiles.p5[i].toFixed(0)),
      p25: parseFloat(result.percentiles.p25[i].toFixed(0)),
      p50: parseFloat(result.percentiles.p50[i].toFixed(0)),
      p75: parseFloat(result.percentiles.p75[i].toFixed(0)),
      p95: parseFloat(result.percentiles.p95[i].toFixed(0)),
    }));
  }, [result.percentiles]);

  // ── Distribution histogram ──
  const histogramData = useMemo(() => {
    const returns = result.finalReturns;
    if (returns.length === 0) return [];

    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const range = max - min || 1;
    const numBins = 30;
    const binWidth = range / numBins;

    const bins: { center: number; count: number; label: string }[] = [];
    for (let i = 0; i < numBins; i++) {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const count = returns.filter((r) => r >= lo && (i === numBins - 1 ? r <= hi : r < hi)).length;
      bins.push({
        center: parseFloat(((lo + hi) / 2).toFixed(1)),
        count,
        label: `${lo.toFixed(0)}% to ${hi.toFixed(0)}%`,
      });
    }

    return bins;
  }, [result.finalReturns]);

  if (result.finalReturns.length === 0) {
    return (
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-center"
      >
        <p className="text-white/20 text-sm font-light">
          Not enough trades to run Monte Carlo simulation.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center">
          <Shuffle className="w-4 h-4 text-white/40" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Monte Carlo Simulation
          </h3>
          <p className="text-xs text-white/20 font-light">
            {result.simulations} randomized trade sequences
          </p>
        </div>
      </motion.div>

      {/* MC Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MCMetric
          label="Median Return"
          value={`${result.medianReturn >= 0 ? "+" : ""}${result.medianReturn.toFixed(1)}%`}
          icon={TrendingUp}
          positive={result.medianReturn >= 0}
        />
        <MCMetric
          label="Prob. of Profit"
          value={`${result.probabilityOfProfit.toFixed(0)}%`}
          icon={Shield}
          positive={result.probabilityOfProfit >= 50}
        />
        <MCMetric
          label="Worst Case (5th)"
          value={`${result.p5Return >= 0 ? "+" : ""}${result.p5Return.toFixed(1)}%`}
          icon={Percent}
          positive={result.p5Return >= 0}
        />
        <MCMetric
          label="Best Case (95th)"
          value={`+${result.p95Return.toFixed(1)}%`}
          icon={TrendingUp}
          positive={true}
        />
      </div>

      {/* Fan chart - percentile bands */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4"
      >
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">
          Equity Percentile Bands
        </p>
        <p className="text-[10px] text-white/10 mb-3">
          Shaded area shows 5th–95th percentile range across {result.simulations} simulations
        </p>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={fanData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="mcOuter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.03} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mcInner" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis
                dataKey="trade"
                stroke="rgba(255,255,255,0.08)"
                tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Trade #",
                  position: "insideBottom",
                  offset: -5,
                  fill: "rgba(255,255,255,0.1)",
                  fontSize: 10,
                }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.08)"
                tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={55}
              />
              <ReferenceLine y={10000} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}
                labelFormatter={(v) => `After trade ${v}`}
                formatter={(value) => [
                  `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  "",
                ]}
              />

              {/* 5th–95th band */}
              <Area type="monotone" dataKey="p95" stroke="none" fill="url(#mcOuter)" name="95th %" />
              <Area type="monotone" dataKey="p5" stroke="none" fill="black" name="5th %" />

              {/* 25th–75th band */}
              <Area type="monotone" dataKey="p75" stroke="none" fill="url(#mcInner)" name="75th %" />
              <Area type="monotone" dataKey="p25" stroke="none" fill="black" name="25th %" />

              {/* Median line */}
              <Area
                type="monotone"
                dataKey="p50"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1.5}
                fill="none"
                name="Median"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Return distribution histogram */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4"
      >
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">
          Return Distribution
        </p>
        <p className="text-[10px] text-white/10 mb-3">
          Final return across all {result.simulations} simulated paths
        </p>
        <div className="h-[180px] sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histogramData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis
                dataKey="center"
                stroke="rgba(255,255,255,0.08)"
                tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                interval={Math.max(0, Math.floor(histogramData.length / 8))}
              />
              <YAxis
                stroke="rgba(255,255,255,0.08)"
                tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.08)" />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => `~${v}% return`}
                formatter={(value) => [value, "Simulations"]}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {histogramData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.center >= 0
                        ? "rgba(34, 197, 94, 0.4)"
                        : "rgba(239, 68, 68, 0.4)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Extra stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <MCMetric
          label="Mean Return"
          value={`${result.meanReturn >= 0 ? "+" : ""}${result.meanReturn.toFixed(1)}%`}
          icon={TrendingUp}
          positive={result.meanReturn >= 0}
        />
        <MCMetric
          label="Median Max DD"
          value={`-${result.medianMaxDrawdown.toFixed(1)}%`}
          icon={Shield}
          positive={result.medianMaxDrawdown < 15}
        />
        <MCMetric
          label="Prob. of 2x"
          value={`${result.probabilityOfDoubling.toFixed(1)}%`}
          icon={Percent}
          positive={result.probabilityOfDoubling > 10}
        />
      </div>
    </div>
  );
}
