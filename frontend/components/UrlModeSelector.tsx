"use client";

import type { ScrapeMode } from "@/types";

interface Props {
  onSelect: (mode: ScrapeMode) => void;
}

export default function UrlModeSelector({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#1C1209]">CopyCat Scraper</h1>
        <p className="mt-2 text-[#7A6645]">
          Extract content from any website and download as a Word doc.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 w-full max-w-2xl">
        <button
          onClick={() => onSelect("sitemap")}
          className="group flex flex-col gap-3 rounded-2xl border-2 border-[#C8BC9A] bg-[#FAF6EA] p-6 text-left shadow-sm transition hover:border-[#2C4A1E] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2C4A1E]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8EFE0] text-xl">
            🌐
          </div>
          <div>
            <h2 className="font-semibold text-[#1C1209] text-lg">
              Scrape Full Site
            </h2>
            <p className="mt-1 text-sm text-[#7A6645]">
              Enter a website URL and we'll automatically discover all articles
              via the sitemap.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-[#2C4A1E] group-hover:underline">
            Get started →
          </span>
        </button>

        <button
          onClick={() => onSelect("manual")}
          className="group flex flex-col gap-3 rounded-2xl border-2 border-[#C8BC9A] bg-[#FAF6EA] p-6 text-left shadow-sm transition hover:border-[#5C2D45] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5C2D45]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E8EC] text-xl">
            📋
          </div>
          <div>
            <h2 className="font-semibold text-[#1C1209] text-lg">
              Enter Specific URLs
            </h2>
            <p className="mt-1 text-sm text-[#7A6645]">
              Paste a list of specific article URLs to scrape — one per line.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-[#5C2D45] group-hover:underline">
            Get started →
          </span>
        </button>
      </div>
    </div>
  );
}
