"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Loader2 } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";

interface AnalyzeButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function AnalyzeButton({ onClick, loading, disabled }: AnalyzeButtonProps) {
  return (
    <ShimmerButton onClick={onClick} disabled={loading || disabled}>
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <BrainCircuit className="w-4 h-4" />
          Analyze with AI
        </>
      )}
    </ShimmerButton>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6"
        >
          <div className="shimmer h-3 w-20 rounded mb-4" />
          <div className="space-y-2.5">
            <div className="shimmer h-2.5 w-full rounded" />
            <div className="shimmer h-2.5 w-4/5 rounded" />
            <div className="shimmer h-2.5 w-3/5 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
