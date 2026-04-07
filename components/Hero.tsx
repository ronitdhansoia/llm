"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { PromptBar } from "@/components/PromptBar";

function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    const dpr = window.devicePixelRatio || 1;

    const blobs = [
      { x: 0.3, y: 0.4, r: 0.35, speed: 0.0003, phase: 0 },
      { x: 0.7, y: 0.3, r: 0.3, speed: 0.0004, phase: 2 },
      { x: 0.5, y: 0.7, r: 0.25, speed: 0.00035, phase: 4 },
      { x: 0.2, y: 0.6, r: 0.2, speed: 0.00025, phase: 1 },
      { x: 0.8, y: 0.6, r: 0.22, speed: 0.00045, phase: 3 },
    ];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (!ctx || !canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      time++;

      for (const blob of blobs) {
        const cx =
          w * blob.x + Math.sin(time * blob.speed + blob.phase) * w * 0.08;
        const cy =
          h * blob.y + Math.cos(time * blob.speed * 0.7 + blob.phase) * h * 0.06;
        const radius = Math.min(w, h) * blob.r;

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.04)");
        gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.015)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Aurora blobs */}
      <AuroraBackground />

      {/* Fine grain noise overlay */}
      <div className="absolute inset-0 noise pointer-events-none z-[1]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_black_100%)] z-[2]" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0, 1] }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight leading-[0.9]"
        >
          <span className="block text-white">Decode the</span>
          <span className="block mt-1 sm:mt-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
            crypto market.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-4 sm:mt-6 mb-8 sm:mb-10 text-xs sm:text-sm text-white/25 max-w-md mx-auto leading-relaxed font-light"
        >
          Pick a coin. Describe your strategy. Get AI insights.
        </motion.p>

        {/* Prompt Bar */}
        <PromptBar />

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-10 sm:mt-16 text-[9px] sm:text-[10px] tracking-wider uppercase text-white/15"
        >
          Educational tool - not financial advice
        </motion.p>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-32 bg-gradient-to-t from-black to-transparent z-10" />
    </section>
  );
}
