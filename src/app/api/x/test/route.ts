import { NextResponse } from "next/server";
import { testXConnection, isXConfigured, isXCreditsDepleted, fetchXAlerts } from "@/lib/fetchers/x-api";
import { X_ACCOUNTS } from "@/lib/config/x-accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isXConfigured();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      accounts: X_ACCOUNTS.map((a) => a.username),
      message: "Configura X_BEARER_TOKEN para activar la API oficial de X",
    });
  }

  const test = await testXConnection();
  const { activeAccounts, failedAccounts, alerts } = await fetchXAlerts();

  return NextResponse.json({
    configured: true,
    creditsDepleted: isXCreditsDepleted(),
    fallback: isXCreditsDepleted() ? "nitter" : null,
    connection: test,
    activeAccounts,
    failedAccounts,
    tweetsFetched: alerts.length,
    accounts: X_ACCOUNTS.map((a) => ({
      username: a.username,
      name: a.name,
      active: activeAccounts.includes(a.username),
    })),
  });
}

export async function POST() {
  if (!isXConfigured()) {
    return NextResponse.json(
      { ok: false, error: "X_BEARER_TOKEN no configurado" },
      { status: 400 }
    );
  }

  const test = await testXConnection();
  return NextResponse.json(test);
}
