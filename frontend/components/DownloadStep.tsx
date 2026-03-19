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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/morticia-copycat.png"
          alt="A distinguished cat librarian in cat-eye glasses and pearls"
          className="h-36 w-36 rounded-full object-cover shadow-md border-2 border-[#C8BC9A]"
        />
        <h2 className="text-2xl font-bold text-[#1C1209]">Done!</h2>
        <p className="text-[#7A6645] text-sm">
          {successCount} article{successCount !== 1 ? "s" : ""} exported
          {errorCount > 0 && ` · ${errorCount} failed`}
        </p>
      </div>

      {fileId ? (
        <a
          href={downloadUrl(fileId)}
          download
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1C1209] px-6 py-4 text-lg font-semibold text-[#F0E8D0] transition hover:bg-[#2C1A0E] shadow-md"
        >
          ⬇ Download .docx
        </a>
      ) : (
        <p className="rounded-lg bg-[#F5ECE8] px-4 py-3 text-sm text-[#8B1A2F]">
          No content was successfully scraped. Please try again.
        </p>
      )}

      <p className="text-xs text-[#9B8660]">
        Open the .docx file in Google Docs: File → Open → Upload the file.
      </p>

      {errorCount > 0 && (
        <div className="text-left">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="text-sm text-[#9B8660] hover:text-[#5C4A2A]"
          >
            {showErrors ? "Hide" : "Show"} {errorCount} failed URL{errorCount !== 1 ? "s" : ""}
          </button>
          {showErrors && (
            <ul className="mt-2 space-y-1 rounded-xl border border-[#DDD5BB] bg-[#FAF6EA] p-4 max-h-40 overflow-y-auto">
              {failedUrls.map((url) => (
                <li key={url} className="text-xs text-[#7A6645] truncate">
                  {url}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className="rounded-xl border border-[#C8BC9A] bg-[#FAF6EA] px-6 py-3 text-sm font-medium text-[#5C4A2A] transition hover:bg-[#EDE3CC]"
      >
        Start Over
      </button>
    </div>
  );
}
