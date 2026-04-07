"use client";

import { motion } from "framer-motion";
import { Bebas_Neue } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Terminal } from "@/components/Terminal";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
});

export default function TerminalPage() {
  return (
    <main className="relative min-h-screen bg-black flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        {/* Hero section - title left, description right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14"
        >
          <div className={display.className}>
            <h1 className="text-5xl sm:text-6xl md:text-8xl uppercase text-white leading-[0.85] tracking-[-0.02em]">
              CryptoLens
            </h1>
            <h2 className="text-5xl sm:text-6xl md:text-8xl uppercase text-white/20 leading-[0.85] tracking-[-0.02em]">
              Terminal
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-sm text-white/35 font-light leading-relaxed">
              Price lookups, AI analysis, strategy backtesting,
              and free-form prompting - all from the command line.
            </p>
            <div className="flex gap-2 mt-4">
              <a
                href="/analyze"
                className="text-[11px] px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white hover:text-black transition-all duration-300"
              >
                Open Dashboard
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("./cryptolens.sh");
                }}
                className="text-[11px] px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white hover:text-black transition-all duration-300 font-mono"
              >
                ./cryptolens.sh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Terminal card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="w-full"
        >
          <Terminal />
        </motion.div>
      </div>
    </main>
  );
}
