"use client";

import { getConfig } from "@/lib/player/config";
import { navigate } from "@/lib/player/utils";

export default function HomePage() {
  const cfg = getConfig();

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a] text-slate-200">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Anti Bom-Click · Anti Bot · Anti Adblock
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Full-Screen{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Video Player
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            A clean, modern video player for PC, laptop, and mobile. Auto-pauses
            after 30 seconds (twice max) with a continue banner that opens your
            custom URL in a new tab.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <FeatureCard
              title="Anti Bom-Click"
              desc="Sliding-window rate limiter (3 clicks/sec + 800ms cooldown). Prevents popup spam."
            />
            <FeatureCard
              title="Anti Bot"
              desc="Detects WebDriver, headless Chrome, PhantomJS, and automation markers."
            />
            <FeatureCard
              title="Anti Adblock"
              desc="Bait-div detection. Shows a warning overlay if an adblocker is active."
            />
            <FeatureCard
              title="Full-Screen Player"
              desc="100vw × 100vh, responsive across PC/laptop/mobile. Zero clutter."
            />
            <FeatureCard
              title="Auto-Pause (2x Max)"
              desc="Pauses at 30s and 60s, then lets the video play to the end."
            />
            <FeatureCard
              title="Shortlink Outputs"
              desc="Generator outputs shortlinked Player URL and Landing Page URL."
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        XTUBS Player Pro · 2026
      </footer>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="text-sm font-semibold text-white mb-1">{title}</div>
      <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
    </div>
  );
}
