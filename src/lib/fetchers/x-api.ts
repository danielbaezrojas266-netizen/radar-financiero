import { X_ACCOUNTS } from "@/lib/config/x-accounts";
import { categorizeItem } from "@/lib/filters/categorizer";
import type { Alert, FeedSource } from "@/lib/types";

const userIdCache = new Map<string, string>();

function getBearerToken(): string | undefined {
  return process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;
}

export function isXConfigured(): boolean {
  return Boolean(getBearerToken());
}

async function xFetch(path: string): Promise<Response> {
  const token = getBearerToken();
  if (!token) throw new Error("X API no configurada");

  return fetch(`https://api.x.com/2${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "RadarFinanciero/1.0",
    },
    signal: AbortSignal.timeout(12000),
  });
}

async function getUserId(username: string): Promise<string | null> {
  const cached = userIdCache.get(username);
  if (cached) return cached;

  const res = await xFetch(
    `/users/by/username/${encodeURIComponent(username)}?user.fields=id,username,name`
  );

  if (!res.ok) {
    console.error(`[X API] Error user @${username}:`, res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { data?: { id: string } };
  const id = data.data?.id;
  if (id) userIdCache.set(username, id);
  return id ?? null;
}

interface XTweet {
  id: string;
  text: string;
  created_at?: string;
}

function accountToFeedSource(account: (typeof X_ACCOUNTS)[0]): FeedSource {
  return {
    id: `x-${account.username}`,
    name: account.name,
    url: `https://x.com/${account.username}`,
    type: "rss",
    credibility: account.credibility,
    categories: account.categories,
    assets: account.assets,
    enabled: true,
  };
}

async function fetchAccountTweets(
  account: (typeof X_ACCOUNTS)[0]
): Promise<Alert[]> {
  const userId = await getUserId(account.username);
  if (!userId) return [];

  const res = await xFetch(
    `/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text&exclude=retweets,replies`
  );

  if (!res.ok) {
    console.error(
      `[X API] Error tweets @${account.username}:`,
      res.status,
      await res.text()
    );
    return [];
  }

  const data = (await res.json()) as { data?: XTweet[] };
  if (!data.data?.length) return [];

  const source = accountToFeedSource(account);
  const alerts: Alert[] = [];

  for (const tweet of data.data) {
    const publishedAt = tweet.created_at
      ? new Date(tweet.created_at)
      : new Date();

    const categorized = categorizeItem(
      {
        title: tweet.text.slice(0, 280),
        summary: "",
        url: `https://x.com/${account.username}/status/${tweet.id}`,
        publishedAt,
        source,
      },
      "twitter"
    );

    alerts.push(...categorized);
  }

  return alerts;
}

export async function fetchXAlerts(): Promise<{
  alerts: Alert[];
  activeAccounts: string[];
  failedAccounts: string[];
}> {
  if (!isXConfigured()) {
    return { alerts: [], activeAccounts: [], failedAccounts: [] };
  }

  const results = await Promise.allSettled(
    X_ACCOUNTS.map((account) => fetchAccountTweets(account))
  );

  const alerts: Alert[] = [];
  const activeAccounts: string[] = [];
  const failedAccounts: string[] = [];

  results.forEach((result, index) => {
    const account = X_ACCOUNTS[index];
    if (result.status === "fulfilled" && result.value.length > 0) {
      activeAccounts.push(account.username);
      alerts.push(...result.value);
    } else if (result.status === "fulfilled" && result.value.length === 0) {
      failedAccounts.push(account.username);
    } else {
      failedAccounts.push(account.username);
      console.error(`[X API] Falló @${account.username}:`, result.status === "rejected" ? result.reason : "sin tweets");
    }
  });

  return { alerts, activeAccounts, failedAccounts };
}

export async function testXConnection(): Promise<{
  ok: boolean;
  username?: string;
  name?: string;
  error?: string;
}> {
  if (!isXConfigured()) {
    return { ok: false, error: "X_BEARER_TOKEN no configurado" };
  }

  try {
    const res = await xFetch("/users/by/username/federalreserve?user.fields=username,name");
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `API respondió ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as {
      data?: { username: string; name: string };
    };
    return {
      ok: true,
      username: data.data?.username,
      name: data.data?.name,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error de conexión",
    };
  }
}
