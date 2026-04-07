"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/[0.04]"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="group">
            <span className="text-sm font-medium tracking-widest uppercase text-white/80 group-hover:text-white transition-colors">
              CryptoLens
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xs tracking-wide text-white/40 hover:text-white transition-colors duration-300"
            >
              Home
            </Link>
            <Link
              href="/analyze"
              className="text-xs tracking-wide text-white/90 px-4 py-1.5 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
