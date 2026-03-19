"use client";

import { useState, useMemo } from "react";
import type { Article, DiscoverResponse } from "@/types";

interface Props {
  articles: Article[];
  method?: DiscoverResponse["method"];
  onScrape: (selected: Article[]) => void;
  onBack: () => void;
}

export default function ArticleSelector({ articles, method, onScrape, onBack }: Props) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(articles.map((a) => a.url))
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return articles;
    const q = search.toLowerCase();
    return articles.filter(
      (a) =>
        (a.title ?? a.url).toLowerCase().includes(q) ||
        a.url.toLowerCase().includes(q)
    );
  }, [articles, search]);

  function toggle(url: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }

  function selectAll() {
    setChecked(new Set(articles.map((a) => a.url)));
  }

  function deselectAll() {
    setChecked(new Set());
  }

  const selectedCount = checked.size;
  const selectedArticles = articles.filter((a) => checked.has(a.url));

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-[#9B8660] hover:text-[#5C4A2A] flex items-center gap-1"
        >
          ← Back
        </button>
        {method === "crawl" && (
          <p className="mt-3 rounded-lg bg-[#F5F0DC] px-4 py-2.5 text-sm text-[#7A5C00]">
            No sitemap found — results were discovered by crawling the site. Review the list and deselect any non-article pages before scraping.
          </p>
        )}
        <div className="mt-3 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-[#1C1209]">
            {articles.length} Article{articles.length !== 1 ? "s" : ""} Found
          </h2>
          <div className="flex gap-3 text-sm">
            <button
              onClick={selectAll}
              className="text-[#2C4A1E] hover:underline"
            >
              Select all
            </button>
            <span className="text-[#C0B490]">|</span>
            <button
              onClick={deselectAll}
              className="text-[#7A6645] hover:underline"
            >
              Deselect all
            </button>
          </div>
        </div>
      </div>

      {articles.length > 10 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="w-full rounded-xl border border-[#C0B490] bg-[#FAF6EA] px-4 py-2.5 text-sm text-[#1C1209] placeholder-[#9B8660] focus:border-[#2C4A1E] focus:outline-none focus:ring-2 focus:ring-[#B8CCB0]"
        />
      )}

      <div className="max-h-96 overflow-y-auto rounded-xl border border-[#C8BC9A] divide-y divide-[#DDD5BB]">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[#9B8660]">
            No articles match your search.
          </p>
        ) : (
          filtered.map((article) => (
            <label
              key={article.url}
              className="flex cursor-pointer items-start gap-3 px-4 py-3 bg-[#FAF6EA] hover:bg-[#EDE3CC] transition"
            >
              <input
                type="checkbox"
                checked={checked.has(article.url)}
                onChange={() => toggle(article.url)}
                className="mt-0.5 h-4 w-4 rounded border-[#C0B490] accent-[#2C4A1E] cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2E1E0E] truncate">
                  {article.title || article.url}
                </p>
                <p className="text-xs text-[#9B8660] truncate">
                  {article.title ? article.url : ""}
                  {article.lastmod ? ` · ${article.lastmod.slice(0, 10)}` : ""}
                </p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="sticky bottom-0 pt-2">
        <button
          onClick={() => onScrape(selectedArticles)}
          disabled={selectedCount === 0}
          className="w-full rounded-xl bg-[#2C4A1E] px-6 py-3 font-semibold text-[#F0E8D0] transition hover:bg-[#1E3414] disabled:opacity-50"
        >
          Scrape {selectedCount} Selected Article{selectedCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
