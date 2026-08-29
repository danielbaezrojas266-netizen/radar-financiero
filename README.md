# Market Radar — XAU/USD & BTC

Radar de noticias en tiempo real para **Oro (XAU/USD)** y **Bitcoin (BTC)**. Filtra ruido, memes y opiniones emocionales; solo alerta ante eventos que mueven mercados.

## Qué monitorea

| Categoría | Fuentes | Ejemplos |
|-----------|---------|----------|
| **Fed / Tasas** | Federal Reserve, ECB (@ecb en X), discursos oficiales | FOMC, recortes/subidas de tasas, Powell |
| **Macro** | BLS, BEA, Reuters | CPI, PPI, NFP, desempleo, PCE, GDP |
| **Geopolítica / Oro** | Reuters, Investing.com | Conflictos, sanciones, refugio en oro |
| **Ballenas BTC** | Blockchair on-chain, @whale_alert en X | Transferencias >500 BTC |
| **Regulación BTC** | SEC, CFTC, CoinDesk | ETF, enforcement, legislación |

## Filtro anti-ruido

- Ignora memes, shitcoins, airdrops y opiniones sin sustancia
- Prioriza fuentes institucionales (credibilidad 9–10)
- Clasifica por keywords y categoría de fuente
- Prioridad: **CRÍTICO** → **ALTO** → **MEDIO**

## Cómo ejecutar

```bash
npm install
npm run dev -- -p 4317
```

Abre [http://localhost:4317](http://localhost:4317).

## Arquitectura

- **Next.js 16** — dashboard + API
- **SSE** (`/api/stream`) — escaneo cada 45 segundos, push en tiempo real
- **RSS** — Fed, BLS, BEA, Reuters, SEC, CFTC, CoinDesk
- **X (Twitter)** — vía RSS de cuentas oficiales (@federalreserve, @ecb, @whale_alert)
- **On-chain** — Blockchair API para transacciones >500 BTC
- **Precios** — CoinGecko (XAU proxy via XAUT, BTC spot)

## Despliegue 24/7

Para monitoreo persistente, despliega en Vercel, Railway o un VPS. El endpoint SSE mantiene el escaneo activo mientras haya al menos un cliente conectado. Para 24/7 sin depender del navegador, añade un cron job que llame a `/api/alerts` cada minuto.

## Limitaciones

- **X/Twitter**: usa instancias RSS (Nitter); pueden fallar ocasionalmente. Para producción, integra la API oficial de X.
- **Reuters RSS**: a veces bloquea requests; el radar continúa con otras fuentes.
- **Blockchair**: límite de rate en tier gratuito.
- **No ejecuta trades** — solo alertas informativas.

## Variables de entorno (opcional)

No requiere API keys para funcionar. Opcionalmente puedes añadir:

```env
# Futuro: API oficial de X
TWITTER_BEARER_TOKEN=

# Futuro: alertas por Telegram/Discord
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Licencia

MIT
