# Despliegue 24/7 — Radar Financiero

El radar debe correr en un servidor permanente para enviarte Telegram aunque
apagues tu PC. Esta guía usa **Railway** (recomendado) o **Render**.

## Variables de entorno (obligatorias)

```
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id_aqui
TELEGRAM_TIMEZONE=Etc/GMT+6
X_BROWSER_DISABLED=true
X_API_DISABLED=true
CRON_SECRET=elige_un_secreto_largo
NEXT_PUBLIC_APP_URL=https://radar-financiero-production.up.railway.app
ALERTS_LOCALE=es
FINNHUB_API_KEY=tu_clave_finnhub
FRED_API_KEY=tu_clave_fred
RADAR_STATE_DIR=/data
```

`FINNHUB_API_KEY` es **recomendada** para consenso Wall Street automático (CPI, NFP, PCE, PPI) vía calendario económico. Gratis en [finnhub.io/register](https://finnhub.io/register).

`FRED_API_KEY` es **recomendada** para el yield **real** 10Y TIPS (serie `DFII10`). Gratis en [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html). Sin ella el radar usa `^TNX` nominal con etiqueta explícita de proxy.

## Persistencia (Volume Railway — obligatorio para digests)

El digest y el dedup se guardan en disco. Sin volumen, Railway borra `/tmp` en cada redeploy y se pierden noticias en cola.

1. En el servicio Railway → **Settings** → **Volumes** → **Add Volume**
2. Mount path: `/data`
3. Variable (opcional, ya viene en la imagen): `RADAR_STATE_DIR=/data`
4. Redeploy

Verifica en `GET /api/health`:
```json
{ "stateDir": "/data", "statePersistent": true, "stateWritable": true }
```

Si ves `statePersistent: false`, el volumen no está montado.

## Telegram — grupo (2+ personas)

1. Crea un grupo e invita a los miembros
2. Añade **@radar_financiero_2026_bot** y hazlo **administrador**
3. Escribe un mensaje en el grupo (ej. `hola`)
4. Obtén el ID del grupo abriendo en el navegador (sustituye `TU_TOKEN`):
   `https://api.telegram.org/botTU_TOKEN/getUpdates`
5. Busca `"chat":{"id":-100xxxxxxxxxx` — ese número **negativo** es `TELEGRAM_CHAT_ID`
6. Actualiza la variable en Railway y redeploy
7. Prueba con `POST /api/telegram/test`

**Grupo + chat privado:** `-1001234567890,6458076817` (IDs separados por coma)

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

## Backup — Cron externo (IMPORTANTE para 24/7)

Configura un cron gratis en [cron-job.org](https://cron-job.org) — **sin esto el radar puede quedarse sin enviar Telegram si el poller interno no arranca**:

1. Crea cuenta en cron-job.org
2. **Create cronjob**
3. URL: `https://radar-financiero-production.up.railway.app/api/cron?secret=TU_CRON_SECRET`
   - Usa el **mismo** `CRON_SECRET` que tienes en Railway Variables
4. Intervalo: **cada 5 minutos**
5. Método: GET

Esto ejecuta scan + Telegram cada 5 min. Los resúmenes salen a las **7:00** y **16:30** (CR). Si Railway estaba dormido a esa hora, el resumen se envía en el **primer wake** del día (catch-up). Sin cron externo, el plan free puede dormir y perder la ventana.

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
