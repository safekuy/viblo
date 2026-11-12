// =====================================================================
// PLAYER CONFIG - Centralized configuration for the upgraded xtubs player
// =====================================================================
// Edit values here only — no need to touch other files.
// =====================================================================

export type PlayerConfig = {
  // ---- SITE BASE (auto-detected at runtime) ----
  siteBase: string;

  // ---- SMARTLINK URLS (rotated across 2 button slots) ----
  smartlink1: string;
  smartlink2: string;

  // ---- TELEGRAM / CUSTOM URL (continue-banner click target) ----
  // Opened in a NEW TAB via window.open() — never navigates the player page.
  continueUrl: string;

  // ---- FACEBOOK GROUP URL ----
  facebookGroup: string;

  // ---- GET PAGE BRANDING ----
  // The title shown on the /get landing page (e.g. "Videy.co")
  getpageTitle: string;
  // The description text below the title
  getpageDescription: string;
  // The footer text (e.g. "Powered by Videy CDN")
  getpageFooter: string;

  // ---- AUTO-PAUSE INTERVAL (ms) ----
  // Video auto-pauses every N ms and shows the "Continue Watching" banner.
  pauseIntervalMs: number;

  // ---- AUTO-PAUSE MAX OCCURRENCES ----
  // Auto-pause only fires this many times, then the video plays to the end.
  // Default = 2 (first pause at 1 min, second at 2 min, then no more).
  maxPauses: number;

  // ---- DEMO VIDEO (used on home + when no ?id= provided) ----
  demoVideoUrl: string;

  // ---- ANTI-BOT ----
  antiBot: {
    enabled: boolean;
    blockHeadless: boolean;
    blockWebDriver: boolean;
    blockNoReferrer: boolean;
    blockMissingPlugins: boolean;
    blockAutomationFlags: boolean;
  };

  // ---- ANTI-ADBLOCK ----
  antiAdblock: {
    enabled: boolean;
    warningTitle: string;
    warningMessage: string;
  };

  // ---- ANTI-BOM-CLICK ----
  antiBomClick: {
    maxClicksPerSecond: number;
    cooldownMs: number;
  };

  // ---- THEME ----
  theme: "dark" | "light";

  // ---- HISTATS TRACKER (player page only) ----
  // Injects the Histats analytics/visitor-counter script on the video player
  // route (/#/v). Get your values from the Histats code they give you:
  //   _Hasync.push(['Histats.start', '1,4973582,4,0,0,0,00010000']);
  //                          userId = 4973582   startParams = 4,0,0,0,00010000
  // Leave userId empty ("") to disable the tracker even if enabled = true.
  histats: {
    enabled: boolean;
    // Numeric Histats site ID (digits only, from your Histats snippet)
    userId: string;
    // Params after the userId in Histats.start (usually "4,0,0,0,00010000")
    startParams: string;
    // Also append the 1x1 noscript-style pixel (0.gif) like the original snippet
    noscriptPixel: boolean;
  };

  // ---- SHORTLINK API (client-side, follows user's script pattern) ----
  // Pattern: try main API → if CORS fails → fall back to apiFallback (proxy)
  // The twinhd safelink API only allows CORS from twinhd.biz.id.
  // On GitHub Pages/other domains, the direct call fails (CORS) and
  // the code falls back to apiFallback — the PHP proxy on your hosting.
  //
  // Upload public/twinhd_cors.php to brightdailyhub.my.id/safe/ → it becomes
  // the apiFallback that adds CORS headers. See README → "CORS Setup".
  shortlinkApi: string;
  shortlinkApiFallback: string;
  shortlinkDomain: string;
};

const origin =
  typeof window !== "undefined" ? window.location.origin + "/" : "/";

export const PLAYER_CONFIG: PlayerConfig = {
  siteBase: origin,

  // Two smartlink slots (button positions auto-rotate at every load)
  smartlink1: "https://uplcm.com/4/10913282",
  smartlink2: "https://t.co/2B09csizQY",

  // Continue-banner click → opens Telegram (or any custom URL) in a new tab
  continueUrl: "https://t.co/k0VQLDnRI8",

  // Facebook group
  facebookGroup: "https://www.facebook.com/share/g/1bNTtsiAsX/",

  // Get page branding (matches Videy.co style)
  getpageTitle: "Videy.co",
  getpageDescription:
    "Video is ready to play. If one link doesn't work, try another available link below 👇",
  getpageFooter: "Powered by Videy CDN",

  // Auto-pause every 30 seconds (first pause at 30s, second at 60s, then no more)
  pauseIntervalMs: 30_000,

  // Auto-pause only fires 2 times total (at 30s and 60s), then no more
  maxPauses: 2,

  // Demo video — a reliably-streamable MP4 (Video.js demo CDN, allows CORS)
  demoVideoUrl: "https://vjs.zencdn.net/v/oceans.mp4",

  antiBot: {
    enabled: true,
    blockHeadless: true,
    blockWebDriver: true,
    blockNoReferrer: true,
    blockMissingPlugins: true,
    blockAutomationFlags: true,
  },

  antiAdblock: {
    enabled: true,
    warningTitle: "Adblock Detected",
    warningMessage:
      "Please disable your adblocker to watch the video. Refresh the page after disabling it.",
  },

  antiBomClick: {
    maxClicksPerSecond: 3,
    cooldownMs: 800,
  },

  theme: "dark",

  // Shortlink API — twinhd.biz.id safelink system
  // The API must have CORS headers to allow requests from your domain.
  // Add these 4 lines to the TOP of twinhd_safe.php (after <?php):
  //   header('Access-Control-Allow-Origin: *');
  //   header('Access-Control-Allow-Methods: POST, OPTIONS');
  //   header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
  //   if ($_SERVER['REQUEST_METHOD']=='OPTIONS'){http_response_code(200);exit(0);}
  shortlinkApi: "https://brightdailyhub.my.id/safe/twinhd_safe.php",
  shortlinkApiFallback: "",
  shortlinkDomain: "https://twinhd.biz.id",

  // Histats tracker — paste YOUR Histats ID here (digits only).
  // Example: Histats.start '1,4973582,4,0,0,0,00010000' → userId: "4973582"
  histats: {
    enabled: true,
    userId: "4996898", // ← GANTI dengan ID Histats kamu (angka saja)
    startParams: "4,0,0,0,00010000",
    noscriptPixel: true,
  },
};

// Helper to read config at runtime (so siteBase reflects current origin)
export function getConfig(): PlayerConfig {
  if (typeof window !== "undefined") {
    // For GitHub Pages, the app may be in a subdirectory (e.g. /repo-name/).
    // Use the full pathname (without hash) as the base URL so generated
    // player/landing URLs work correctly from any deployment path.
    const path = window.location.pathname;
    // Normalize: ensure trailing slash
    const normalizedPath = path.endsWith("/") ? path : path + "/";
    return {
      ...PLAYER_CONFIG,
      siteBase: window.location.origin + normalizedPath,
    };
  }
  return PLAYER_CONFIG;
}
