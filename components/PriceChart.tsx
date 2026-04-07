"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  createChart,
  createSeriesMarkers,
  AreaSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { MarketDataResponse, Trade } from "@/lib/types";

// ── Helpers ──

function toUTC(ms: number): UTCTimestamp {
  return (ms / 1000) as UTCTimestamp;
}

function formatPrice(value: number): string {
  if (value >= 1000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(8)}`;
}

// ── Legend ──

interface LegendData {
  price?: number;
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  bbUpper?: number;
  bbLower?: number;
}

function Legend({
  data,
  showSMA,
  showEMA,
  showBollinger,
}: {
  data: LegendData;
  showSMA: boolean;
  showEMA: boolean;
  showBollinger: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
      {data.price != null && (
        <span className="text-white/70">
          Price{" "}
          <span className="text-white/50">{formatPrice(data.price)}</span>
        </span>
      )}
      {showSMA && data.sma20 != null && (
        <span className="text-white/40">
          SMA20{" "}
          <span className="text-white/30">{formatPrice(data.sma20)}</span>
        </span>
      )}
      {showSMA && data.sma50 != null && (
        <span className="text-white/25">
          SMA50{" "}
          <span className="text-white/20">{formatPrice(data.sma50)}</span>
        </span>
      )}
      {showEMA && data.ema12 != null && (
        <span className="text-white/40">
          EMA12{" "}
          <span className="text-white/30">{formatPrice(data.ema12)}</span>
        </span>
      )}
      {showEMA && data.ema26 != null && (
        <span className="text-white/25">
          EMA26{" "}
          <span className="text-white/20">{formatPrice(data.ema26)}</span>
        </span>
      )}
      {showBollinger && data.bbUpper != null && (
        <span className="text-white/20">
          BB {formatPrice(data.bbLower ?? 0)}–{formatPrice(data.bbUpper)}
        </span>
      )}
    </div>
  );
}

// ── Main Price Chart ──

interface PriceChartProps {
  data: MarketDataResponse;
  showSMA: boolean;
  showEMA: boolean;
  showBollinger: boolean;
  trades?: Trade[];
}

export function PriceChart({
  data,
  showSMA,
  showEMA,
  showBollinger,
  trades,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const [legend, setLegend] = useState<LegendData>({});

  const buildChart = useCallback(() => {
    if (!containerRef.current) return;

    seriesRefs.current.clear();

    const container = containerRef.current;
    const isMobile = container.clientWidth < 640;
    const chartHeight = isMobile ? 280 : 420;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.25)",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.02)" },
        horzLines: { color: "rgba(255, 255, 255, 0.02)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.1)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "rgba(255, 255, 255, 0.08)",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.1)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "rgba(255, 255, 255, 0.08)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.04)",
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.04)",
        timeVisible: data.metadata.days <= 3,
        rightOffset: 5,
        minBarSpacing: 1,
      },
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    const prices = data.prices;
    const ind = data.indicators;

    // ── Bollinger Bands ──
    if (showBollinger && ind.bollingerBands.upper.length > 0) {
      const bbUpperData = prices
        .map((p, i) =>
          ind.bollingerBands.upper[i] != null
            ? { time: toUTC(p.time), value: ind.bollingerBands.upper[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const bbLowerData = prices
        .map((p, i) =>
          ind.bollingerBands.lower[i] != null
            ? { time: toUTC(p.time), value: ind.bollingerBands.lower[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const bbMiddleData = prices
        .map((p, i) =>
          ind.bollingerBands.middle[i] != null
            ? { time: toUTC(p.time), value: ind.bollingerBands.middle[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const bbUp = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.08)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      bbUp.setData(bbUpperData);
      seriesRefs.current.set("bbUpper", bbUp);

      const bbLow = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.08)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      bbLow.setData(bbLowerData);
      seriesRefs.current.set("bbLower", bbLow);

      const bbMid = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.05)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      bbMid.setData(bbMiddleData);
      seriesRefs.current.set("bbMiddle", bbMid);
    }

    // ── SMA ──
    if (showSMA && ind.sma20.length > 0) {
      const sma20Data = prices
        .map((p, i) =>
          ind.sma20[i] != null
            ? { time: toUTC(p.time), value: ind.sma20[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const sma50Data = prices
        .map((p, i) =>
          ind.sma50[i] != null
            ? { time: toUTC(p.time), value: ind.sma50[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const s20 = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.35)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      s20.setData(sma20Data);
      seriesRefs.current.set("sma20", s20);

      const s50 = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.15)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      s50.setData(sma50Data);
      seriesRefs.current.set("sma50", s50);
    }

    // ── EMA ──
    if (showEMA && ind.ema12.length > 0) {
      const ema12Data = prices
        .map((p, i) =>
          ind.ema12[i] != null
            ? { time: toUTC(p.time), value: ind.ema12[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const ema26Data = prices
        .map((p, i) =>
          ind.ema26[i] != null
            ? { time: toUTC(p.time), value: ind.ema26[i] }
            : null
        )
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];

      const e12 = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.3)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      e12.setData(ema12Data);
      seriesRefs.current.set("ema12", e12);

      const e26 = chart.addSeries(LineSeries, {
        color: "rgba(255, 255, 255, 0.12)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      e26.setData(ema26Data);
      seriesRefs.current.set("ema26", e26);
    }

    // ── Main price area ──
    const priceSeries = chart.addSeries(AreaSeries, {
      lineColor: "rgba(255, 255, 255, 0.6)",
      lineWidth: 2,
      topColor: "rgba(255, 255, 255, 0.08)",
      bottomColor: "rgba(255, 255, 255, 0)",
      priceLineColor: "rgba(255, 255, 255, 0.15)",
      priceLineStyle: LineStyle.Dashed,
      crosshairMarkerBackgroundColor: "#ffffff",
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "rgba(0, 0, 0, 0.5)",
      crosshairMarkerBorderWidth: 1,
      lastValueVisible: true,
    });

    const priceData = prices.map((p) => ({
      time: toUTC(p.time),
      value: p.value,
    }));
    priceSeries.setData(priceData);
    seriesRefs.current.set("price", priceSeries);

    // ── Trade markers ──
    if (trades && trades.length > 0) {
      const markers = trades.flatMap((trade) => {
        const m: {
          time: UTCTimestamp;
          position: "belowBar" | "aboveBar";
          shape: "arrowUp" | "arrowDown";
          color: string;
          text: string;
          size: number;
        }[] = [];

        if (prices[trade.entryIndex]) {
          m.push({
            time: toUTC(prices[trade.entryIndex].time),
            position: "belowBar",
            shape: "arrowUp",
            color: "#22c55e",
            text: "BUY",
            size: 1.5,
          });
        }
        if (prices[trade.exitIndex]) {
          m.push({
            time: toUTC(prices[trade.exitIndex].time),
            position: "aboveBar",
            shape: "arrowDown",
            color: "#ef4444",
            text: "SELL",
            size: 1.5,
          });
        }
        return m;
      });

      markers.sort((a, b) => (a.time as number) - (b.time as number));
      createSeriesMarkers(priceSeries, markers);
    }

    // ── Crosshair legend ──
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        const lastIdx = prices.length - 1;
        setLegend({
          price: prices[lastIdx]?.value,
          sma20: ind.sma20[lastIdx],
          sma50: ind.sma50[lastIdx],
          ema12: ind.ema12[lastIdx],
          ema26: ind.ema26[lastIdx],
          bbUpper: ind.bollingerBands.upper[lastIdx],
          bbLower: ind.bollingerBands.lower[lastIdx],
        });
        return;
      }

      const priceVal = param.seriesData.get(priceSeries);
      const newLegend: LegendData = {};
      if (priceVal && "value" in priceVal) newLegend.price = priceVal.value;

      for (const [key, series] of seriesRefs.current) {
        if (key === "price") continue;
        const val = param.seriesData.get(series);
        if (val && "value" in val) {
          (newLegend as Record<string, number>)[key] = val.value;
        }
      }
      setLegend(newLegend);
    });

    // Set initial legend
    const lastIdx = prices.length - 1;
    setLegend({
      price: prices[lastIdx]?.value,
      sma20: ind.sma20[lastIdx],
      sma50: ind.sma50[lastIdx],
      ema12: ind.ema12[lastIdx],
      ema26: ind.ema26[lastIdx],
      bbUpper: ind.bollingerBands.upper[lastIdx],
      bbLower: ind.bollingerBands.lower[lastIdx],
    });

    chart.timeScale().fitContent();

    return chart;
  }, [data, showSMA, showEMA, showBollinger, trades]);

  useEffect(() => {
    buildChart();

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        chartRef.current.applyOptions({
          width: w,
          height: w < 640 ? 280 : 420,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [buildChart]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <Legend
          data={legend}
          showSMA={showSMA}
          showEMA={showEMA}
          showBollinger={showBollinger}
        />
      </div>
      <div ref={containerRef} className="w-full" />
    </motion.div>
  );
}

// ── RSI Chart ──

interface RSIChartProps {
  data: MarketDataResponse;
}

export function RSIChart({ data }: RSIChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [rsiValue, setRsiValue] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (data.indicators.rsi.length === 0) return;

    const container = containerRef.current;
    const subHeight = container.clientWidth < 640 ? 140 : 180;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: subHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.2)",
        fontSize: 10,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.015)" },
        horzLines: { color: "rgba(255, 255, 255, 0.015)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.08)",
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          color: "rgba(255,255,255,0.08)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "rgba(255,255,255,0.06)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.04)",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.04)",
        timeVisible: false,
        visible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    const rsiData = data.prices
      .map((p, i) =>
        data.indicators.rsi[i] != null
          ? { time: toUTC(p.time), value: data.indicators.rsi[i] }
          : null
      )
      .filter(Boolean) as { time: UTCTimestamp; value: number }[];

    const rsiSeries = chart.addSeries(AreaSeries, {
      lineColor: "rgba(255, 255, 255, 0.45)",
      lineWidth: 1,
      topColor: "rgba(255, 255, 255, 0.04)",
      bottomColor: "rgba(255, 255, 255, 0)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerBackgroundColor: "#ffffff",
      crosshairMarkerRadius: 3,
    });
    rsiSeries.setData(rsiData);

    const overbought = chart.addSeries(LineSeries, {
      color: "rgba(255, 255, 255, 0.06)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    overbought.setData([
      { time: rsiData[0]?.time, value: 70 },
      { time: rsiData[rsiData.length - 1]?.time, value: 70 },
    ]);

    const oversold = chart.addSeries(LineSeries, {
      color: "rgba(255, 255, 255, 0.06)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    oversold.setData([
      { time: rsiData[0]?.time, value: 30 },
      { time: rsiData[rsiData.length - 1]?.time, value: 30 },
    ]);

    const lastRsi = rsiData[rsiData.length - 1]?.value;
    setRsiValue(lastRsi ?? null);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setRsiValue(lastRsi ?? null);
        return;
      }
      const val = param.seriesData.get(rsiSeries);
      if (val && "value" in val) setRsiValue(val.value);
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  if (data.indicators.rsi.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-3 pb-0 flex items-center justify-between">
        <span className="text-[10px] font-medium text-white/25 tracking-wider uppercase">
          RSI (14)
        </span>
        {rsiValue != null && (
          <span
            className={`text-xs font-mono font-medium ${
              rsiValue > 70
                ? "text-red-400/70"
                : rsiValue < 30
                ? "text-green-400/70"
                : "text-white/40"
            }`}
          >
            {rsiValue.toFixed(1)}
          </span>
        )}
      </div>
      <div ref={containerRef} className="w-full" />
    </motion.div>
  );
}

// ── MACD Chart ──

interface MACDChartProps {
  data: MarketDataResponse;
}

export function MACDChart({ data }: MACDChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [macdLegend, setMacdLegend] = useState<{
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  }>({ macd: null, signal: null, histogram: null });

  useEffect(() => {
    if (!containerRef.current) return;
    if (data.indicators.macd.macd.length === 0) return;

    const container = containerRef.current;
    const subHeight = container.clientWidth < 640 ? 140 : 180;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: subHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.2)",
        fontSize: 10,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.015)" },
        horzLines: { color: "rgba(255, 255, 255, 0.015)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.08)",
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          color: "rgba(255,255,255,0.08)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "rgba(255,255,255,0.06)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.04)",
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.04)",
        timeVisible: false,
        visible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    const macdData = data.prices
      .map((p, i) =>
        data.indicators.macd.macd[i] != null
          ? { time: toUTC(p.time), value: data.indicators.macd.macd[i] }
          : null
      )
      .filter(Boolean) as { time: UTCTimestamp; value: number }[];

    const signalData = data.prices
      .map((p, i) =>
        data.indicators.macd.signal[i] != null
          ? { time: toUTC(p.time), value: data.indicators.macd.signal[i] }
          : null
      )
      .filter(Boolean) as { time: UTCTimestamp; value: number }[];

    const histData = data.prices
      .map((p, i) =>
        data.indicators.macd.histogram[i] != null
          ? {
              time: toUTC(p.time),
              value: data.indicators.macd.histogram[i],
              color:
                data.indicators.macd.histogram[i] >= 0
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(255, 255, 255, 0.06)",
            }
          : null
      )
      .filter(Boolean) as {
      time: UTCTimestamp;
      value: number;
      color: string;
    }[];

    const histSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    histSeries.setData(histData);

    const macdSeries = chart.addSeries(LineSeries, {
      color: "rgba(255, 255, 255, 0.5)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerBackgroundColor: "#ffffff",
      crosshairMarkerRadius: 3,
    });
    macdSeries.setData(macdData);

    const signalSeries = chart.addSeries(LineSeries, {
      color: "rgba(255, 255, 255, 0.2)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    signalSeries.setData(signalData);

    const lastM = macdData[macdData.length - 1]?.value ?? null;
    const lastS = signalData[signalData.length - 1]?.value ?? null;
    const lastH = histData[histData.length - 1]?.value ?? null;
    setMacdLegend({ macd: lastM, signal: lastS, histogram: lastH });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setMacdLegend({ macd: lastM, signal: lastS, histogram: lastH });
        return;
      }
      const m = param.seriesData.get(macdSeries);
      const s = param.seriesData.get(signalSeries);
      const h = param.seriesData.get(histSeries);
      setMacdLegend({
        macd: m && "value" in m ? m.value : lastM,
        signal: s && "value" in s ? s.value : lastS,
        histogram: h && "value" in h ? h.value : lastH,
      });
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  if (data.indicators.macd.macd.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="w-full bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-3 pb-0 flex items-center justify-between">
        <span className="text-[10px] font-medium text-white/25 tracking-wider uppercase">
          MACD (12, 26, 9)
        </span>
        <div className="flex gap-3 text-[10px] font-mono">
          {macdLegend.macd != null && (
            <span className="text-white/40">
              M {macdLegend.macd.toFixed(2)}
            </span>
          )}
          {macdLegend.signal != null && (
            <span className="text-white/20">
              S {macdLegend.signal.toFixed(2)}
            </span>
          )}
          {macdLegend.histogram != null && (
            <span
              className={
                macdLegend.histogram >= 0 ? "text-white/30" : "text-white/15"
              }
            >
              H {macdLegend.histogram.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </motion.div>
  );
}
