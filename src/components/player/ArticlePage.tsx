"use client";

// =====================================================================
// ARTICLE READING PAGE — #/article/<id>
// Presents one article as a proper, readable information page (like a
// regular website): category chip, date, headline, hero image, full
// body text, and related articles at the bottom. Light magazine theme
// matching the homepage grid. The generator/tools feature is NOT
// linked here; all functional features elsewhere remain untouched.
// =====================================================================

import { ARTICLES, getArticle } from "@/components/player/articles";
import ArticleCard from "@/components/player/ArticleCard";
import { navigate } from "@/lib/player/utils";

export default function ArticlePage({ id }: { id: string }) {
  const article = getArticle(id);

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-neutral-900">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-24">
          <div className="text-center">
            <p className="text-5xl">📰</p>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
              Article not found
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              The story you are looking for may have been moved or unpublished.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              ← Back to all articles
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Related: same category first, then the freshest from everywhere else
  const related = [
    ...ARTICLES.filter((a) => a.tag === article.tag && a.id !== article.id),
    ...ARTICLES.filter((a) => a.tag !== article.tag && a.id !== article.id),
  ].slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 pb-4 pt-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              {article.tag}
            </span>
            <span className="text-xs text-neutral-500">{article.date}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>

          <div className="mt-6 overflow-hidden rounded-xl bg-neutral-100">
            <img
              src={article.image}
              alt={article.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>

          <div className="mt-8 space-y-6">
            {article.paragraphs.map((p, i) => (
              <p
                key={i}
                className={
                  "text-neutral-800 " +
                  (i === 0
                    ? "text-lg leading-8"
                    : "text-[16.5px] leading-8")
                }
              >
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 border-t border-neutral-200 pt-6">
            <button
              onClick={() => navigate("/")}
              className="text-sm font-semibold text-neutral-600 transition hover:text-neutral-900"
            >
              ← Back to all articles
            </button>
          </div>
        </article>

        {/* Related reading */}
        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-extrabold uppercase tracking-tight">
            More from Viblo
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} compact />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-left">
          <span className="rounded bg-neutral-900 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Viblo
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Tech Articles
          </span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
        >
          ← All articles
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
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
  );
}
