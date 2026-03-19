"use client";

import { useState } from "react";
import UrlModeSelector from "@/components/UrlModeSelector";
import SitemapInput from "@/components/SitemapInput";
import ManualUrlInput from "@/components/ManualUrlInput";
import ArticleSelector from "@/components/ArticleSelector";
import ScrapeProgress from "@/components/ScrapeProgress";
import DownloadStep from "@/components/DownloadStep";
import type { Article, DiscoverResponse, ScrapeMode, WizardStep } from "@/types";

interface DoneState {
  fileId: string | null;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export default function Home() {
  const [step, setStep] = useState<WizardStep>(0);
  const [mode, setMode] = useState<ScrapeMode>("sitemap");
  const [articles, setArticles] = useState<Article[]>([]);
  const [discoverMethod, setDiscoverMethod] = useState<DiscoverResponse["method"]>("sitemap");
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const [doneState, setDoneState] = useState<DoneState | null>(null);

  function handleModeSelect(m: ScrapeMode) {
    setMode(m);
    setStep(1);
  }

  function handleDiscovered(found: Article[], method: DiscoverResponse["method"] = "sitemap") {
    setArticles(found);
    setDiscoverMethod(method);
    setStep(2);
  }

  function handleScrape(selected: Article[]) {
    setSelectedArticles(selected);
    setStep(3);
  }

  function handleDone(payload: {
    file_id: string | null;
    success_count: number;
    error_count: number;
    errors: string[];
  }) {
    setDoneState({
      fileId: payload.file_id,
      successCount: payload.success_count,
      errorCount: payload.error_count,
      errors: payload.errors,
    });
    setStep(4);
  }

  function handleReset() {
    setStep(0);
    setMode("sitemap");
    setArticles([]);
    setSelectedArticles([]);
    setDoneState(null);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        {step > 0 && step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition ${
                    step >= s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-px w-8 transition ${
                      step > s ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-xs text-gray-400">
              {step === 1 && (mode === "sitemap" ? "Enter website URL" : "Paste URLs")}
              {step === 2 && "Select articles"}
              {step === 3 && "Scraping…"}
            </span>
          </div>
        )}

        {/* Wizard steps */}
        {step === 0 && <UrlModeSelector onSelect={handleModeSelect} />}

        {step === 1 && mode === "sitemap" && (
          <SitemapInput
            onDiscovered={handleDiscovered}
            onBack={() => setStep(0)}
          />
        )}

        {step === 1 && mode === "manual" && (
          <ManualUrlInput
            onContinue={handleDiscovered}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && (
          <ArticleSelector
            articles={articles}
            method={discoverMethod}
            onScrape={handleScrape}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <ScrapeProgress articles={selectedArticles} onDone={handleDone} />
        )}

        {step === 4 && doneState && (
          <DownloadStep
            fileId={doneState.fileId}
            successCount={doneState.successCount}
            errorCount={doneState.errorCount}
            failedUrls={doneState.errors}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}
