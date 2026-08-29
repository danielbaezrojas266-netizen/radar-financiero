# Radar Financiero — XAU/USD & BTC

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
- **X (Twitter)** — API v2 oficial (Bearer Token) o fallback Nitter
- **On-chain** — Blockchair API para transacciones >500 BTC
- **Precios** — CoinGecko (XAU proxy via XAUT, BTC spot)

## Despliegue 24/7

Para monitoreo persistente, despliega en Vercel, Railway o un VPS. El endpoint SSE mantiene el escaneo activo mientras haya al menos un cliente conectado. Para 24/7 sin depender del navegador, añade un cron job que llame a `/api/alerts` cada minuto.

## Limitaciones

- **X/Twitter**: con `X_BEARER_TOKEN` usa la API oficial; sin token, intenta Nitter (inestable).
- **Reuters RSS**: a veces bloquea requests; el radar continúa con otras fuentes.
- **Blockchair**: límite de rate en tier gratuito.
- **No ejecuta trades** — solo alertas informativas.

## Alertas por Telegram

1. Crea un bot con [@BotFather](https://t.me/BotFather) en Telegram → copia el **token**
2. Envía `/start` a tu bot
3. Obtén tu **chat_id** visitando `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Configura las variables de entorno:

```env
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
```

5. Reinicia el servidor. Al arrancar recibirás un mensaje de confirmación.
6. Prueba la conexión: `curl -X POST http://localhost:4317/api/telegram/test`

Las alertas nuevas se envían automáticamente cada 45 segundos (prioridad CRÍTICO, ALTO y MEDIO).

## Configuración de X (Twitter API)

Guía paso a paso: [http://localhost:4317/configuracion](http://localhost:4317/configuracion)

1. Entra en [developer.x.com](https://developer.x.com/en/portal/dashboard)
2. Crea un **Project** y una **App**
3. Genera el **Bearer Token** en Keys and tokens
4. Configura `X_BEARER_TOKEN` y reinicia
5. Prueba: `curl http://localhost:4317/api/x/test`

Cuentas: @federalreserve, @JeromeHPowell, @ecb, @FirstSquawk, @whale_alert, @SEC_News

## Variables de entorno

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
X_BEARER_TOKEN=
```

## Licencia

MIT
