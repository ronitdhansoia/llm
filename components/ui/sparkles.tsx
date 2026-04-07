"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

function generateSparkle(): Sparkle {
  return {
    id: Math.random().toString(36).substring(2),
    x: Math.random() * 100 + "%",
    y: Math.random() * 100 + "%",
    size: Math.random() * 3 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 1,
    color: ["#3b82f6", "#06b6d4", "#8b5cf6"][Math.floor(Math.random() * 3)],
  };
}

interface SparklesProps {
  className?: string;
  children?: React.ReactNode;
  count?: number;
}

export function Sparkles({ className, children, count = 15 }: SparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    setSparkles(Array.from({ length: count }, () => generateSparkle()));
    const interval = setInterval(() => {
      setSparkles((prev) =>
        prev.map((s) => (Math.random() > 0.7 ? generateSparkle() : s))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [count]);

  return (
    <span className={cn("relative inline-block", className)}>
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="pointer-events-none absolute block rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: [0, 1, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: sparkle.duration,
              delay: sparkle.delay,
              repeat: Infinity,
            }}
            style={{
              left: sparkle.x,
              top: sparkle.y,
              width: sparkle.size,
              height: sparkle.size,
              background: sparkle.color,
              boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`,
            }}
          />
        ))}
      </AnimatePresence>
      {children}
    </span>
  );
}
