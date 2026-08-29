import { NextResponse } from "next/server";
import { runScan } from "@/lib/monitor/aggregator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await runScan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API/alerts]", error);
    return NextResponse.json(
      { error: "Error al escanear fuentes" },
      { status: 500 }
    );
  }
}
