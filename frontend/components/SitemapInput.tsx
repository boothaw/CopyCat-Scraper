"use client";

import { useState } from "react";
import { discoverArticles } from "@/lib/api";
import type { Article, DiscoverResponse } from "@/types";

interface Props {
  onDiscovered: (articles: Article[], method: DiscoverResponse["method"]) => void;
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
      onDiscovered(data.articles, data.method);
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
          className="text-sm text-[#9B8660] hover:text-[#5C4A2A] flex items-center gap-1"
        >
          ← Back
        </button>
        <h2 className="mt-3 text-2xl font-bold text-[#1C1209]">
          Discover Articles
        </h2>
        <p className="mt-1 text-[#7A6645] text-sm">
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
          className="w-full rounded-xl border border-[#C0B490] bg-[#FAF6EA] px-4 py-3 text-[#1C1209] placeholder-[#9B8660] focus:border-[#2C4A1E] focus:outline-none focus:ring-2 focus:ring-[#B8CCB0]"
        />

        {error && (
          <p className="rounded-lg bg-[#F5ECE8] px-4 py-3 text-sm text-[#8B1A2F]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#2C4A1E] px-6 py-3 font-semibold text-[#F0E8D0] transition hover:bg-[#1E3414] disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F0E8D0] border-t-transparent" />
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
