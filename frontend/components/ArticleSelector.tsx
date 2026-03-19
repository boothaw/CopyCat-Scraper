"use client";

import { useState, useMemo } from "react";
import type { Article } from "@/types";

interface Props {
  articles: Article[];
  onScrape: (selected: Article[]) => void;
  onBack: () => void;
}

export default function ArticleSelector({ articles, onScrape, onBack }: Props) {
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
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="mt-3 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {articles.length} Article{articles.length !== 1 ? "s" : ""} Found
          </h2>
          <div className="flex gap-3 text-sm">
            <button
              onClick={selectAll}
              className="text-blue-600 hover:underline"
            >
              Select all
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              className="text-gray-500 hover:underline"
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
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      )}

      <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No articles match your search.
          </p>
        ) : (
          filtered.map((article) => (
            <label
              key={article.url}
              className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={checked.has(article.url)}
                onChange={() => toggle(article.url)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {article.title || article.url}
                </p>
                <p className="text-xs text-gray-400 truncate">
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
          className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Scrape {selectedCount} Selected Article{selectedCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
