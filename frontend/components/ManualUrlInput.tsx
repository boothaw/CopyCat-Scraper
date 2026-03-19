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
          className="text-sm text-[#9B8660] hover:text-[#5C4A2A] flex items-center gap-1"
        >
          ← Back
        </button>
        <h2 className="mt-3 text-2xl font-bold text-[#1C1209]">Enter URLs</h2>
        <p className="mt-1 text-[#7A6645] text-sm">
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
          className="w-full rounded-xl border border-[#C0B490] bg-[#FAF6EA] px-4 py-3 font-mono text-sm text-[#1C1209] placeholder-[#9B8660] focus:border-[#2C4A1E] focus:outline-none focus:ring-2 focus:ring-[#B8CCB0] resize-y"
        />
        {validCount > 0 && (
          <p className="text-xs text-[#9B8660]">{validCount} valid URL{validCount !== 1 ? "s" : ""} detected</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-[#F5ECE8] px-4 py-3 text-sm text-[#8B1A2F]">
          {error}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={validCount === 0}
        className="flex items-center justify-center rounded-xl bg-[#5C2D45] px-6 py-3 font-semibold text-[#F0E8D0] transition hover:bg-[#441E31] disabled:opacity-50"
      >
        Continue with {validCount > 0 ? validCount : ""} URL{validCount !== 1 ? "s" : ""}
      </button>
    </div>
  );
}
