"use client";

import { useEffect, useMemo, useState } from "react";
import { getConfig } from "@/lib/player/config";
import {
  buildPlayerUrl,
  idToSource,
  makeClickGuard,
} from "@/lib/player/utils";
import { useHistatsTracker } from "@/components/player/HistatsTracker";
type BtnDef = {
  key: string;
  label: string;
  icon: string;
  href: string;
  // "primary" = bright blue gradient, "secondary" = dark slate gray
  style: "primary" | "secondary";
  target?: "_blank" | "_self";
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STYLE_ID = "xtubs-get-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }
    @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
}

export default function GetPage({ id }: { id: string }) {
  // Memoize config so it's stable across renders (getConfig() returns a new
  // object each call, which would cause useMemo/useEffect infinite loops)
  const cfg = useMemo(() => getConfig(), []);
  const [clickGuard] = useState(() => makeClickGuard(cfg));

  // Histats analytics — injects the Histats script on this landing page.
  // Guarded by a module-level flag: the script is injected ONCE per full
  // page load, even if the user navigates between #/get and #/v.
  useHistatsTracker();

  const [source, setSource] = useState("");
  const [onlineCount, setOnlineCount] = useState(
    800 + Math.floor(Math.random() * 500)
  );

  useEffect(() => {
    setSource(id ? idToSource(id) : cfg.demoVideoUrl);
  }, [id, cfg.demoVideoUrl]);

  // Build the 4 button definitions.
  // Labels are ALWAYS in sequential order: "Video Link 1" → "Video Link 4".
  // Icons and colors are tied to the label position (constant appearance).
  // The DESTINATIONS (hrefs) are shuffled randomly on every load, so users
  // can't predict which button goes where.
  const buttons: BtnDef[] = useMemo(() => {
    if (!source) return [];
    const playerUrl = buildPlayerUrl(source, cfg);

    // Fixed label positions (always in order 1-4)
    const labelSlots = [
      { label: "Video Link 1", icon: "▶", style: "primary" as const },
      { label: "Video Link 2", icon: "🔥", style: "secondary" as const },
      { label: "Video Link 3", icon: "💎", style: "secondary" as const },
      { label: "Video Link 4", icon: "🎬", style: "primary" as const },
    ];

    // Destinations are shuffled — random assignment each load
    const destinations = shuffle([
      { key: "player", href: playerUrl },
      { key: "fb", href: cfg.facebookGroup },
      { key: "smart1", href: cfg.smartlink1 },
      { key: "smart2", href: cfg.smartlink2 },
    ]);

    // Combine: label[i] gets destination[i]
    return labelSlots.map((slot, i) => ({
      key: destinations[i].key,
      label: slot.label,
      icon: slot.icon,
      href: destinations[i].href,
      style: slot.style,
      target: "_blank" as const,
    }));
  }, [source, cfg]);

  // Buttons are already in order (1-4) with shuffled destinations — no
  // additional rotation needed.
  const [rotated, setRotated] = useState<BtnDef[]>([]);

  useEffect(() => {
    injectStyles();
    setRotated(buttons);
  }, [buttons]);

  // Online counter
  useEffect(() => {
    const tick = () => {
      setOnlineCount((c) => {
        const delta = Math.floor(Math.random() * 14) - 5;
        return Math.max(500, c + delta);
      });
    };
    const interval = setInterval(
      tick,
      2000 + Math.floor(Math.random() * 1000)
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8 text-white overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1a2332 0%, #0a0e17 60%, #060810 100%)",
      }}
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Title — large bold blue */}
        <h1
          className="text-4xl font-extrabold text-center mb-3"
          style={{ color: "#2563EB" }}
        >
          {cfg.getpageTitle}
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-300 text-center mb-7 leading-relaxed max-w-xs">
          {cfg.getpageDescription}
        </p>

        {/* Buttons — stacked, auto-rotated positions */}
        <div className="w-full flex flex-col gap-3 items-center">
          {rotated.map((btn, i) => (
            <VideoButton
              key={btn.key}
              def={btn}
              index={i}
              clickGuard={clickGuard}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-500 text-center mt-8">
          {cfg.getpageFooter}
        </p>
      </div>

      {/* Online counter — minimal, bottom corner */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-slate-500">
        <span className="relative inline-flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
        </span>
        <span>
          <strong className="text-emerald-400 font-bold">
            {onlineCount.toLocaleString()}
          </strong>{" "}
          watching now
        </span>
      </div>
    </div>
  );
}

function VideoButton({
  def,
  index,
  clickGuard,
}: {
  def: BtnDef;
  index: number;
  clickGuard: () => boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100 + index * 120);
    return () => clearTimeout(t);
  }, [index]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!clickGuard()) {
      e.preventDefault();
      return;
    }
    // Ripple effect
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,0.4);transform:scale(0);animation:rippleAnim 0.6s ease-out forwards;pointer-events:none;width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;z-index:0;`;
    btn.appendChild(ripple);
    setTimeout(() => {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 700);
  };

  const isPrimary = def.style === "primary";

  return (
    <a
      href={def.href}
      target={def.target || "_blank"}
      rel="noopener noreferrer"
      onClick={handleClick}
      className="relative overflow-hidden flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-300 no-underline"
      style={{
        background: isPrimary
          ? "linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)"
          : "linear-gradient(135deg, #2b3444 0%, #1e2533 100%)",
        color: "#ffffff",
        boxShadow: isPrimary
          ? "0 4px 16px rgba(37, 99, 235, 0.35)"
          : "0 4px 16px rgba(0, 0, 0, 0.3)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        animation: visible ? `fadeUp 0.5s ease-out ${index * 0.1}s both` : "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
        e.currentTarget.style.boxShadow = isPrimary
          ? "0 6px 24px rgba(37, 99, 235, 0.5)"
          : "0 6px 24px rgba(0, 0, 0, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = visible ? "translateY(0)" : "translateY(16px)";
        e.currentTarget.style.boxShadow = isPrimary
          ? "0 4px 16px rgba(37, 99, 235, 0.35)"
          : "0 4px 16px rgba(0, 0, 0, 0.3)";
      }}
    >
      <span className="text-base">{def.icon}</span>
      <span>{def.label}</span>
    </a>
  );
}
