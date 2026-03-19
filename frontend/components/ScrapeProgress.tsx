"use client";

import { useEffect, useRef, useState } from "react";
import { streamScrape } from "@/lib/api";
import type { Article, SseEvent } from "@/types";

interface DonePayload {
  file_id: string | null;
  success_count: number;
  error_count: number;
  errors: string[];
}

interface Props {
  articles: Article[];
  onDone: (payload: DonePayload) => void;
}

export default function ScrapeProgress({ articles, onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("Starting…");
  const [errorCount, setErrorCount] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const total = articles.length;
  const cancelRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const urls = articles.map((a) => a.url);
    let localErrors = 0;

    const cancel = streamScrape(
      urls,
      (event: SseEvent) => {
        if (event.type === "progress") {
          setCurrent(event.current);
          setCurrentTitle(event.title);
        } else if (event.type === "error") {
          setCurrent((c) => c + 1);
          localErrors += 1;
          setErrorCount(localErrors);
        } else if (event.type === "done") {
          onDone(event);
        }
      },
      (err) => setStreamError(err.message)
    );

    cancelRef.current = cancel;
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Scraping Articles</h2>
        <p className="mt-1 text-sm text-gray-500">
          Please wait — this may take a few minutes for large batches.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{current} of {total}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 truncate">
          {current < total ? `Scraping: ${currentTitle}` : "Building document…"}
        </p>
      </div>

      {errorCount > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {errorCount} article{errorCount !== 1 ? "s" : ""} could not be scraped and will be skipped.
        </p>
      )}

      {streamError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          Connection error: {streamError}
        </p>
      )}

      {current < total && (
        <p className="text-xs text-center text-gray-400">
          Do not close this tab while scraping is in progress.
        </p>
      )}
    </div>
  );
}
