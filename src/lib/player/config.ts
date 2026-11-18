export type PlayerConfig = {
  siteBase: string;
  smartlink1: string;
  smartlink2: string;
  continueUrl: string;
  facebookGroup: string;
  getpageTitle: string;
  getpageDescription: string;
  getpageFooter: string;
  pauseIntervalMs: number;
  maxPauses: number;
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

  histats: {
    enabled: boolean;
    userId: string;
    startParams: string;
    noscriptPixel: boolean;
  };
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
  smartlink2: "https://uplcm.com/4/10913282",

  // Continue-banner click → opens Telegram (or any custom URL) in a new tab
  continueUrl: "https://t.me/xvideyku",

  // Facebook group
  facebookGroup: "https://t.me/xvideyku",

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

  shortlinkApi: "https://brightdailyhub.my.id/safe/twig_safe.php",
  shortlinkApiFallback: "",
  shortlinkDomain: "https://twig.biz.id",

  histats: {
    enabled: true,
    userId: "4996898", 
    startParams: "4,0,0,0,00010000",
    noscriptPixel: true,
  },
};

export function getConfig(): PlayerConfig {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const normalizedPath = path.endsWith("/") ? path : path + "/";
    return {
      ...PLAYER_CONFIG,
      siteBase: window.location.origin + normalizedPath,
    };
  }
  return PLAYER_CONFIG;
}
