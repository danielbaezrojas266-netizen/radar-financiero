import { NextResponse } from "next/server";
import {
  checkXBrowserSession,
  fetchXBrowserAlerts,
  getXBrowserStatus,
} from "@/lib/fetchers/x-browser";
import { X_ACCOUNTS } from "@/lib/config/x-accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await checkXBrowserSession();
  const status = getXBrowserStatus();

  if (!session.loggedIn) {
    return NextResponse.json({
      mode: "browser",
      configured: true,
      loggedIn: false,
      session,
      status,
      accounts: X_ACCOUNTS.map((a) => a.username),
      message:
        "Ejecuta npm run x:login e inicia sesión en el navegador que se abre",
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
    accounts: X_ACCOUNTS.map((a) => ({
      username: a.username,
      active: activeAccounts.includes(a.username),
    })),
  });
}

export async function POST() {
  const session = await checkXBrowserSession();
  return NextResponse.json({ mode: "browser", ...session });
}
