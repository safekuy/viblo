"use client";

// =====================================================================
// HISTATS TRACKER HOOK
// Injects the standard Histats async snippet into the page once.
// Mirrors the official Histats code:
//
//   var _Hasync = _Hasync || [];
//   _Hasync.push(['Histats.start', '1,<USER_ID>,<START_PARAMS>']);
//   _Hasync.push(['Histats.fasi', '1']);
//   _Hasync.push(['Histats.track_hits', '']);
//   (function() {
//     var hs = document.createElement('script'); hs.async = true;
//     hs.src = ('//s10.histats.com/js15_as.js');
//     (document.head || document.body).appendChild(hs);
//   })();
//
// Configuration lives in src/lib/player/config.ts → PLAYER_CONFIG.histats
// =====================================================================

import { useEffect } from "react";
import { getConfig } from "@/lib/player/config";

// Module-level guard: Histats only needs to start ONCE per full page load,
// even if the player component remounts for different videos (route key).
let histatsInjected = false;

export function useHistatsTracker() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (histatsInjected) return;

    const cfg = getConfig();
    const h = cfg.histats;

    // Respect the kill-switches
    if (!h.enabled || !h.userId) return;
    // Extra safety: skip if a Histats script tag already exists in the DOM
    if (document.querySelector('script[src*="histats.com"]')) {
      histatsInjected = true;
      return;
    }

    // 1) Build the _Hasync queue (reuse an existing one if present)
    const w = window as any;
    w._Hasync = w._Hasync || [];
    w._Hasync.push(["Histats.start", `1,${h.userId},${h.startParams}`]);
    w._Hasync.push(["Histats.fasi", "1"]);
    w._Hasync.push(["Histats.track_hits", ""]);

    // 2) Inject the Histats async script (same as the official snippet)
    const hs = document.createElement("script");
    hs.type = "text/javascript";
    hs.async = true;
    hs.src = "//s10.histats.com/js15_as.js";
    (document.getElementsByTagName("head")[0] ||
      document.getElementsByTagName("body")[0]
    ).appendChild(hs);

    // 3) Optional 1x1 pixel — equivalent of the <noscript> part of the
    //    official snippet, appended as a hidden img so it still fires.
    if (h.noscriptPixel) {
      const img = document.createElement("img");
      img.src = `//sstatic1.histats.com/0.gif?${h.userId}&101`;
      img.alt = "";
      img.width = 1;
      img.height = 1;
      img.style.cssText =
        "position:absolute;left:-9999px;top:-9999px;border:0;display:none;";
      img.setAttribute("aria-hidden", "true");
      document.body.appendChild(img);
    }

    histatsInjected = true;
  }, []);
}
