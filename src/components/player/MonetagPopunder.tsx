"use client";

// =====================================================================
// MONETAG POPUNDER TAG (zone 10918787)
// Injects the Monetag tag exactly like the provided snippet:
//
//   <script>(function(s){s.dataset.zone='10918787',
//     s.src='https://al5sm.com/tag.min.js'})
//   ([document.documentElement, document.body].filter(Boolean).pop()
//     .appendChild(document.createElement('script')))</script>
//
// Equivalent DOM result: <script data-zone="10918787"
//   src="https://al5sm.com/tag.min.js"></script> appended to <body>.
//
// PLAYER-ONLY: this hook is called exclusively from VideoPlayerPage
// (route #/v) — never on home / article / gen / get pages.
// =====================================================================

import { useEffect } from "react";

const POPUNDER_ZONE = "10918787";
const POPUNDER_SRC = "https://al5sm.com/tag.min.js";

// Module-level guard: the tag must be appended only ONCE per full page load,
// even if the player component remounts for another video (key={route.id}).
let popunderInjected = false;

export function useMonetagPopunder() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (popunderInjected) return;

    // Extra safety: skip if the Monetag tag already exists in the DOM
    if (document.querySelector(`script[data-zone="${POPUNDER_ZONE}"]`)) {
      popunderInjected = true;
      return;
    }

    // 1:1 with the original snippet — create the script element,
    // set data-zone + src, append to <body> (falls back to <html>).
    const s = document.createElement("script");
    s.dataset.zone = POPUNDER_ZONE;
    s.src = POPUNDER_SRC;
    (document.body || document.documentElement).appendChild(s);

    popunderInjected = true;
  }, []);
}
