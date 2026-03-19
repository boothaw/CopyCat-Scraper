"use client";

import type { ScrapeMode } from "@/types";

interface Props {
  onSelect: (mode: ScrapeMode) => void;
}

export default function UrlModeSelector({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Content Scraper</h1>
        <p className="mt-2 text-gray-500">
          Extract article content from any website and download as a Word doc.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 w-full max-w-2xl">
        <button
          onClick={() => onSelect("sitemap")}
          className="group flex flex-col gap-3 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xl">
            🌐
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">
              Scrape Full Site
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter a website URL and we'll automatically discover all articles
              via the sitemap.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-blue-600 group-hover:underline">
            Get started →
          </span>
        </button>

        <button
          onClick={() => onSelect("manual")}
          className="group flex flex-col gap-3 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-xl">
            📋
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">
              Enter Specific URLs
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Paste a list of specific article URLs to scrape — one per line.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-purple-600 group-hover:underline">
            Get started →
          </span>
        </button>
      </div>
    </div>
  );
}
