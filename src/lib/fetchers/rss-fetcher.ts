import Parser from "rss-parser";
import { categorizeItem } from "@/lib/filters/categorizer";
import { buildNitterRssUrls } from "@/lib/config/nitter-instances";
import { FEED_SOURCES } from "@/lib/config/sources";
import { isXApiOperational } from "@/lib/fetchers/x-api";
import { checkXBrowserSession, isXBrowserDisabled } from "@/lib/fetchers/x-browser";
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

function parseFeedItems(
  feed: Awaited<ReturnType<Parser["parseURL"]>>,
  source: FeedSource
): Alert[] {
  const alerts: Alert[] = [];
  const sourceType = source.type === "twitter_rss" ? "twitter" : "rss";

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

    alerts.push(
      ...categorizeItem(
        {
          title: item.title,
          summary,
          url: item.link,
          publishedAt,
          source,
        },
        sourceType
      )
    );
  }

  return alerts;
}

async function fetchFromUrl(url: string, source: FeedSource): Promise<Alert[]> {
  const feed = await parser.parseURL(url);
  return parseFeedItems(feed, source);
}

function extractNitterUsername(source: FeedSource): string | null {
  const match = source.url.match(/\/([^/]+)\/rss\/?$/i);
  return match ? match[1] : null;
}

async function fetchFeed(source: FeedSource): Promise<Alert[]> {
  try {
    if (source.type === "twitter_rss") {
      const username = extractNitterUsername(source);
      if (username) {
        const urls = buildNitterRssUrls(username);
        for (const url of urls) {
          try {
            const alerts = await fetchFromUrl(url, source);
            if (alerts.length > 0) {
              console.log(`[Nitter] OK @${username} via ${url}`);
              return alerts;
            }
          } catch {
            /* siguiente instancia */
          }
        }
        console.warn(`[Nitter] Todas las instancias fallaron para @${username}`);
        return [];
      }
    }

    return await fetchFromUrl(source.url, source);
  } catch (error) {
    console.error(`[RSS] Error fetching ${source.name}:`, error);
    return [];
  }
}

export async function fetchAllRssAlerts(): Promise<{
  alerts: Alert[];
  activeSources: string[];
  failedSources: string[];
  xMode: "api" | "browser" | "nitter" | "disabled";
}> {
  let useNitterFallback = true;
  let xMode: "api" | "browser" | "nitter" | "disabled" = "nitter";

  if (isXApiOperational()) {
    useNitterFallback = false;
    xMode = "api";
  } else if (!isXBrowserDisabled()) {
    const browserSession = await checkXBrowserSession();
    useNitterFallback = !browserSession.loggedIn;
    xMode = browserSession.loggedIn ? "browser" : "nitter";
  } else {
    xMode = "disabled";
  }

  const enabled = FEED_SOURCES.filter((s) => {
    if (!s.enabled) return false;
    if (s.type === "twitter_rss") return useNitterFallback || isXBrowserDisabled();
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
    if (result.status === "fulfilled" && result.value.length > 0) {
      activeSources.push(source.id);
      alerts.push(...result.value);
    } else if (result.status === "fulfilled") {
      failedSources.push(source.id);
    } else {
      failedSources.push(source.id);
    }
  });

  alerts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return { alerts, activeSources, failedSources, xMode };
}
