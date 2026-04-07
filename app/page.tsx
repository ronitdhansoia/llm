import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";

export default function Home() {
  return (
    <main className="relative bg-black">
      <Navbar />
      <Hero />
      <HowItWorks />

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10 text-center">
        <p className="text-xs text-white/20 tracking-wide">
          CryptoLens - Built for &quot;Introduction to LLMs&quot;
        </p>
        <p className="text-[10px] text-white/10 mt-1.5 tracking-wider uppercase">
          Educational tool only. Not financial advice.
        </p>
      </footer>
    </main>
  );
}
