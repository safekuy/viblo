"use client";

import { useMemo, useState } from "react";
import { getConfig } from "@/lib/player/config";
import {
  buildGetUrl,
  buildPlayerUrl,
  cls,
  copyText,
  createShortlink,
  navigate,
} from "@/lib/player/utils";

type ShortlinkResult = {
  shortlink: string;
  original: string;
};

type OutputRow = {
  badge: string;
  badgeColor: string;
  icon: string;
  label: string;
  url: string;
  shortlink: string | null;
  loading: boolean;
  error: string | null;
};

// CDN source detection
const CDN_SOURCES = [
  { name: "Slicedrive", patterns: [/slicedrive\.com/i] },
  { name: "Videy", patterns: [/videy\.co/i] },
  { name: "Aceling", patterns: [/aceimg\.com/i] },
  { name: "Xfollow", patterns: [/xxxfollow\.com/i] },
  { name: "Xfree", patterns: [/xfree\.com/i] },
  { name: "Twimg", patterns: [/twimg\.com/i] },
];

function detectSource(url: string): string {
  for (const src of CDN_SOURCES) {
    if (src.patterns.some((p) => p.test(url))) return src.name;
  }
  return "Custom";
}

function detectFilename(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const last = parts[parts.length - 1];
    return last || "unknown";
  } catch {
    const parts = url.split("/");
    return parts[parts.length - 1] || "unknown";
  }
}

