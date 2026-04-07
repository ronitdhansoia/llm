"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ShimmerButton({
  children,
  className,
  onClick,
  disabled,
}: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center px-7 py-3 overflow-hidden",
        "text-sm font-medium text-black bg-white rounded-full",
        "transition-all duration-300",
        "hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
