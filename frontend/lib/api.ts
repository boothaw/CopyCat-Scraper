import type { DiscoverResponse, SseEvent } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export async function discoverArticles(url: string): Promise<DiscoverResponse> {
  const res = await fetch(`${API_URL}/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ||
        `Failed to discover articles (${res.status})`
    );
  }

  return res.json();
}

export function streamScrape(
  urls: string[],
  onEvent: (event: SseEvent) => void,
  onError: (err: Error) => void
): () => void {
  let controller: AbortController | null = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
        signal: controller?.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Scrape request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              onEvent(payload as SseEvent);
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return () => {
    controller?.abort();
    controller = null;
  };
}

export function downloadUrl(fileId: string): string {
  return `${API_URL}/download/${fileId}`;
}
