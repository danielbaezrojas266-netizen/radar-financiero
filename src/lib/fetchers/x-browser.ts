import path from "path";
import { chromium, type BrowserContext } from "playwright";
import { X_ACCOUNTS } from "@/lib/config/x-accounts";
import { categorizeItem } from "@/lib/filters/categorizer";
import type { Alert, FeedSource } from "@/lib/types";

export const X_PROFILE_DIR = path.join(process.cwd(), ".x-browser-profile");

let sessionLoggedIn: boolean | null = null;
let lastScrapeError: string | null = null;

export function isXBrowserMode(): boolean {
  return process.env.X_USE_API !== "true";
}

export function isXBrowserDisabled(): boolean {
  return (
    process.env.X_BROWSER_DISABLED === "true" ||
    process.env.X_BROWSER_DISABLED === "1"
  );
}

export function getXBrowserStatus() {
  return {
    mode: "browser",
    profileDir: X_PROFILE_DIR,
    loggedIn: sessionLoggedIn,
    lastError: lastScrapeError,
  };
}

function accountToFeedSource(account: (typeof X_ACCOUNTS)[0]): FeedSource {
  return {
    id: `x-browser-${account.username.toLowerCase()}`,
    name: account.name,
    url: `https://x.com/${account.username}`,
    type: "rss",
    credibility: account.credibility,
    categories: account.categories,
    assets: account.assets,
    enabled: true,
  };
}

async function detectLoggedIn(
  page: Awaited<ReturnType<BrowserContext["newPage"]>>
): Promise<boolean> {
  const url = page.url();
  if (url.includes("/login") || url.includes("/i/flow/login")) return false;

  const bodyText = await page.innerText("body").catch(() => "");
  const loginMarkers = [
    "Happening now",
    "Email or username",
    "Correo electrónico o nombre de usuario",
    "Continue with Google",
    "Continuar con Google",
    "Inicia sesión",
    "Sign in",
  ];
  if (loginMarkers.some((m) => bodyText.includes(m))) return false;

  const hasUsernameInput =
    (await page.locator('input[autocomplete="username"]').count()) > 0;
  if (hasUsernameInput) return false;

  // Timeline o perfil cargado
  const hasTweets =
    (await page.locator('article[data-testid="tweet"]').count()) > 0;
  const onHome = url.includes("/home") || url === "https://x.com/home";

  return hasTweets || onHome;
}

async function getContext(headless = true): Promise<BrowserContext> {
  return chromium.launchPersistentContext(X_PROFILE_DIR, {
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
}

export async function checkXBrowserSession(): Promise<{
  ok: boolean;
  loggedIn: boolean;
  error?: string;
}> {
  if (isXBrowserDisabled()) {
    sessionLoggedIn = false;
    return {
      ok: true,
      loggedIn: false,
      error: "Navegador X desactivado (modo RSS/Nitter)",
    };
  }

  let context: BrowserContext | null = null;
  try {
    context = await getContext(true);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto("https://x.com/home", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await page.waitForTimeout(2000);

    const url = page.url();
    sessionLoggedIn = await detectLoggedIn(page);

    return { ok: true, loggedIn: sessionLoggedIn };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error de sesión";
    lastScrapeError = msg;
    return { ok: false, loggedIn: false, error: msg };
  } finally {
    await context?.close();
  }
}

interface ScrapedTweet {
  text: string;
  time: string;
  href: string;
}

async function scrapeProfile(
  page: Awaited<ReturnType<BrowserContext["newPage"]>>,
  username: string
): Promise<ScrapedTweet[]> {
  await page.goto(`https://x.com/${username}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  // Esperar tweets o detectar muro de login
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 12000 });
  } catch {
    const body = await page.innerText("body").catch(() => "");
    if (body.includes("Sign in") || body.includes("Inicia sesión")) return [];
  }

  // Scroll leve para cargar tweets
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1500);

  const tweets = await page.evaluate(() => {
    const articles = Array.from(
      document.querySelectorAll('article[data-testid="tweet"]')
    ).slice(0, 12);

    return articles.map((article) => {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const timeEl = article.querySelector("time");
      const linkEl = article.querySelector('a[href*="/status/"]');
      return {
        text: textEl?.textContent?.trim() ?? "",
        time: timeEl?.getAttribute("datetime") ?? "",
        href: linkEl?.getAttribute("href") ?? "",
      };
    });
  });

  return tweets.filter((t) => t.text.length > 0);
}

export async function fetchXBrowserAlerts(): Promise<{
  alerts: Alert[];
  activeAccounts: string[];
  failedAccounts: string[];
  loggedIn: boolean;
}> {
  if (isXBrowserDisabled()) {
    return {
      alerts: [],
      activeAccounts: [],
      failedAccounts: [],
      loggedIn: false,
    };
  }

  const alerts: Alert[] = [];
  const activeAccounts: string[] = [];
  const failedAccounts: string[] = [];

  let context: BrowserContext | null = null;

  try {
    context = await getContext(true);
    const page = context.pages()[0] ?? (await context.newPage());

    // Verificar sesión
    await page.goto("https://x.com/home", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await page.waitForTimeout(2000);

    sessionLoggedIn = await detectLoggedIn(page);

    if (!sessionLoggedIn) {
      lastScrapeError = "Sesión de X no iniciada — ejecuta npm run x:login";
      return {
        alerts: [],
        activeAccounts: [],
        failedAccounts: X_ACCOUNTS.map((a) => a.username),
        loggedIn: false,
      };
    }

    for (const account of X_ACCOUNTS) {
      try {
        const tweets = await scrapeProfile(page, account.username);
        if (tweets.length === 0) {
          failedAccounts.push(account.username);
          continue;
        }

        activeAccounts.push(account.username);
        const source = accountToFeedSource(account);

        for (const tweet of tweets) {
          const publishedAt = tweet.time ? new Date(tweet.time) : new Date();
          const url = tweet.href.startsWith("http")
            ? tweet.href
            : `https://x.com${tweet.href}`;

          const categorized = categorizeItem(
            {
              title: tweet.text.slice(0, 280),
              summary: "",
              url,
              publishedAt,
              source,
            },
            "twitter"
          );
          alerts.push(...categorized);
        }
      } catch (error) {
        failedAccounts.push(account.username);
        console.error(`[X Browser] Error @${account.username}:`, error);
      }

      // Pausa anti-bloqueo entre perfiles
      await page.waitForTimeout(2000 + Math.random() * 1500);
    }

    lastScrapeError = null;
    return { alerts, activeAccounts, failedAccounts, loggedIn: true };
  } catch (error) {
    lastScrapeError =
      error instanceof Error ? error.message : "Error en scraping";
    return {
      alerts: [],
      activeAccounts: [],
      failedAccounts: X_ACCOUNTS.map((a) => a.username),
      loggedIn: sessionLoggedIn ?? false,
    };
  } finally {
    await context?.close();
  }
}
