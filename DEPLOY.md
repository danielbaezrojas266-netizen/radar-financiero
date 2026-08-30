# Despliegue 24/7 — Radar Financiero

El radar debe correr en un servidor permanente para enviarte Telegram aunque
apagues tu PC. Esta guía usa **Railway** (recomendado) o **Render**.

## Variables de entorno (obligatorias)

```
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
TELEGRAM_TIMEZONE=Etc/GMT+6
X_BROWSER_DISABLED=true
X_API_DISABLED=true
CRON_SECRET=elige_un_secreto_largo
NEXT_PUBLIC_APP_URL=https://radar-financiero-production.up.railway.app
ALERTS_LOCALE=es
FINNHUB_API_KEY=tu_clave_finnhub
```

`FINNHUB_API_KEY` es **recomendada** para consenso Wall Street automático (CPI, NFP, PCE, PPI) vía calendario económico. Gratis en [finnhub.io/register](https://finnhub.io/register).

## Opción A — Railway (recomendado, ~5 min)

1. Crea cuenta en [railway.app](https://railway.app) (GitHub login)
2. **New Project** → **Deploy from GitHub repo** → elige este repositorio
3. Railway detecta el `Dockerfile` automáticamente
4. En **Variables**, pega las variables de arriba
5. Deploy → copia la URL pública (ej. `https://radar-financiero.up.railway.app`)
6. Prueba: `https://TU-URL/api/health`

El poller interno arranca solo y envía:
- Cat. 1 al instante
- Resúmenes a las **7:00** y **16:30** (UTC-6)

## Opción B — Render

1. Cuenta en [render.com](https://render.com)
2. **New** → **Blueprint** → conecta el repo (usa `render.yaml`)
3. Configura los secretos cuando te los pida
4. Deploy

## Backup — Cron externo (por si el free tier se duerme)

Si el hosting “duerme” el servicio, crea un cron gratis en
[cron-job.org](https://cron-job.org):

- URL: `https://TU-URL/api/cron?secret=TU_CRON_SECRET`
- Intervalo: **cada 5 minutos**
- Método: GET

Eso despierta el servidor y ejecuta un scan + Telegram.

## Verificar

```bash
curl https://TU-URL/api/health
curl -X POST https://TU-URL/api/telegram/test
curl "https://TU-URL/api/cron?secret=TU_CRON_SECRET"
```

## X 24/7 sin login

En producción el radar lee X vía **Nitter multi-instancia** (4 mirrors).
No requiere sesión ni API de pago. Cuentas: @federalreserve, @Reuters,
@business, @FXStreet, @whale_alert, @SEC_News, @ecb.

Si quieres scraping con navegador (VPS con Desktop), pon
`X_BROWSER_DISABLED=false` y ejecuta `npm run x:login` una vez.
