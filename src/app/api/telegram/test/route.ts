import { NextResponse } from "next/server";
import {
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

  return NextResponse.json({ ok, message: ok ? "Mensaje enviado" : "Error al enviar" });
}

export async function GET() {
  return NextResponse.json({
    configured: isTelegramConfigured(),
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
  });
}
