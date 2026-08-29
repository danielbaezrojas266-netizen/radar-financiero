import Link from "next/link";
import { ArrowLeft, ExternalLink, Monitor } from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "Abrir navegador de login",
    desc: 'En la terminal del proyecto ejecuta: npm run x:login — se abrirá Chromium con perfil persistente.',
  },
  {
    n: 2,
    title: "Iniciar sesión manualmente",
    desc: "Introduce tu usuario/email y contraseña de X en el navegador. Completa 2FA si lo tienes. Por seguridad, nadie más debe ver tu pantalla.",
  },
  {
    n: 3,
    title: "Verificar sesión",
    desc: "Cuando veas tu timeline (x.com/home), cierra el navegador. La sesión queda guardada en .x-browser-profile/",
  },
  {
    n: 4,
    title: "Radar activo",
    desc: "El radar scrapeará los perfiles institucionales cada 45s en modo headless usando tu sesión guardada.",
  },
];

const ACCOUNTS = [
  "@federalreserve — Fed oficial",
  "@JeromeHPowell — Presidente de la Fed",
  "@ecb — Banco Central Europeo",
  "@FirstSquawk — Noticias macro en tiempo real",
  "@whale_alert — Ballenas BTC",
  "@SEC_News — Regulación SEC",
];

export default function ConfiguracionPage() {
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
            Configuración de X — Modo navegador
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="mb-2 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-emerald-300">
              Scraping visual (sin API)
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">
            Sin API de desarrollador. Playwright abre x.com con tu sesión real,
            lee los tweets de cuentas institucionales desde la interfaz web y
            envía alertas filtradas a Telegram en español.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-100">Pasos</h2>
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-emerald-400">
                  {step.n}
                </span>
                <h3 className="font-medium text-zinc-200">{step.title}</h3>
              </div>
              <p className="ml-10 text-sm text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-3 text-base font-semibold text-zinc-100">
            Perfiles monitoreados
          </h2>
          <ul className="space-y-1.5">
            {ACCOUNTS.map((a) => (
              <li key={a} className="text-sm text-zinc-400">
                · {a}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-2 text-base font-semibold text-zinc-100">
            Verificar conexión
          </h2>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300">
            curl http://localhost:4317/api/x/test
          </pre>
          <a
            href="https://x.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
          >
            Abrir x.com/login
            <ExternalLink className="h-3 w-3" />
          </a>
        </section>
      </main>
    </div>
  );
}
