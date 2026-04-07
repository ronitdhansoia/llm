"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Copy, Check, ChevronDown } from "lucide-react";
import { generatePineScript } from "@/lib/pinescript";
import type { StrategyRules } from "@/lib/types";

interface PineScriptViewerProps {
  strategy: StrategyRules;
}

export function PineScriptViewer({ strategy }: PineScriptViewerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => generatePineScript(strategy), [strategy]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white/40" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white tracking-tight">
              PineScript Code
            </p>
            <p className="text-[10px] text-white/20 font-light">
              Copy and paste into TradingView Pine Editor
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/20 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Code block */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-t border-white/[0.04]">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
                <span className="text-[10px] text-white/15 uppercase tracking-wider">
                  pine v5
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white/80"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Code */}
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <pre className="px-5 py-4 text-[12px] leading-5 font-mono text-white/50">
                  {code.split("\n").map((line, i) => (
                    <div key={i} className="flex">
                      <span className="inline-block w-8 text-right mr-4 text-white/10 select-none flex-shrink-0">
                        {i + 1}
                      </span>
                      <span
                        className={
                          line.startsWith("//")
                            ? "text-white/20"
                            : line.includes("input.")
                            ? "text-white/40"
                            : ""
                        }
                      >
                        {line || " "}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
