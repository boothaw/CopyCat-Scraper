"use client";

import { useState } from "react";
import type { Article } from "@/types";

interface Props {
  onContinue: (articles: Article[]) => void;
  onBack: () => void;
}

export default function ManualUrlInput({ onContinue, onBack }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parseUrls(raw: string): Article[] {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        try {
          new URL(line);
          return true;
        } catch {
          return false;
        }
      })
      .map((url) => ({ url, title: null, lastmod: null }));
  }

  function handleContinue() {
    const articles = parseUrls(text);
    if (articles.length === 0) {
      setError("No valid URLs found. Please enter at least one URL per line.");
      return;
    }
    setError(null);
    onContinue(articles);
  }

  const validCount = parseUrls(text).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← Back
        </button>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">Enter URLs</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Paste article URLs below — one per line.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          rows={12}
          placeholder={"https://example.com/blog/post-1\nhttps://example.com/blog/post-2\nhttps://example.com/blog/post-3"}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
        {validCount > 0 && (
          <p className="text-xs text-gray-400">{validCount} valid URL{validCount !== 1 ? "s" : ""} detected</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={validCount === 0}
        className="flex items-center justify-center rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
      >
        Continue with {validCount > 0 ? validCount : ""} URL{validCount !== 1 ? "s" : ""}
      </button>
    </div>
  );
}
