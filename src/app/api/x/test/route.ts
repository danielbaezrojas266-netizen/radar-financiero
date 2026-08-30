import { NextResponse } from "next/server";
import {
  checkXBrowserSession,
  fetchXBrowserAlerts,
  getXBrowserStatus,
} from "@/lib/fetchers/x-browser";
import {
  fetchXAlerts,
  isXConfigured,
  isXApiOperational,
  isXCreditsDepleted,
  testXConnection,
} from "@/lib/fetchers/x-api";
import { X_ACCOUNTS } from "@/lib/config/x-accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isXConfigured()) {
    const test = await testXConnection();
    if (isXApiOperational()) {
      const { activeAccounts, failedAccounts, alerts } = await fetchXAlerts();
      return NextResponse.json({
        mode: "api",
        configured: true,
        connection: test,
        creditsDepleted: isXCreditsDepleted(),
        activeAccounts,
        failedAccounts,
        tweetsFetched: alerts.length,
        accounts: X_ACCOUNTS.map((a) => ({
          username: a.username,
          active: activeAccounts.includes(a.username),
        })),
      });
    }
    return NextResponse.json({
      mode: "api",
      configured: true,
      connection: test,
      creditsDepleted: isXCreditsDepleted(),
      fallback: "nitter",
      message: test.error ?? "API no operativa — usando Nitter",
    });
  }

  const session = await checkXBrowserSession();
  const status = getXBrowserStatus();

  if (!session.loggedIn) {
    return NextResponse.json({
      mode: "browser",
      configured: false,
      loggedIn: false,
      session,
      status,
      message: "Configura X_BEARER_TOKEN o ejecuta npm run x:login",
    });
  }

  const { activeAccounts, failedAccounts, alerts, loggedIn } =
    await fetchXBrowserAlerts();

  return NextResponse.json({
    mode: "browser",
    configured: true,
    loggedIn,
    session,
    status,
    activeAccounts,
    failedAccounts,
    tweetsFetched: alerts.length,
  });
}

export async function POST() {
  if (isXConfigured()) {
    return NextResponse.json(await testXConnection());
  }
  return NextResponse.json(await checkXBrowserSession());
}
