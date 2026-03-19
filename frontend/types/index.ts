export interface Article {
  url: string;
  title: string | null;
  lastmod: string | null;
}

export interface DiscoverResponse {
  articles: Article[];
  count: number;
}

export type ScrapeMode = "sitemap" | "manual";

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export type SseEvent =
  | { type: "progress"; current: number; total: number; title: string }
  | { type: "error"; url: string; message: string }
  | {
      type: "done";
      file_id: string | null;
      success_count: number;
      error_count: number;
      errors: string[];
    };
