"use client";

import { useState } from "react";
import { discoverArticles } from "@/lib/api";
import type { Article } from "@/types";

interface Props {
  onDiscovered: (articles: Article[]) => void;
  onBack: () => void;
}

export default function SitemapInput({ onDiscovered, onBack }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await discoverArticles(url.trim());
      onDiscovered(data.articles);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← Back
        </button>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">
          Discover Articles
        </h2>
        <p className="mt-1 text-gray-500 text-sm">
          Enter a website homepage URL. We'll find the sitemap and list all
          articles automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Discovering articles…
            </>
          ) : (
            "Find Articles"
          )}
        </button>
      </form>
    </div>
  );
}
