import Link from "next/link";
import { RadarDashboard } from "@/components/RadarDashboard";
import { Radar, Settings, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
              <Radar className="h-5 w-5 text-emerald-400 radar-sweep" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100">
                Radar Financiero
              </h1>
              <p className="text-xs text-zinc-500">
                XAU/USD · BTC — Solo señales, sin ruido
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/acceso"
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
              title="Acceso PC y celular"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Acceso móvil</span>
            </Link>
            <Link
              href="/configuracion"
              className="hidden items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 sm:flex"
            >
              <Settings className="h-4 w-4" />
              Configurar X
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                Modo
              </p>
              <p className="text-sm font-semibold text-emerald-400">
                Observación · No ejecuta trades
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🏛️",
              title: "Fed & Tasas",
              desc: "FOMC, Powell, decisiones de política monetaria",
            },
            {
              icon: "📊",
              title: "Macro",
              desc: "CPI, PPI, NFP, empleo, PCE, GDP",
            },
            {
              icon: "🌍",
              title: "Geopolítica",
              desc: "Conflictos y refugio en oro",
            },
            {
              icon: "🐋",
              title: "BTC On-chain",
              desc: "Ballenas + regulación SEC/CFTC/ETF",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"
            >
              <span className="text-lg">{item.icon}</span>
              <p className="mt-1 text-sm font-medium text-zinc-300">
                {item.title}
              </p>
              <p className="text-xs text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </section>

        <RadarDashboard />
      </main>

      <footer className="border-t border-zinc-800/50 py-4 text-center text-xs text-zinc-700">
        Radar informativo — no constituye asesoramiento financiero ni ejecuta
        operaciones
      </footer>
    </div>
  );
}
