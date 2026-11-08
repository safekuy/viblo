"use client";

import dynamic from "next/dynamic";

// Load the app with ssr: false — this completely skips server-side rendering
// of the app content. The server sends only a minimal loading shell, and the
// client renders everything. This eliminates ALL hydration mismatches caused
// by browser extensions (Bitdefender, adblockers) injecting attributes like
// bis_skin_checked="1" into the server-rendered HTML.
const App = dynamic(() => import("@/components/player/App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  return <App />;
}
