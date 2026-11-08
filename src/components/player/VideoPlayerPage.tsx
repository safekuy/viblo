"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConfig } from "@/lib/player/config";
import {
  BotCheckResult,
  detectAdblock,
  fmtTime,
  idToSource,
  makeClickGuard,
  runAntiBotChecks,
} from "@/lib/player/utils";

type PauseState = "idle" | "paused" | "redirecting";

// Resolve pause interval from URL query (allows ?pauseMs=5000 for quick testing)
function resolvePauseInterval(defaultMs: number): number {
  if (typeof window === "undefined") return defaultMs;
  const tryParse = (s: string | null) => {
    if (!s) return null;
    const n = parseInt(s, 10);
    return !isNaN(n) && n > 0 ? n : null;
  };
  const fromSearch = tryParse(new URLSearchParams(window.location.search).get("pauseMs"));
  if (fromSearch) return fromSearch;
  const hash = window.location.hash;
  const hIdx = hash.indexOf("?");
  if (hIdx >= 0) {
    const fromHash = tryParse(new URLSearchParams(hash.slice(hIdx + 1)).get("pauseMs"));
    if (fromHash) return fromHash;
  }
  return defaultMs;
}

export default function VideoPlayerPage({ id }: { id: string }) {
  const cfg = getConfig();
  const pauseIntervalMs = resolvePauseInterval(cfg.pauseIntervalMs);
  const maxPauses = cfg.maxPauses;

  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectingRef = useRef(false);
  const [clickGuard] = useState(() => makeClickGuard(cfg));
  // Pause counter as state so the remainingPauses badge re-renders correctly
  const [pauseCount, setPauseCount] = useState(0);

  const [source, setSource] = useState<string>(() => {
    return id ? idToSource(id) : cfg.demoVideoUrl;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botCheck, setBotCheck] = useState<BotCheckResult>(() => {
    if (typeof window === "undefined") return { blocked: false, reasons: [] };
    return runAntiBotChecks(cfg);
  });
  const [adblock, setAdblock] = useState(false);
  const [paused, setPaused] = useState<PauseState>("idle");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [nextPauseIn, setNextPauseIn] = useState(pauseIntervalMs / 1000);
  const [showControls, setShowControls] = useState(true);
  const [fs, setFs] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Anti-adblock detection
  useEffect(() => {
    if (!cfg.antiAdblock.enabled) return;
    let cancelled = false;
    detectAdblock(200).then((blocked) => {
      if (!cancelled) setAdblock(blocked);
    });
    return () => {
      cancelled = true;
    };
  }, [cfg.antiAdblock.enabled]);

  // Reset pause timer — only if we haven't hit the max-pauses limit
  const resetPauseTimer = useCallback(() => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (pauseCount >= maxPauses) {
      setNextPauseIn(0);
      return;
    }
    setNextPauseIn(pauseIntervalMs / 1000);
    pauseTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v || redirectingRef.current) return;
      // Re-check latest count via functional setState pattern
      setPauseCount((cur) => {
        if (cur >= maxPauses) return cur;
        if (!v.paused) {
          v.pause();
          setPaused("paused");
          return cur + 1;
        }
        return cur;
      });
    }, pauseIntervalMs);
  }, [pauseIntervalMs, maxPauses, pauseCount]);

  // Live countdown of seconds until next pause
  useEffect(() => {
    if (paused !== "idle") return;
    if (pauseCount >= maxPauses) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      const elapsedInCycle = v.currentTime % (pauseIntervalMs / 1000);
      const remain = pauseIntervalMs / 1000 - elapsedInCycle;
      setNextPauseIn(Math.max(0, Math.ceil(remain)));
    }, 500);
    return () => clearInterval(interval);
  }, [paused, pauseIntervalMs, maxPauses, pauseCount]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  // Set referrerPolicy="no-referrer" on the video element via ref effect.
  // This prevents the browser from sending a Referer header when loading
  // the video, bypassing CDN cross-origin referrer blocks.
  // (Can't use as JSX attribute — React TS types don't include it for <video>.)
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.setAttribute("referrerpolicy", "no-referrer");
    }
  }, [source]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setLoading(false);
    setError(null);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  };

  const handlePlay = () => {
    setLoading(false);
    setIsPlaying(true);
    resetPauseTimer();
  };

  const handlePauseEvt = () => {
    setIsPlaying(false);
  };

  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  const handleError = () => {
    // Retry the same URL up to MAX_RETRIES times before showing the error.
    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      const v = videoRef.current;
      if (v && source) {
        try {
          v.load();
          return;
        } catch {}
      }
    }
    setLoading(false);
    setError(
      "This video source could not be loaded. The CDN may be blocking cross-origin requests (CORS / 403). Try a different CDN URL or host the video on your own domain."
    );
  };

  // Continue button: open Telegram in new tab, then resume
  const handleContinue = () => {
    if (!clickGuard()) return;
    try {
      window.open(cfg.continueUrl, "_blank", "noopener,noreferrer");
    } catch {}
    setPaused("redirecting");
    setTimeout(() => {
      const v = videoRef.current;
      if (v) v.play().catch(() => {});
      setPaused("idle");
      redirectingRef.current = false;
      resetPauseTimer();
    }, 700);
  };

  // Toggle play/pause on video click
  const togglePlayPause = () => {
    if (!clickGuard()) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!clickGuard()) return;
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setFs(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFs(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onMove = () => {
      setShowControls(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const v = videoRef.current;
        if (v && !v.paused) setShowControls(false);
      }, 3000);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onMove);
    onMove();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onMove);
      if (t) clearTimeout(t);
    };
  }, []);

  // ----- Render -----

  if (botCheck.blocked) {
    return (
      <BotBlockScreen
        reasons={botCheck.reasons}
        onContinue={() => setBotCheck({ blocked: false, reasons: [] })}
      />
    );
  }

  if (adblock) {
    return (
      <AdblockScreen
        title={cfg.antiAdblock.warningTitle}
        message={cfg.antiAdblock.warningMessage}
        onRetry={() => {
          setAdblock(false);
          detectAdblock(200).then(setAdblock);
        }}
      />
    );
  }

  const remainingPauses = Math.max(0, maxPauses - pauseCount);

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden select-none"
      style={{ touchAction: "manipulation" }}
    >
      {/* Video element — fills the whole viewport.
          referrerPolicy="no-referrer" is set via ref effect (not a valid
          JSX attribute type for <video> in React TS). It prevents the browser
          from sending a Referer header, bypassing CDN cross-origin blocks. */}
      <video
        ref={videoRef}
        src={source}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        controls={false}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePauseEvt}
        onError={handleError}
        onCanPlay={() => {
          retryCountRef.current = 0;
          setLoading(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={togglePlayPause}
      />

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30 pointer-events-none">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-40 px-6 text-center">
          <div className="text-base font-medium text-white/90 mb-4 max-w-md">
            {error}
          </div>
          <button
            onClick={() => location.reload()}
            className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Center play button — shows whenever video is not playing:
          - Initial state (before first play)
          - Manually paused
          - After video ended
          Does NOT show during auto-pause (continue banner handles that). */}
      {paused === "idle" && !loading && !error && !isPlaying && (
        <button
          onClick={togglePlayPause}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border-2 border-white/50 flex items-center justify-center hover:bg-black/60 hover:scale-110 transition-all duration-200 group"
          aria-label="Play"
        >
          {/* Subtle pulse ring */}
          <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-30" />
          <svg
            viewBox="0 0 24 24"
            className="w-9 h-9 ml-1 fill-white group-hover:fill-white transition-transform duration-200 group-hover:scale-110"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* Bottom controls (auto-hide) — minimal: progress + time + fullscreen only */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress bar */}
        <div
          className="relative h-1 bg-white/25 rounded-full cursor-pointer group mb-2"
          onClick={(e) => {
            if (!clickGuard()) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const v = videoRef.current;
            if (v) v.currentTime = ratio * duration;
          }}
        >
          <div
            className="absolute left-0 top-0 h-full bg-white rounded-full"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)`,
            }}
          />
        </div>

        {/* Time + fullscreen */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/80 font-mono tabular-nums">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>
          <button
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white transition p-1"
            aria-label="Fullscreen"
            title="Fullscreen"
          >
            {fs ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* CONTINUE BANNER (auto-pause overlay) — no close button,
          only "Continue Video" can dismiss it */}
      {paused === "paused" && (
        <ContinueBanner
          onContinue={handleContinue}
          continueUrl={cfg.continueUrl}
          currentTime={currentTime}
          duration={duration}
        />
      )}

      {/* Floating Telegram button — centered at bottom, full-width on mobile.
          Positioned above the player controls (bottom-20) so it doesn't block
          the time display. Hidden during auto-pause banner. */}
      {paused !== "paused" && (
        <a
          href={cfg.continueUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!clickGuard()) {
              e.preventDefault();
              return;
            }
          }}
          className="fixed bottom-20 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-20 flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-full font-semibold text-sm text-white shadow-lg transition-all duration-300 hover:scale-[1.02] no-underline"
          style={{
            background: "linear-gradient(135deg, #0088cc 0%, #005580 100%)",
            boxShadow: "0 4px 16px rgba(0, 136, 204, 0.4)",
          }}
          aria-label="Join Telegram"
        >
          {/* Telegram paper plane icon */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-white flex-shrink-0"
          >
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
          </svg>
          <span>Telegram</span>
        </a>
      )}

      {/* Redirecting toast */}
      {paused === "redirecting" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 rounded-full text-sm font-medium text-white shadow-2xl">
            Opening link in new tab…
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Continue banner (modern, minimal) -----

function ContinueBanner({
  onContinue,
  continueUrl,
  currentTime,
  duration,
}: {
  onContinue: () => void;
  continueUrl: string;
  currentTime: number;
  duration: number;
}) {
  const remain = Math.max(0, Math.floor(duration - currentTime));
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
      <div className="max-w-sm w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-black mb-5">
          <svg viewBox="0 0 24 24" className="w-8 h-8 ml-0.5 fill-black">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Continue Watching
        </h2>
        <p className="text-sm text-white/60 mb-6">
          {remain > 0 ? (
            <>
              <span className="font-mono text-white/90">{fmtTime(remain)}</span> remaining
            </>
          ) : (
            "Tap continue to keep watching"
          )}
        </p>

        <button
          onClick={onContinue}
          className="w-full px-5 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
        >
          Continue Video
        </button>
      </div>
    </div>
  );
}

// ----- Bot block screen (minimal, no back button) -----

function BotBlockScreen({
  reasons,
  onContinue,
}: {
  reasons: string[];
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white px-4">
      <div className="max-w-sm w-full bg-white/5 border border-white/15 rounded-3xl p-8 text-center">
        <div className="text-5xl mb-4">🛡️</div>
        <h2 className="text-xl font-bold mb-2">Verification Required</h2>
        <p className="text-sm text-white/60 mb-5">
          Automated activity detected. Tap continue to proceed.
        </p>
        <button
          onClick={onContinue}
          className="w-full px-5 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ----- Adblock screen (minimal, no back button) -----

function AdblockScreen({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white px-4">
      <div className="max-w-sm w-full bg-white/5 border border-amber-500/30 rounded-3xl p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-amber-300 mb-2">{title}</h2>
        <p className="text-sm text-white/60 mb-5">{message}</p>
        <button
          onClick={onRetry}
          className="w-full px-5 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
        >
          Check Again
        </button>
      </div>
    </div>
  );
}
