"use client";

import { motion } from "framer-motion";
import { Coins, BarChart3, BrainCircuit } from "lucide-react";

const steps = [
  {
    icon: Coins,
    title: "Pick a coin",
    description:
      "Choose from the top cryptocurrencies. Real-time data pulled from CoinGecko.",
  },
  {
    icon: BarChart3,
    title: "See the charts",
    description:
      "Interactive charts with SMA, EMA, RSI, MACD, and Bollinger Bands overlaid.",
  },
  {
    icon: BrainCircuit,
    title: "Get AI insights",
    description:
      "AI reads every indicator and tells you what the signals mean — in plain English.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-4">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Three steps. That&apos;s it.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
          {steps.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="group bg-black p-10 flex flex-col items-start hover:bg-white/[0.02] transition-colors duration-500"
            >
              <div className="w-10 h-10 rounded-lg border border-white/[0.08] flex items-center justify-center mb-6 group-hover:border-white/20 transition-colors duration-500">
                <step.icon className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors duration-500" />
              </div>
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/20 mb-3 font-medium">
                0{idx + 1}
              </span>
              <h3 className="text-lg font-semibold text-white mb-3 tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm text-white/30 leading-relaxed font-light">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