export default function GeneratePage() {
  const cfg = useMemo(() => getConfig(), []);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<OutputRow[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const detectedSource = useMemo(() => {
    if (!input.trim()) return null;
    return detectSource(input.trim());
  }, [input]);

  const detectedFilename = useMemo(() => {
    if (!input.trim()) return null;
    return detectFilename(input.trim());
  }, [input]);

  const doGenerate = async () => {
    const raw = input.trim();
    if (!raw) {
      showToast("Please enter a video URL");
      return;
    }

    let src = raw;
    if (!/^https?:\/\//i.test(src) && !/^\/\//.test(src)) {
      if (/^[\w-]+\.[\w.-]+/.test(src)) src = "https://" + src;
    }

    const playerUrl = buildPlayerUrl(src, cfg);
    const landingUrl = buildGetUrl(src, cfg);

    // 2 outputs: Player (shortlinked), Landing Page (shortlinked)
    const initialOutputs: OutputRow[] = [
      {
        badge: "OUT 1",
        badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        icon: "✨",
        label: "Player V2",
        url: playerUrl,
        shortlink: null,
        loading: true,
        error: null,
      },
      {
        badge: "OUT 2",
        badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        icon: "✅",
        label: "Landing Page 4 Button",
        url: landingUrl,
        shortlink: null,
        loading: true,
        error: null,
      },
    ];

    setOutputs(initialOutputs);
    setGenerating(true);

    // Shortlink OUT 1 (Player) and OUT 2 (Landing) in parallel — client-side
    const shortlinkUrl = async (url: string): Promise<ShortlinkResult> => {
      const r = await createShortlink(url);
      return { shortlink: r.shortlink, original: url };
    };

    // Update a specific output row
    const updateOutput = (index: number, updates: Partial<OutputRow>) => {
      setOutputs((prev) => {
        if (!prev) return prev;
        return prev.map((o, i) => (i === index ? { ...o, ...updates } : o));
      });
    };

    // Shortlink OUT 1 and OUT 2 in parallel
    const tasks = [
      shortlinkUrl(playerUrl)
        .then((r) =>
          updateOutput(0, {
            shortlink: r.shortlink,
            loading: false,
          })
        )
        .catch((e) =>
          updateOutput(0, {
            shortlink: playerUrl, // fallback to raw URL
            loading: false,
            error: String(e.message || e),
          })
        ),
      shortlinkUrl(landingUrl)
        .then((r) =>
          updateOutput(1, {
            shortlink: r.shortlink,
            loading: false,
          })
        )
        .catch((e) =>
          updateOutput(1, {
            shortlink: landingUrl, // fallback to raw URL
            loading: false,
            error: String(e.message || e),
          })
        ),
    ];

    await Promise.allSettled(tasks);
    setGenerating(false);
    showToast("Generated successfully!");
  };

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyText(text);
    showToast(ok ? `${label} copied!` : "Failed to copy");
  };

  const handleCopyAll = async () => {
    if (!outputs) return;
    const allText = outputs
      .map((o) => `${o.badge} — ${o.label}: ${o.shortlink || o.url}`)
      .join("\n");
    const ok = await copyText(allText);
    showToast(ok ? "All URLs copied!" : "Failed to copy");
  };

  const handleOpen = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
          >
            <span className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              XTUBS
            </span>
            <span className="font-bold text-white text-lg tracking-tight group-hover:text-cyan-300 transition">
              Generator
            </span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ← Home
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {/* Title section */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Generator Tool
            </span>
            <span className="bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
              v2.0 • Landing Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            <span className="text-white">Video </span>
            <span className="text-cyan-400">Player </span>
            <span className="text-white">Generator</span>
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-white">2 Output:</span>{" "}
            <span className="text-cyan-400">A very interesting video<br></span>{" "}
            <span className="text-slate-600">•</span>{" "}
            <span className="text-cyan-400">For HD 1080P<br></span>
          </p>
        </div>

        {/* Status bar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Current domain:{" "}
              <span className="text-white font-mono font-bold">
                {cfg.siteBase.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              ✓ DB Connected
            </span>
          </div>
          <span className="text-xs text-slate-500">
            🌐 Multi-domain: random
          </span>
        </div>

        {/* Input section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            🔗 Input URL Video
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating) doGenerate();
              }}
              placeholder="https://cdn.example.com/video.mp4"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 font-mono outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={doGenerate}
              disabled={generating}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition whitespace-nowrap flex items-center gap-1.5"
            >
              {generating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Working...
                </>
              ) : (
                <>Generate</>
              )}
            </button>
          </div>

          {/* Source detection */}
          {detectedSource && (
            <div className="mt-3 space-y-2">
              {/* CDN chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cls(
                    "text-[10px] font-bold px-2 py-1 rounded-full border",
                    "bg-cyan-500/10 text-cyan-300 border-cyan-500/40"
                  )}
                >
                  Primary: {detectedSource}
                </span>
                {CDN_SOURCES.filter((s) => s.name !== detectedSource)
                  .slice(0, 4)
                  .map((s) => (
                    <span
                      key={s.name}
                      className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-800 text-slate-500"
                    >
                      {s.name}
                    </span>
                  ))}
              </div>

              {/* Filename + Source */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-slate-500">Filename: </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {detectedFilename}
                  </span>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-slate-500">Source CDN: </span>
                  <span className="text-cyan-400 font-bold">
                    {detectedSource}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Output section */}
        {outputs && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-5">
            <div className="space-y-3">
              {outputs.map((out, i) => (
                <div
                  key={i}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center gap-3"
                >
                  {/* Badge */}
                  <span
                    className={cls(
                      "text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap",
                      out.badgeColor
                    )}
                  >
                    {out.badge}
                  </span>

                  {/* URL */}
                  <div className="flex-1 min-w-0">
                    {out.loading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-3 h-3 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
                        Shortening...
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{out.icon}</span>
                        <span className="text-xs font-mono text-white break-all">
                          {out.shortlink}
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      {out.label}
                    </div>
                  </div>

                  {/* Copy + Open */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleCopy(out.shortlink || out.url, out.label)
                      }
                      disabled={out.loading}
                      className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30 transition"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleOpen(out.shortlink || out.url)}
                      disabled={out.loading}
                      className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 transition"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Copy All */}
            <button
              onClick={handleCopyAll}
              disabled={generating || outputs.some((o) => o.loading)}
              className="w-full mt-3 px-4 py-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 disabled:opacity-30 text-cyan-300 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              Copy All
            </button>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-sm text-slate-100 shadow-xl shadow-black/40">
          {toast}
        </div>
      )}
    </div>
  );
}
