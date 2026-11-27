"use client";

import { useEffect, useMemo, useState } from "react";
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
  copyValue?: string;
  domainLabel?: string;
};

type HistoryEntry = {
  id: string;
  time: number;
  type: "OUT 1" | "OUT 2";
  sourceCdn: string;
  shortlink: string;
};

const HISTORY_KEY = "xtubs_gen_history";
const HISTORY_MAX = 50;

const SETTINGS_OPEN_KEY = "xtubs_gen_settings_open";
// Bulk batch limit — keeps the number of parallel shortlink API calls sane.
const BULK_MAX = 10;

function loadSettingsOpen(): boolean {
  try {
    return localStorage.getItem(SETTINGS_OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((h) => h && typeof h.shortlink === "string")
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

// Compact timestamp: "18/11 16:52"
function fmtHistTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

type BulkGroup = {
  id: string;
  source: string;
  sourceCdn: string;
  filename: string;
  rows: OutputRow[];
};

// Same line format used by the single "Copy All" button.
function rowToText(o: OutputRow): string {
  if (o.copyValue) return o.copyValue;
  return `${o.icon}\n ${o.label}${o.shortlink || o.url}`;
}

const PROMO_EMOJIS: string[] = [
  "🎬➡ ",
  "🔴➡️ ",
  "🌐➡️ ",
  "🔗👉 ",
  "🔞👉 ",
  "vid 🔗👇 ",
  "alt 🔗👇 ",
  "Chek V1d 🔗╰┈➤ ",
  "Alt vedio 🔗╰┈➤ ",
];

const PROMO_LINKS: string[] = [
  "https://t.co/wS38Dtkuut",
  "https://t.co/EYWySCsWlb",
];

// Generate a random 3-character alphanumeric code (lowercase letters + digits).
// Examples: "a3f", "7z2", "k9p".
function randomPromoCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 3; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

function randomEmoji(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
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

// Small ON/OFF switch (used for output-domain selection + .mp4 option)
function ToggleSwitch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cls(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border px-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60",
        on ? "bg-cyan-500 border-cyan-400" : "bg-slate-700 border-slate-600"
      )}
    >
      <span
        className={cls(
          "h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-[18px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

// Shared output row card — used by both the single and the bulk result
// lists (identical layout & behavior to the original generator rows).
function OutputCard({
  out,
  onCopy,
  onOpen,
}: {
  out: OutputRow;
  onCopy: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
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
            <span className="text-sm">{out.label}</span>
            <span className="text-xs font-mono text-white break-all">
              {out.shortlink}
            </span>
          </div>
        )}
        <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
          {out.domainLabel && (
            <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {out.domainLabel}
            </span>
          )}
          <span>{out.icon}</span>
        </div>
      </div>

      {/* Copy + Open */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={onCopy}
          disabled={out.loading}
          className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30 transition"
        >
          Copy
        </button>
        <button
          onClick={onOpen}
          disabled={out.loading}
          className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 transition"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const cfg = useMemo(() => getConfig(), []);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<OutputRow[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ---- Output domain switches (ON/OFF) + .mp4 extension option ----
  // Defaults: every configured domain ON, output WITH .mp4 extension.
  // Each domain carries its own paired shortlink API endpoint.
  const [domains, setDomains] = useState<
    { domain: string; api: string; enabled: boolean }[]
  >(() =>
    cfg.outputDomains.map((d) => ({
      domain: d.domain,
      api: d.api,
      enabled: true,
    }))
  );
  const [useMp4, setUseMp4] = useState(true);
  const enabledDomains = domains.filter((d) => d.enabled);

  // ---- Output type switches (ON/OFF per output: OUT 1 / OUT 2 / OUT 3) ----
  // Defaults: all three ON (same behavior as before this feature).
  const [outTypes, setOutTypes] = useState<
    {
      key: "out1" | "out2" | "out3";
      label: string;
      caption: string;
      enabled: boolean;
    }[]
  >(() => [
    {
      key: "out1",
      label: "OUT 1 — Player",
      caption: "A very interesting video.",
      enabled: true,
    },
    {
      key: "out2",
      label: "OUT 2 — Landing",
      caption: "For HD 1080P.",
      enabled: true,
    },
    {
      key: "out3",
      label: "OUT 3 — Promo",
      caption: "Random promo link.",
      enabled: true,
    },
  ]);
  const enabledOutCount = outTypes.filter((o) => o.enabled).length;
  const isOutEnabled = (key: "out1" | "out2" | "out3") =>
    outTypes.find((o) => o.key === key)?.enabled ?? false;

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

  // ---- Short history state (source CDN + shortlink) ----
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  useEffect(() => {
    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(0, HISTORY_MAX))
      );
    } catch {
      /* storage unavailable — history stays in memory only */
    }
  }, [history]);

  const addHistory = (
    type: "OUT 1" | "OUT 2",
    shortlink: string,
    sourceCdn?: string
  ) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: Date.now(),
      type,
      sourceCdn: sourceCdn || detectedSource || "Custom",
      shortlink,
    };
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_MAX));
  };

  const clearHistory = () => setHistory([]);

  // ---- Single / Bulk mode (Bulk = same outputs for many URLs at once) ----
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkInput, setBulkInput] = useState("");
  const [bulkGroups, setBulkGroups] = useState<BulkGroup[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const bulkLines = useMemo(
    () =>
      bulkInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [bulkInput]
  );

  // ---- Settings show/hide (persisted) — hide the switch cards to keep the
  // generator page compact while actually generating ----
  const [settingsOpen, setSettingsOpen] = useState<boolean>(() =>
    loadSettingsOpen()
  );
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_OPEN_KEY, settingsOpen ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [settingsOpen]);

  const doGenerate = async () => {
    const raw = input.trim();
    if (!raw) {
      showToast("Please enter a video URL");
      return;
    }

    // Which outputs are enabled (OUT 1 / OUT 2 / OUT 3 switches)
    const wantOut1 = isOutEnabled("out1");
    const wantOut2 = isOutEnabled("out2");
    const wantOut3 = isOutEnabled("out3");
    if (!wantOut1 && !wantOut2 && !wantOut3) {
      showToast("Enable at least one output");
      return;
    }
    // OUT 1 / OUT 2 need an output domain; OUT 3 is domain-independent
    if ((wantOut1 || wantOut2) && enabledDomains.length === 0) {
      showToast("Enable at least one output domain");
      return;
    }

    let src = raw;
    if (!/^https?:\/\//i.test(src) && !/^\/\//.test(src)) {
      if (/^[\w-]+\.[\w.-]+/.test(src)) src = "https://" + src;
    }

    const playerUrl = buildPlayerUrl(src, cfg);
    const landingUrl = buildGetUrl(src, cfg);

    // OUT 3 — random emoji + random link + #3-digit code (fully client-side,
    // no shortlink API needed). Generated fresh on every click.
    // Format: "<emoji> <link>#<code>" — no space between link and #code.
    const promoEmoji = pickRandom(PROMO_EMOJIS);
    const promoLink = pickRandom(PROMO_LINKS);
    const promoCode = randomPromoCode();
    const promoText = `${promoEmoji} ${promoLink}#${promoCode}`;

    // Outputs: only the ENABLED output types are generated.
    // OUT 1 / OUT 2 → one row PER ENABLED output domain (shortlinked via the
    // domain's paired API). OUT 3 → promo row, instant + domain-independent.
    // Shortlink format follows the switches: https://<domain>/<code>[.mp4]
    const initialOutputs: OutputRow[] = [];
    // Shortlink jobs collected while building rows:
    // [rowIndex, url, domain, api, type, fallbackUrl]
    const shortlinkJobs: {
      index: number;
      url: string;
      domain: string;
      api: string;
      type: "OUT 1" | "OUT 2";
      fallback: string;
    }[] = [];

    if (wantOut1) {
      for (const d of enabledDomains) {
        shortlinkJobs.push({
          index: initialOutputs.length,
          url: playerUrl,
          domain: d.domain,
          api: d.api,
          type: "OUT 1",
          fallback: playerUrl,
        });
        initialOutputs.push({
          badge: "OUT 1",
          badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
          icon: "A very interesting video.",
          label: randomEmoji(["✨ ", "🔥 ", "🎬 ", "🍿 ", "⭐ ", "💫 ", "🎞️ "]),
          url: playerUrl,
          shortlink: null,
          loading: true,
          error: null,
          domainLabel: d.domain.replace(/^https?:\/\//, ""),
        });
      }
    }
    if (wantOut2) {
      for (const d of enabledDomains) {
        shortlinkJobs.push({
          index: initialOutputs.length,
          url: landingUrl,
          domain: d.domain,
          api: d.api,
          type: "OUT 2",
          fallback: landingUrl,
        });
        initialOutputs.push({
          badge: "OUT 2",
          badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
          icon: "For HD 1080P",
          label: randomEmoji(["✅ ", "🎥 ", "📺 ", "💎 ", "🚀 ", "🌟 ", "🔹 "]),
          url: landingUrl,
          shortlink: null,
          loading: true,
          error: null,
          domainLabel: d.domain.replace(/^https?:\/\//, ""),
        });
      }
    }
    if (wantOut3) {
      initialOutputs.push({
        badge: "OUT 3",
        badgeColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
        icon: "Random promo link",
        label: promoEmoji,
        url: promoLink,
        shortlink: `${promoLink}#${promoCode}`,
        loading: false,
        error: null,
        copyValue: promoText,
      });
    }

    setOutputs(initialOutputs);
    setGenerating(true);

    // Shortlink OUT 1 (Player) and OUT 2 (Landing) rows in parallel —
    // each using its row's selected output domain + its paired API endpoint
    // (twig_safe.php / lnkgo_safe.php) + .mp4 option (client-side)
    const shortlinkUrl = async (
      url: string,
      target: { domain: string; api: string }
    ): Promise<ShortlinkResult> => {
      const r = await createShortlink(url, {
        domain: target.domain,
        api: target.api,
        useMp4,
      });
      return { shortlink: r.shortlink, original: url };
    };

    // Update a specific output row
    const updateOutput = (index: number, updates: Partial<OutputRow>) => {
      setOutputs((prev) => {
        if (!prev) return prev;
        return prev.map((o, i) => (i === index ? { ...o, ...updates } : o));
      });
    };

    // Run every shortlink job in parallel; each success updates its row AND
    // is recorded in the short history (source CDN + shortlink).
    const tasks = shortlinkJobs.map((job) =>
      shortlinkUrl(job.url, job)
        .then((r) => {
          updateOutput(job.index, {
            shortlink: r.shortlink,
            loading: false,
          });
          addHistory(job.type, r.shortlink);
        })
        .catch((e) =>
          updateOutput(job.index, {
            shortlink: job.fallback, // fallback to raw URL
            loading: false,
            error: String(e.message || e),
          })
        )
    );

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
    // OUT 3 (rows with copyValue) is a self-contained string — emitted as a
    // single line in the format the user wants (see rowToText).
    const allText = outputs.map(rowToText).join("\n");
    const ok = await copyText(allText);
    showToast(ok ? "All URLs copied!" : "Failed to copy");
  };

  const handleOpen = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---- Bulk generate: same output rules as the single generator, applied
  // to every URL in the textarea (one per line, max BULK_MAX per batch) ----
  const doBulkGenerate = async () => {
    const lines = bulkInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showToast("Enter at least one video URL");
      return;
    }

    // Same switches as the single generator (OUT 1 / OUT 2 / OUT 3)
    const wantOut1 = isOutEnabled("out1");
    const wantOut2 = isOutEnabled("out2");
    const wantOut3 = isOutEnabled("out3");
    if (!wantOut1 && !wantOut2 && !wantOut3) {
      showToast("Enable at least one output");
      return;
    }
    // OUT 1 / OUT 2 need an output domain; OUT 3 is domain-independent
    if ((wantOut1 || wantOut2) && enabledDomains.length === 0) {
      showToast("Enable at least one output domain");
      return;
    }

    const urls = lines.slice(0, BULK_MAX);
    if (lines.length > BULK_MAX) {
      showToast(`Limited to the first ${BULK_MAX} URLs`);
    }

    // Build every group with the SAME row layout as the single generator:
    // OUT 1 × enabled domains, OUT 2 × enabled domains, OUT 3 promo row.
    const groups: BulkGroup[] = [];
    const bulkJobs: {
      gi: number;
      ri: number;
      url: string;
      domain: string;
      api: string;
      type: "OUT 1" | "OUT 2";
      fallback: string;
      sourceCdn: string;
    }[] = [];

    urls.forEach((raw) => {
      let src = raw;
      if (!/^https?:\/\//i.test(src) && !/^\/\//.test(src)) {
        if (/^[\w-]+\.[\w.-]+/.test(src)) src = "https://" + src;
      }
      const playerUrl = buildPlayerUrl(src, cfg);
      const landingUrl = buildGetUrl(src, cfg);
      const srcCdn = detectSource(src);
      const gi = groups.length;
      const rows: OutputRow[] = [];

      if (wantOut1) {
        for (const d of enabledDomains) {
          bulkJobs.push({
            gi,
            ri: rows.length,
            url: playerUrl,
            domain: d.domain,
            api: d.api,
            type: "OUT 1",
            fallback: playerUrl,
            sourceCdn: srcCdn,
          });
          rows.push({
            badge: "OUT 1",
            badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
            icon: "A very interesting video.",
            label: randomEmoji(["✨ ", "🔥 ", "🎬 ", "🍿 ", "⭐ ", "💫 ", "🎞️ "]),
            url: playerUrl,
            shortlink: null,
            loading: true,
            error: null,
            domainLabel: d.domain.replace(/^https?:\/\//, ""),
          });
        }
      }
      if (wantOut2) {
        for (const d of enabledDomains) {
          bulkJobs.push({
            gi,
            ri: rows.length,
            url: landingUrl,
            domain: d.domain,
            api: d.api,
            type: "OUT 2",
            fallback: landingUrl,
            sourceCdn: srcCdn,
          });
          rows.push({
            badge: "OUT 2",
            badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
            icon: "For HD 1080P",
            label: randomEmoji(["✅ ", "🎥 ", "📺 ", "💎 ", "🚀 ", "🌟 ", "🔹 "]),
            url: landingUrl,
            shortlink: null,
            loading: true,
            error: null,
            domainLabel: d.domain.replace(/^https?:\/\//, ""),
          });
        }
      }
      if (wantOut3) {
        // OUT 3 — fresh random promo per URL, same format as single
        const promoEmoji = pickRandom(PROMO_EMOJIS);
        const promoLink = pickRandom(PROMO_LINKS);
        const promoCode = randomPromoCode();
        rows.push({
          badge: "OUT 3",
          badgeColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
          icon: "Random promo link",
          label: promoEmoji,
          url: promoLink,
          shortlink: `${promoLink}#${promoCode}`,
          loading: false,
          error: null,
          copyValue: `${promoEmoji} ${promoLink}#${promoCode}`,
        });
      }

      groups.push({
        id: `g${gi}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source: src,
        sourceCdn: srcCdn,
        filename: detectFilename(src),
        rows,
      });
    });

    setBulkGroups(groups);
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: bulkJobs.length });

    const updateBulkRow = (
      gi: number,
      ri: number,
      updates: Partial<OutputRow>
    ) => {
      setBulkGroups((prev) =>
        prev.map((g, i) =>
          i === gi
            ? {
                ...g,
                rows: g.rows.map((r, j) =>
                  j === ri ? { ...r, ...updates } : r
                ),
              }
            : g
        )
      );
    };

    // Every shortlink job in parallel — each using its domain's paired API
    // + the .mp4 option; every success is recorded in the short history.
    const tasks = bulkJobs.map((job) =>
      createShortlink(job.url, {
        domain: job.domain,
        api: job.api,
        useMp4,
      })
        .then((r) => {
          updateBulkRow(job.gi, job.ri, {
            shortlink: r.shortlink,
            loading: false,
          });
          addHistory(job.type, r.shortlink, job.sourceCdn);
        })
        .catch((e) =>
          updateBulkRow(job.gi, job.ri, {
            shortlink: job.fallback, // fallback to raw URL
            loading: false,
            error: String(e.message || e),
          })
        )
        .finally(() => {
          setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
        })
    );

    await Promise.allSettled(tasks);
    setBulkBusy(false);
    showToast("Bulk generate finished!");
  };

  const handleCopyGroup = async (g: BulkGroup, gi: number) => {
    const ok = await copyText(g.rows.map(rowToText).join("\n"));
    showToast(ok ? `Group #${gi + 1} copied!` : "Failed to copy");
  };

  const handleCopyAllBulk = async () => {
    if (bulkGroups.length === 0) return;
    const allText = bulkGroups
      .map((g) => g.rows.map(rowToText).join("\n"))
      .join("\n");
    const ok = await copyText(allText);
    showToast(ok ? "All bulk results copied!" : "Failed to copy");
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
            <span className="text-white">3 Output:</span>{" "}
            <span className="text-cyan-400"></span>{" "}
            <span className="text-slate-600"></span>{" "}
            <span className="text-cyan-400"></span>
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
          <span className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
            🌐 Output:
            <span
              className={cls(
                "font-semibold",
                enabledDomains.length > 0 ? "text-slate-300" : "text-red-400"
              )}
            >
              {enabledDomains.length > 0
                ? enabledDomains
                    .map((d) => d.domain.replace(/^https?:\/\//, ""))
                    .join(" + ")
                : "none"}
            </span>
            {enabledDomains.length > 0 && (
              <span
                className={cls(
                  "font-mono font-bold px-1.5 py-0.5 rounded border",
                  useMp4
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                )}
              >
                {useMp4 ? ".mp4 ON" : ".mp4 OFF"}
              </span>
            )}
            <span className="font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">
              🧩 {enabledOutCount}/{outTypes.length}
            </span>
          </span>
        </div>

        {/* Generator settings — show/hide (persisted). Summary chips keep
        the key info visible even when the switch cards are hidden. */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          className="w-full mb-3 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 flex items-center justify-between gap-2 transition"
        >
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            ⚙ Generator Settings
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              🌐 {enabledDomains.length}/{domains.length}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              🧩 {enabledOutCount}/{outTypes.length}
            </span>
            <span
              className={cls(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                useMp4
                  ? "bg-cyan-500/10 text-cyan-300"
                  : "bg-slate-800 text-slate-400"
              )}
            >
              {useMp4 ? ".mp4" : "no-ext"}
            </span>
            <span className="text-slate-500 text-xs w-3 text-center">
              {settingsOpen ? "▲" : "▼"}
            </span>
          </span>
        </button>

        {/* Output domain switches + .mp4 extension option */}
        {settingsOpen && (
        <>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              🌐 Output Domain
            </label>
            <span
              className={cls(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                enabledDomains.length > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              )}
            >
              {enabledDomains.length}/{domains.length} ON
            </span>
          </div>

          <div className="space-y-2">
            {/* ON/OFF switch per output domain */}
            {domains.map((d) => {
              const host = d.domain.replace(/^https?:\/\//, "");
              return (
                <div
                  key={d.domain}
                  className={cls(
                    "bg-slate-950 border rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition",
                    d.enabled ? "border-cyan-500/30" : "border-slate-800"
                  )}
                >
                  <div className="min-w-0">
                    <div
                      className={cls(
                        "text-sm font-mono font-bold truncate",
                        d.enabled ? "text-white" : "text-slate-500"
                      )}
                    >
                      {host}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono truncate">
                      https://{host}/f8yrk{useMp4 ? ".mp4" : ""}
                    </div>
                  </div>
                  <ToggleSwitch
                    on={d.enabled}
                    onToggle={() =>
                      setDomains((prev) =>
                        prev.map((x) =>
                          x.domain === d.domain
                            ? { ...x, enabled: !x.enabled }
                            : x
                        )
                      )
                    }
                    label={`Output domain ${host}`}
                  />
                </div>
              );
            })}

            {/* .mp4 extension option — default ON */}
            <div
              className={cls(
                "bg-slate-950 border rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition",
                useMp4 ? "border-cyan-500/30" : "border-slate-800"
              )}
            >
              <div className="min-w-0">
                <div
                  className={cls(
                    "text-sm font-bold",
                    useMp4 ? "text-white" : "text-slate-500"
                  )}
                >
                  MP4 Extension
                </div>
                <div className="text-[10px] text-slate-600 font-mono truncate">
                  {useMp4
                    ? "ON → /f8yrk.mp4 (default)"
                    : "OFF → /f8yrk (no extension)"}
                </div>
              </div>
              <ToggleSwitch
                on={useMp4}
                onToggle={() => setUseMp4((v) => !v)}
                label="MP4 extension"
              />
            </div>
          </div>
        </div>

        {/* Output type switches (ON/OFF per output) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              🧩 Output Type
            </label>
            <span
              className={cls(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                enabledOutCount > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              )}
            >
              {enabledOutCount}/3 ON
            </span>
          </div>

          <div className="space-y-2">
            {outTypes.map((o) => (
              <div
                key={o.key}
                className={cls(
                  "bg-slate-950 border rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition",
                  o.enabled ? "border-cyan-500/30" : "border-slate-800"
                )}
              >
                <div className="min-w-0">
                  <div
                    className={cls(
                      "text-sm font-bold",
                      o.enabled ? "text-white" : "text-slate-500"
                    )}
                  >
                    {o.label}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">
                    {o.caption}
                  </div>
                </div>
                <ToggleSwitch
                  on={o.enabled}
                  onToggle={() =>
                    setOutTypes((prev) =>
                      prev.map((x) =>
                        x.key === o.key ? { ...x, enabled: !x.enabled } : x
                      )
                    )
                  }
                  label={`Output ${o.label}`}
                />
              </div>
            ))}
          </div>
        </div>
        </>
        )}

        {/* Input section — Single / Bulk mode */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-5">
          {/* Mode tabs: Single (original behavior) / Bulk (many URLs at once) */}
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => setMode("single")}
              className={cls(
                "text-xs font-bold px-3 py-1.5 rounded-lg border transition",
                mode === "single"
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              )}
            >
              Single
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={cls(
                "text-xs font-bold px-3 py-1.5 rounded-lg border transition",
                mode === "bulk"
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              )}
            >
              ⚡ Bulk
            </button>
          </div>

          {mode === "single" ? (
          <>
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
          </>
          ) : (
          <>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            ⚡ Bulk Input — one URL per line
          </label>
          <textarea
            rows={6}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={
              "https://cdn.example.com/video1.mp4\nhttps://cdn.example.com/video2.mp4\nhttps://cdn.example.com/video3.mp4"
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 font-mono outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition resize-y"
            spellCheck={false}
          />
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500">
              {bulkLines.length} URL{bulkLines.length === 1 ? "" : "s"} detected
              {bulkLines.length > BULK_MAX
                ? ` • only the first ${BULK_MAX} will be processed`
                : ` • max ${BULK_MAX} per batch`}
            </span>
            <button
              onClick={doBulkGenerate}
              disabled={bulkBusy}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition whitespace-nowrap flex items-center gap-1.5"
            >
              {bulkBusy ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {bulkProgress.done}/{bulkProgress.total}...
                </>
              ) : (
                <>⚡ Bulk Generate</>
              )}
            </button>
          </div>
          </>
          )}

          {/* Source detection (single mode) */}
          {mode === "single" && detectedSource && (
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

        {/* Output section (single mode) */}
        {mode === "single" && outputs && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-5">
            <div className="space-y-3">
              {outputs.map((out, i) => (
                <OutputCard
                  key={i}
                  out={out}
                  onCopy={() =>
                    handleCopy(
                      out.copyValue || out.shortlink || out.url,
                      out.label
                    )
                  }
                  onOpen={() =>
                    handleOpen(
                      // OUT 3 (rows with copyValue) store a display string
                      // (link + #code) in shortlink — open the clean URL
                      // from out.url instead so the browser can navigate.
                      out.copyValue ? out.url : out.shortlink || out.url
                    )
                  }
                />
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

        {/* Bulk results — one group per source URL, same output rules as single */}
        {mode === "bulk" && bulkGroups.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                ⚡ Bulk Results
                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {bulkGroups.length}
                </span>
              </label>
              <button
                onClick={handleCopyAllBulk}
                disabled={
                  bulkBusy ||
                  bulkGroups.some((g) => g.rows.some((r) => r.loading))
                }
                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 disabled:opacity-30 text-cyan-300 transition"
              >
                Copy All
              </button>
            </div>

            <div className="space-y-3">
              {bulkGroups.map((g, gi) => (
                <div
                  key={g.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-lg p-3"
                >
                  {/* Group header — index + filename + source CDN */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        #{gi + 1}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                        {g.filename}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                        {g.sourceCdn}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyGroup(g, gi)}
                      disabled={g.rows.some((r) => r.loading)}
                      className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30 transition"
                    >
                      Copy All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {g.rows.map((out, ri) => (
                      <OutputCard
                        key={ri}
                        out={out}
                        onCopy={() =>
                          handleCopy(
                            out.copyValue || out.shortlink || out.url,
                            out.label
                          )
                        }
                        onOpen={() =>
                          handleOpen(
                            out.copyValue ? out.url : out.shortlink || out.url
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Short history — source CDN + shortlink (persisted in localStorage) */}
        {history.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                🕘 Short History
                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              </label>
              <button
                onClick={clearHistory}
                className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto xt-scroll">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5"
                >
                  {/* Type + source CDN badges */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-cyan-500/15 text-cyan-300 border-cyan-500/30 whitespace-nowrap">
                      {h.type}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                      {h.sourceCdn}
                    </span>
                  </div>

                  {/* Shortlink + time */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-white break-all">
                      {h.shortlink}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      {fmtHistTime(h.time)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(h.shortlink, h.type)}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
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
