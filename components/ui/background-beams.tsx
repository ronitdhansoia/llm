"use client";

import { cn } from "@/lib/utils";

interface BackgroundBeamsProps {
  className?: string;
}

export function BackgroundBeams({ className }: BackgroundBeamsProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
    >
      <svg
        className="absolute w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beam1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.1)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <linearGradient id="beam2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
            <stop offset="50%" stopColor="rgba(6, 182, 212, 0.08)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </linearGradient>
        </defs>
        <line
          x1="0%"
          y1="20%"
          x2="100%"
          y2="80%"
          stroke="url(#beam1)"
          strokeWidth="1"
        >
          <animate
            attributeName="opacity"
            values="0;0.6;0"
            dur="4s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="100%"
          y1="10%"
          x2="0%"
          y2="90%"
          stroke="url(#beam2)"
          strokeWidth="1"
        >
          <animate
            attributeName="opacity"
            values="0;0.4;0"
            dur="6s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="20%"
          y1="0%"
          x2="80%"
          y2="100%"
          stroke="url(#beam1)"
          strokeWidth="0.5"
        >
          <animate
            attributeName="opacity"
            values="0;0.3;0"
            dur="5s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="80%"
          y1="0%"
          x2="20%"
          y2="100%"
          stroke="url(#beam2)"
          strokeWidth="0.5"
        >
          <animate
            attributeName="opacity"
            values="0;0.5;0"
            dur="7s"
            repeatCount="indefinite"
          />
        </line>
      </svg>
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.04)_0%,_transparent_70%)]" />
    </div>
  );
}
