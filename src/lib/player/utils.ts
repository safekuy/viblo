// =====================================================================
// PLAYER UTILITIES
// - URL encode/decode (base64url) with raw-URL fallback
// - Anti-bot detection
// - Anti-adblock detection (bait div)
// - Anti-bom-click guard (sliding-window rate limiter)
// - Hash router helpers
// =====================================================================

import { getConfig, PlayerConfig } from "./config";

// ---------------------------------------------------------------------
// ENCODE / DECODE
// ---------------------------------------------------------------------
// We use raw URL encoding (encodeURIComponent) so the id parameter
// matches the spec format:  ?id=https://video.twimg.com/...mp4?tag=29
//
// The decoder is backward-compatible: it also accepts legacy base64url
// strings (in case older links are still in the wild).

export function encodeId(src: string): string {
  if (!src) return "";
  return encodeURIComponent(src);
}

export function decodeId(id: string): string {
  if (!id) return "";

  // 1) Try raw URL decode first (current format)
  let urlDecoded = id;
  try {
    urlDecoded = decodeURIComponent(id);
  } catch {
    /* keep raw */
  }
  if (/^https?:\/\//i.test(urlDecoded)) return urlDecoded;

  // 2) Legacy fallback: base64url decode
  try {
    let s = id.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const decoded = decodeURIComponent(escape(atob(s)));
    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch {
    /* fall through */
  }

  // 3) Last resort: return whatever we have
  return urlDecoded;
}

// Build a player URL:  <siteBase>#/v?id=<encoded>
export function buildPlayerUrl(src: string, cfg?: PlayerConfig): string {
  const c = cfg || getConfig();
  return `${c.siteBase}#/v?id=${encodeId(src)}`;
}

// Build a get/button-page URL:  <siteBase>#/get?id=<encoded>
export function buildGetUrl(src: string, cfg?: PlayerConfig): string {
  const c = cfg || getConfig();
  return `${c.siteBase}#/get?id=${encodeId(src)}`;
}

// ---------------------------------------------------------------------
// HASH ROUTER HELPERS
// ---------------------------------------------------------------------
export type Route =
  | { name: "home" }
  | { name: "generate" }
  | { name: "v"; id: string }
  | { name: "get"; id: string }
  | { name: "unknown" };

export function parseHash(hash?: string): Route {
  let h = hash ?? (typeof window !== "undefined" ? window.location.hash : "");
  if (!h) return { name: "home" };
  if (h.startsWith("#")) h = h.slice(1);
  if (!h || h === "/" || h === "/home") return { name: "home" };

  // Split path and query
  const qIdx = h.indexOf("?");
  let path = qIdx >= 0 ? h.slice(0, qIdx) : h;
  let query = qIdx >= 0 ? h.slice(qIdx + 1) : "";
  if (!path.startsWith("/")) path = "/" + path;

  const params = new URLSearchParams(query);
  const id = params.get("id") || "";

  if (path === "/generate") return { name: "generate" };
  if (path === "/v") return { name: "v", id };
  if (path === "/get") return { name: "get", id };
  return { name: "unknown" };
}

export function navigate(path: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("#")) path = "#" + path;
  if (window.location.hash !== path) {
    window.location.hash = path;
  } else {
    // Force hashchange event even if same
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

// ---------------------------------------------------------------------
// ANTI-BOT DETECTION
// ---------------------------------------------------------------------
export type BotCheckResult = {
  blocked: boolean;
  reasons: string[];
};

export function runAntiBotChecks(cfg?: PlayerConfig): BotCheckResult {
  const c = cfg || getConfig();
  const reasons: string[] = [];

  if (!c.antiBot.enabled) return { blocked: false, reasons };

  // 1) navigator.webdriver (Selenium / Puppeteer / Playwright)
  if (c.antiBot.blockWebDriver) {
    const wd = (navigator as any).webdriver;
    if (wd === true || wd === 1) reasons.push("WebDriver flag detected");
  }

  // 2) Headless Chrome / PhantomJS user-agent
  if (c.antiBot.blockHeadless) {
    const ua = navigator.userAgent || "";
    if (/HeadlessChrome/i.test(ua)) reasons.push("Headless browser UA");
    if (/PhantomJS/i.test(ua)) reasons.push("PhantomJS detected");
    if (/SlimerJS/i.test(ua)) reasons.push("SlimerJS detected");
  }

  // 3) Missing plugins (headless Chrome has none)
  if (c.antiBot.blockMissingPlugins) {
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    const plugins = navigator.plugins || ({} as any);
    const pluginLen = (plugins && (plugins as any).length) || 0;
    if (isChrome && pluginLen === 0) {
      // Some legit Chrome users have 0 plugins; only flag if other signals exist.
      // We do NOT push by itself to avoid false positives.
    }
  }

  // 4) No referrer on a video page (often bots)
  if (c.antiBot.blockNoReferrer) {
    // We allow direct entry; this is just a soft signal.
    // Don't block on referrer alone — too many false positives.
  }

  // 5) Automation flags — window.cdc_... (ChromeDriver), _$trueValue (Playwright)
  if (c.antiBot.blockAutomationFlags) {
    const w = window as any;
    const autoKeys = Object.keys(w).filter((k) =>
      /^cdc_|_Recaptcha|__nightmare|_selenium|callPhantom|callSelenium|webdriver$|driver_evaluate$/.test(
        k
      )
    );
    if (autoKeys.length > 0) reasons.push("Automation marker: " + autoKeys.join(", "));
  }

  // 6) Permissions API: notifications permission in headless is "denied" by default and unmatched
  // (skipped — too unreliable)

  return { blocked: reasons.length > 0, reasons };
}

// ---------------------------------------------------------------------
// ANTI-ADBLOCK DETECTION (bait div)
// ---------------------------------------------------------------------
export function detectAdblock(timeoutMs = 150): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(false);
    try {
      const bait = document.createElement("div");
      bait.className =
        "ad-banner ads ad-placement google-ad adsbox pub_300x250 pub_300x250m";
      bait.setAttribute(
        "style",
        "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;"
      );
      bait.innerHTML = "&nbsp;";
      document.body.appendChild(bait);
      setTimeout(() => {
        try {
          const style = window.getComputedStyle(bait);
          const blocked =
            bait.offsetParent === null ||
            bait.offsetHeight === 0 ||
            bait.offsetWidth === 0 ||
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0";
          bait.remove();
          resolve(blocked);
        } catch {
          bait.remove();
          resolve(false);
        }
      }, timeoutMs);
    } catch {
      resolve(false);
    }
  });
}

