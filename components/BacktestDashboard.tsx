"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from "lucide-react";
import type { BacktestResult, SimplePrice } from "@/lib/types";

interface BacktestDashboardProps {
  result: BacktestResult;
  prices: SimplePrice[];
  coin: string;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const tooltipStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "10px 14px",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function MetricCard({
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
    <motion.div
      variants={item}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
    >
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
    </motion.div>
  );
}

export function BacktestDashboard({
  result,
  prices,
  coin,
}: BacktestDashboardProps) {
  const { metrics, trades, equity, strategy } = result;

  // ── Price chart with trade markers ──
  const tradeChartData = useMemo(() => {
    const sampled = prices
      .map((p, i) => {
        const entry = trades.find((t) => t.entryIndex === i);
        const exit = trades.find((t) => t.exitIndex === i);
        return {
          date: formatDate(p.time),
          price: p.value,
          entry: entry ? p.value : null,
          exit: exit ? p.value : null,
        };
      })
      // sample to avoid too many points
      .filter(
        (_, i) => i % Math.max(1, Math.floor(prices.length / 300)) === 0
      );

    // Ensure trade markers are included even if they fall between samples
    for (const trade of trades) {
      const entryDate = formatDate(prices[trade.entryIndex]?.time ?? 0);
      if (!sampled.find((s) => s.date === entryDate)) {
        sampled.push({
          date: entryDate,
          price: trade.entryPrice,
          entry: trade.entryPrice,
          exit: null,
        });
      }
      const exitDate = formatDate(prices[trade.exitIndex]?.time ?? 0);
      if (!sampled.find((s) => s.date === exitDate)) {
        sampled.push({
          date: exitDate,
          price: trade.exitPrice,
          entry: null,
          exit: trade.exitPrice,
        });
      }
    }

    return sampled.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [prices, trades]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Strategy info */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1">
              Strategy
            </p>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {strategy.name}
            </h3>
          </div>
          <span className="text-[10px] text-white/15 uppercase tracking-wider px-2.5 py-1 border border-white/[0.04] rounded-full">
            {coin.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-white/30 font-light mb-4">
          {strategy.description}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-white/15 uppercase tracking-wider mb-1.5">
              Entry Rules
            </p>
            <ul className="space-y-1">
              {strategy.entryRules.map((rule, i) => (
                <li
                  key={i}
                  className="text-xs text-white/35 font-light flex items-start gap-2"
                >
                  <ArrowUpRight className="w-3 h-3 text-white/15 mt-0.5 flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] text-white/15 uppercase tracking-wider mb-1.5">
              Exit Rules
            </p>
            <ul className="space-y-1">
              {strategy.exitRules.map((rule, i) => (
                <li
                  key={i}
                  className="text-xs text-white/35 font-light flex items-start gap-2"
                >
                  <ArrowDownRight className="w-3 h-3 text-white/15 mt-0.5 flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total Return"
          value={`${metrics.totalReturn >= 0 ? "+" : ""}${metrics.totalReturn.toFixed(1)}%`}
          icon={TrendingUp}
          positive={metrics.totalReturn >= 0}
        />
        <MetricCard
          label="Win Rate"
          value={`${metrics.winRate.toFixed(0)}%`}
          icon={Target}
          positive={metrics.winRate >= 50}
        />
        <MetricCard
          label="Trades"
          value={`${metrics.totalTrades}`}
          icon={Activity}
        />
        <MetricCard
          label="Max Drawdown"
          value={`-${metrics.maxDrawdown.toFixed(1)}%`}
          icon={TrendingDown}
          positive={metrics.maxDrawdown < 10}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          icon={BarChart3}
          positive={metrics.sharpeRatio > 1 ? true : metrics.sharpeRatio < 0 ? false : null}
        />
        <MetricCard
          label="Profit Factor"
          value={
            metrics.profitFactor === Infinity
              ? "∞"
              : metrics.profitFactor.toFixed(2)
          }
          icon={Percent}
          positive={metrics.profitFactor > 1}
        />
      </div>

      {/* Price chart with trade markers */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4"
      >
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">
          Price Chart with Trades
        </p>
        <p className="text-[10px] text-white/10 mb-3">
          Green dots = entries, Red dots = exits
        </p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={tradeChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.02)"
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.08)"
                tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="rgba(255,255,255,0.08)"
                tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`
                }
                width={55}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.5}
                dot={false}
                name="Price"
              />
              <Scatter
                dataKey="entry"
                fill="#22c55e"
                name="Entry"
                shape="circle"
                r={4}
              />
              <Scatter
                dataKey="exit"
                fill="#ef4444"
                name="Exit"
                shape="circle"
                r={4}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Additional metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Avg Win"
          value={`+${metrics.avgWin.toFixed(1)}%`}
          icon={ArrowUpRight}
          positive={true}
        />
        <MetricCard
          label="Avg Loss"
          value={`${metrics.avgLoss.toFixed(1)}%`}
          icon={ArrowDownRight}
          positive={false}
        />
        <MetricCard
          label="Best Trade"
          value={`+${metrics.bestTrade.toFixed(1)}%`}
          icon={TrendingUp}
          positive={true}
        />
        <MetricCard
          label="Worst Trade"
          value={`${metrics.worstTrade.toFixed(1)}%`}
          icon={TrendingDown}
          positive={false}
        />
      </div>

      {/* Trades table */}
      <motion.div
        variants={item}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <p className="text-[10px] text-white/25 uppercase tracking-widest">
            Trade Log
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-4 py-3 text-left text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  #
                </th>
                <th className="px-4 py-3 text-left text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  Entry
                </th>
                <th className="px-4 py-3 text-left text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  Exit
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  Entry Price
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  Exit Price
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  Return
                </th>
                <th className="px-4 py-3 text-left text-[10px] text-white/20 uppercase tracking-wider font-medium">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => (
                <tr
                  key={i}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-2.5 text-white/30">{i + 1}</td>
                  <td className="px-4 py-2.5 text-white/40">
                    {formatDate(trade.entryTime)}
                  </td>
                  <td className="px-4 py-2.5 text-white/40">
                    {formatDate(trade.exitTime)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-white/50 font-mono">
                    $
                    {trade.entryPrice.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-white/50 font-mono">
                    $
                    {trade.exitPrice.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-medium ${
                      trade.returnPercent >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {trade.returnPercent >= 0 ? "+" : ""}
                    {trade.returnPercent.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-white/25">{trade.exitReason}</td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-white/15 text-sm"
                  >
                    No trades generated for this strategy and timeframe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        variants={item}
        className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.04]"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-white/15 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-white/20 leading-relaxed font-light">
          This backtest is purely educational and uses simplified assumptions (no
          slippage, fees, or liquidity constraints). Past performance does not
          indicate future results. This is not financial advice.
        </p>
      </motion.div>
    </motion.div>
  );
}
