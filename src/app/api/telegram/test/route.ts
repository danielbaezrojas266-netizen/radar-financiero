import { NextResponse } from "next/server";
import { runScan } from "@/lib/monitor/aggregator";
import {
  formatAlertMessage,
  getTelegramChatIds,
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en las variables de entorno",
      },
      { status: 400 }
    );
  }

  const ok = await sendTelegramMessage(
    "🧪 <b>Prueba — Radar Financiero</b>\nConexión con Telegram correcta. Recibirás alertas en español en tiempo real."
  );

  if (ok) {
    const { alerts } = await runScan();
    const sample = alerts[0];
    if (sample) {
      await sendTelegramMessage(
        `📡 <b>Ejemplo de alerta en español:</b>\n\n${await formatAlertMessage(sample)}`
      );
    }
  }

  return NextResponse.json({ ok, message: ok ? "Mensaje enviado" : "Error al enviar" });
}

export async function GET() {
  const chatIds = getTelegramChatIds();
  return NextResponse.json({
    configured: isTelegramConfigured(),
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasChatId: chatIds.length > 0,
    chatCount: chatIds.length,
    chatHint:
      chatIds.length === 1 && chatIds[0].startsWith("-")
        ? "grupo"
        : chatIds.length === 1
          ? "chat privado"
          : "múltiples destinos",
  });
}
