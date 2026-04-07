"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover3d?: boolean;
  delay?: number;
}

export function GlassCard({
  children,
  className,
  hover3d = false,
  delay = 0,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={
        hover3d
          ? { scale: 1.02, rotateY: 5, rotateX: -5 }
          : { scale: 1.02 }
      }
      className={cn(
        "bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6",
        "transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.03]",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}
