"use client";

// =====================================================================
// HOMEPAGE — NEWS-STYLE ARTICLE GRID (#/)
// Layout follows a regular tech-magazine "Latest" page: a responsive
// grid of thumbnail cards (image + title + date), filterable by
// category. Every card opens a dedicated reading page at
// #/article/<id>.
//
// IMPORTANT (by design):
// - The generator/tools feature is NOT shown or linked anywhere on
//   this page — it stays available only via its own URL (#/gen).
// - All functional features of the app (player #/v, landing #/get,
//   Histats, anti-bot, anti-adblock, auto-pause, shortlinks) are
//   untouched.
// =====================================================================

import { useMemo, useState } from "react";
import { ARTICLES, CATEGORIES } from "@/components/player/articles";
import ArticleCard from "@/components/player/ArticleCard";

const NAV_ITEMS = ["Latest", ...CATEGORIES];

export default function HomePage() {
  const [category, setCategory] = useState<string>("Latest");

  const shown = useMemo(
    () =>
      category === "Latest"
        ? ARTICLES
        : ARTICLES.filter((a) => a.tag === category),
    [category]
  );

  const heading = category === "Latest" ? "Latest" : category;

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setCategory("Latest")}
            className="flex items-center gap-2 text-left"
          >
            <span className="rounded bg-neutral-900 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              Viblo
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Tech Articles
            </span>
          </button>
          <nav className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
            {NAV_ITEMS.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={
                  "whitespace-nowrap rounded-full px-3 py-1.5 transition " +
                  (category === c
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900")
                }
              >
                {c}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-8">
          <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 text-xs text-neutral-500">
            {shown.length} articles · updated regularly
          </p>

          {/* Article grid — image + title + date, like a news portal */}
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {shown.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-xs text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
          <span>© 2026 Viblo · Tech guides, streaming tips & digital how-tos</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="transition hover:text-neutral-900"
          >
            Back to top ↑
          </button>
        </div>
      </footer>
    </div>
  );
}
