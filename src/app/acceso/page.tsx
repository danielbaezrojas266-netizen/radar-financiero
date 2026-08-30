import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Globe,
  MessageCircle,
  Monitor,
  Smartphone,
} from "lucide-react";

const PRODUCTION_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://radar-financiero-production.up.railway.app";

export default function AccesoPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Radar
          </Link>
          <h1 className="text-lg font-bold text-zinc-100">
            Acceso desde PC y celular
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="mb-2 flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-emerald-300">
              URL pública (PC y móvil)
            </h2>
          </div>
          <p className="mb-3 text-sm text-zinc-400">
            Abre esta dirección en cualquier navegador — Chrome, Safari, Firefox
            — en tu computadora o teléfono:
          </p>
          <a
            href={PRODUCTION_URL}
            className="break-all font-mono text-sm text-emerald-400 hover:underline"
          >
            {PRODUCTION_URL}
          </a>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Instalar en el celular (como app)
            </h2>
          </div>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li>
              <strong className="text-zinc-300">iPhone (Safari):</strong> abre la
              URL → botón Compartir → <em>Añadir a pantalla de inicio</em>
            </li>
            <li>
              <strong className="text-zinc-300">Android (Chrome):</strong> abre la
              URL → menú ⋮ → <em>Instalar app</em> o{" "}
              <em>Añadir a pantalla principal</em>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Telegram (recomendado en móvil)
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">
            Las alertas críticas y los resúmenes diarios (7:00 AM y 4:30 PM
            UTC-6) llegan traducidas al español en{" "}
            <strong className="text-zinc-300">@radar_financiero_2026_bot</strong>.
            No necesitas tener el navegador abierto: Telegram te avisa aunque la
            app esté cerrada.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">En tu PC</h2>
          </div>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <Bookmark className="mt-0.5 h-4 w-4 shrink-0" />
              Guarda la URL en favoritos para abrirla con un clic
            </li>
            <li>
              El dashboard se actualiza solo cada ~45 segundos (conexión en vivo)
            </li>
            <li>Las noticias se muestran en español automáticamente</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