// ---------------------------------------------------------------------
// ANTI-BOM-CLICK GUARD (sliding window rate limiter)
// ---------------------------------------------------------------------
export function makeClickGuard(cfg?: PlayerConfig) {
  const c = cfg || getConfig();
  const max = c.antiBomClick.maxClicksPerSecond;
  const windowMs = 1000;
  const cooldown = c.antiBomClick.cooldownMs;
  const timestamps: number[] = [];
  let lastAllowed = 0;

  return function allowClick(): boolean {
    const now = Date.now();
    // Drop old timestamps outside the sliding window
    while (timestamps.length && now - timestamps[0] > windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= max) {
      // Too many clicks in 1s → block
      return false;
    }
    if (now - lastAllowed < cooldown) {
      // Per-click cooldown not elapsed → block
      return false;
    }
    timestamps.push(now);
    lastAllowed = now;
    return true;
  };
}

// ---------------------------------------------------------------------
// SMALL HELPERS
// ---------------------------------------------------------------------
export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// Format seconds → mm:ss
export function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
}

// Decode a route.id safely to a source URL (for the player / get pages)
export function idToSource(id: string): string {
  if (!id) return "";
  const decoded = decodeId(id);
  if (/^https?:\/\//i.test(decoded)) return decoded;
  return decoded;
}

// ---------------------------------------------------------------------
// SHORTLINK CREATION (client-side, follows user's script pattern)
// ---------------------------------------------------------------------
// Pattern from user's working script:
//   1. Try main API (cfg.shortlinkApi) directly
//   2. If CORS fails ("Failed to fetch"), switch to apiFallback (proxy)
//   3. Retry up to 5 times per endpoint with new random codes
//   4. Shortlink format: https://twinhd.biz.id/#<5-char-code>
//
// The apiFallback is the PHP CORS proxy (twinhd_cors.php) on the user's
// hosting. Upload it once → shortlinks work from any domain.

function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 7);
}

function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs = 12000
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (ctrl) ctrl.abort();
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
    const finalOpts = ctrl ? { ...opts, signal: ctrl.signal } : opts;
    fetch(url, finalOpts)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function createShortlink(targetUrl: string): Promise<{
  shortlink: string;
  code: string;
  original: string;
}> {
  const cfg = getConfig();

  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    throw new Error("Valid URL is required");
  }

  // ─── Try 1: Server-side API route (works in dev/preview only) ───
  // In dev mode (npm run dev), the Next.js dev server runs this route
  // server-side → no CORS restrictions → works from any domain.
  // In static export (GitHub Pages), this route returns 404 → falls through.
  try {
    const res = await fetchWithTimeout("/api/shortlink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
    }, 15000);
    if (res.ok) {
      const data = await res.json();
      if (data.shortlink) {
        return {
          shortlink: data.shortlink,
          code: data.code || "",
          original: targetUrl,
        };
      }
    }
    // If not ok (404 in production), fall through to client-side
  } catch {
    // Fall through to client-side
  }

  // ─── Try 2: Client-side direct API + PHP proxy fallback ───
  // Pattern from user's script: try direct API → if CORS fails → try proxy
  const endpoints = [cfg.shortlinkApi];
  if (cfg.shortlinkApiFallback) {
    endpoints.push(cfg.shortlinkApiFallback);
  }

  return new Promise((resolve, reject) => {
    let attempts = 0;
    let endpointIdx = 0;

    function tryOnce() {
      if (attempts >= 5) {
        reject(new Error("Failed after 5 attempts. Check API/CORS/proxy."));
        return;
      }
      if (endpointIdx >= endpoints.length) {
        reject(new Error("All endpoints failed (CORS or proxy not uploaded)."));
        return;
      }

      attempts++;
      const code = generateShortCode();
      const endpoint = endpoints[endpointIdx];

      fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_link", code, url: targetUrl }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then((data) => {
          if (data && data.success && data.data) {
            resolve({
              code: data.data.code,
              shortlink: `${cfg.shortlinkDomain}/#${data.data.code}`,
              original: targetUrl,
            });
          } else {
            tryOnce();
          }
        })
        .catch((err) => {
          const msg = String((err as Error).message || err);
          if (
            msg === "TIMEOUT" ||
            /Failed to fetch|NetworkError|Load failed|abort/i.test(msg)
          ) {
            endpointIdx++;
            attempts = 0;
            tryOnce();
          } else {
            reject(new Error(msg));
          }
        });
    }

    tryOnce();
  });
}
