import Parser from "rss-parser";
import { categorizeItem } from "@/lib/filters/categorizer";
import { FEED_SOURCES } from "@/lib/config/sources";
import { isXBrowserMode } from "@/lib/fetchers/x-browser";
import type { Alert, FeedSource } from "@/lib/types";

const parser = new Parser({
  timeout: 12000,
  headers: {
    "User-Agent": "RadarFinanciero/1.0 (Financial Monitoring)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(source: FeedSource): Promise<Alert[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const alerts: Alert[] = [];

    for (const item of feed.items.slice(0, 15)) {
      if (!item.title) continue;

      const publishedAt = item.isoDate
        ? new Date(item.isoDate)
        : item.pubDate
          ? new Date(item.pubDate)
          : new Date();

      const summary = stripHtml(
        item.contentSnippet || item.content || item.summary || ""
      );

      const sourceType =
        source.type === "twitter_rss" ? "twitter" : "rss";

      const categorized = categorizeItem(
        {
          title: item.title,
          summary,
          url: item.link,
          publishedAt,
          source,
        },
        sourceType
      );

      alerts.push(...categorized);
    }

    return alerts;
  } catch (error) {
    console.error(`[RSS] Error fetching ${source.name}:`, error);
    return [];
  }
}

export async function fetchAllRssAlerts(): Promise<{
  alerts: Alert[];
  activeSources: string[];
  failedSources: string[];
}> {
  const enabled = FEED_SOURCES.filter((s) => {
    if (!s.enabled) return false;
    // Modo navegador: X se scrapea con Playwright, no Nitter
    if (isXBrowserMode() && s.type === "twitter_rss") return false;
    return true;
  });
  const results = await Promise.allSettled(
    enabled.map((source) => fetchFeed(source))
  );

  const alerts: Alert[] = [];
  const activeSources: string[] = [];
  const failedSources: string[] = [];

  results.forEach((result, index) => {
    const source = enabled[index];
    if (result.status === "fulfilled" && result.value.length >= 0) {
      activeSources.push(source.id);
      alerts.push(...result.value);
    } else {
      failedSources.push(source.id);
    }
  });

  alerts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return { alerts, activeSources, failedSources };
}
