import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "Crear cuenta de desarrollador",
    desc: "Entra en developer.x.com con tu cuenta de X y solicita acceso al portal de desarrolladores (plan Free/Basic es suficiente para lectura).",
    link: "https://developer.x.com/en/portal/dashboard",
  },
  {
    n: 2,
    title: "Crear un proyecto y una App",
    desc: 'En el portal: Projects → Create Project → Create App. Nombre sugerido: "Radar Financiero".',
    link: "https://developer.x.com/en/portal/projects-and-apps",
  },
  {
    n: 3,
    title: "Activar permisos de lectura",
    desc: "En tu App → Settings → User authentication settings (opcional) y asegúrate de tener acceso a la API v2. Para solo leer tweets públicos basta el Bearer Token.",
  },
  {
    n: 4,
    title: "Copiar el Bearer Token",
    desc: 'En Keys and tokens → Bearer Token → Generate. Copia el token (empieza por AAAA...). Guárdalo — solo se muestra una vez.',
    link: "https://developer.x.com/en/portal/projects-and-apps",
  },
  {
    n: 5,
    title: "Configurar en Radar Financiero",
    desc: "Añade el token como variable de entorno X_BEARER_TOKEN y reinicia el servidor. El radar usará la API oficial en lugar de Nitter.",
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
            Configuración de X (Twitter)
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-2 text-base font-semibold text-zinc-100">
            ¿Por qué la API oficial?
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            El radar usaba Nitter (RSS no oficial), que falla con frecuencia. La
            API v2 de X es estable, legal y permite monitorear cuentas
            institucionales en tiempo real sin iniciar sesión en el navegador.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Pasos de configuración
          </h2>
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
              {step.link && (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-10 mt-2 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                >
                  Abrir enlace
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-3 text-base font-semibold text-zinc-100">
            Cuentas que monitoreará el radar
          </h2>
          <ul className="space-y-1.5">
            {ACCOUNTS.map((a) => (
              <li key={a} className="text-sm text-zinc-400">
                · {a}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <h2 className="mb-2 text-base font-semibold text-emerald-300">
            Variable de entorno
          </h2>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300">
            X_BEARER_TOKEN=tu_bearer_token_aqui
          </pre>
          <p className="mt-3 text-sm text-zinc-500">
            Tras configurarlo, prueba con:{" "}
            <code className="text-zinc-400">curl http://localhost:4317/api/x/test</code>
          </p>
        </section>
      </main>
    </div>
  );
}
