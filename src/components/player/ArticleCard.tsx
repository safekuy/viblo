"use client";

// =====================================================================
// ARTICLE CARD — thumbnail card used by the homepage grid (#/) and the
// "More articles" section of the reading page (#/article/<id>).
// Clicking a card opens the full article page. No other logic here.
// =====================================================================

import { navigate } from "@/lib/player/utils";
import type { Article } from "@/components/player/articles";

export default function ArticleCard({
  article,
  compact = false,
}: {
  article: Article;
  compact?: boolean;
}) {
  return (
    <button
      onClick={() => navigate(`/article/${article.id}`)}
      className="group text-left focus:outline-none"
    >
      <div className="aspect-[16/9] overflow-hidden rounded-lg bg-neutral-100">
        <img
          src={article.image}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <h3
        className={
          "mt-3 font-bold leading-snug tracking-tight text-neutral-900 group-hover:underline " +
          (compact ? "text-sm line-clamp-2" : "text-[15px] line-clamp-3")
        }
      >
        {article.title}
      </h3>
      <p className="mt-2 text-xs text-neutral-500">{article.date}</p>
    </button>
  );
}
