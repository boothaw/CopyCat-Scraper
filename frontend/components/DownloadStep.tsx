"use client";

import { useState } from "react";
import { downloadUrl } from "@/lib/api";

interface Props {
  fileId: string | null;
  successCount: number;
  errorCount: number;
  failedUrls: string[];
  onReset: () => void;
}

export default function DownloadStep({
  fileId,
  successCount,
  errorCount,
  failedUrls,
  onReset,
}: Props) {
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-4xl">
          ✅
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Done!</h2>
        <p className="text-gray-500 text-sm">
          {successCount} article{successCount !== 1 ? "s" : ""} exported
          {errorCount > 0 && ` · ${errorCount} failed`}
        </p>
      </div>

      {fileId ? (
        <a
          href={downloadUrl(fileId)}
          download
          className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-green-700 shadow-md"
        >
          ⬇ Download .docx
        </a>
      ) : (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          No content was successfully scraped. Please try again.
        </p>
      )}

      <p className="text-xs text-gray-400">
        Open the .docx file in Google Docs: File → Open → Upload the file.
      </p>

      {errorCount > 0 && (
        <div className="text-left">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {showErrors ? "Hide" : "Show"} {errorCount} failed URL{errorCount !== 1 ? "s" : ""}
          </button>
          {showErrors && (
            <ul className="mt-2 space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-4 max-h-40 overflow-y-auto">
              {failedUrls.map((url) => (
                <li key={url} className="text-xs text-gray-500 truncate">
                  {url}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
      >
        Start Over
      </button>
    </div>
  );
}
