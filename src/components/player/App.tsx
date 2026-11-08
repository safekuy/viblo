"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { parseHash } from "@/lib/player/utils";
import HomePage from "@/components/player/HomePage";
import GeneratePage from "@/components/player/GeneratePage";
import VideoPlayerPage from "@/components/player/VideoPlayerPage";
import GetPage from "@/components/player/GetPage";

// External store: subscribe to window.location.hash changes (SPA hash-router)
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function getHash() {
  return window.location.hash;
}

export default function App() {
  // No SSR — this component only loads on the client (via next/dynamic ssr:false)
  const hash = useSyncExternalStore(subscribeHash, getHash, getHash);
  const route = useMemo(() => parseHash(hash), [hash]);

  // Scroll to top on hash change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  switch (route.name) {
    case "home":
      return <HomePage />;
    case "generate":
      return <GeneratePage />;
    case "v":
      return <VideoPlayerPage key={route.id} id={route.id} />;
    case "get":
      return <GetPage key={route.id} id={route.id} />;
    default:
      return <HomePage />;
  }
}
