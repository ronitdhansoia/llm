import { Navbar } from "@/components/Navbar";
import { Terminal } from "@/components/Terminal";

export default function TerminalPage() {
  return (
    <main className="relative min-h-screen bg-black">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-20 sm:pt-24 pb-12">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Terminal
          </h1>
          <p className="text-white/30 mt-1.5 sm:mt-2 text-xs sm:text-sm font-light">
            CLI interface for price lookups, analysis, and backtesting.
          </p>
        </div>

        <Terminal />
      </div>
    </main>
  );
}
