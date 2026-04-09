# Argentofertas Cupones Service

Servicio que detecta emails de cupones AliExpress en Gmail y actualiza automáticamente la página de cupones en WordPress.

## Flujo

1. Polling de Gmail cada 30 min buscando emails de `aliexpress@notice.aliexpress.com`
2. Extrae cupones con Gemini/OpenAI
3. Actualiza la página fija de WordPress
4. Marca el email como procesado para no repetirlo

---

## Setup

### 1. Google Cloud Console

1. Ir a https://console.cloud.google.com
2. Crear proyecto nuevo → "argentofertas-cupones"
3. APIs & Services → Library → buscar "Gmail API" → Enable
4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: **Desktop app**
6. Descargar el JSON (tiene `client_id` y `client_secret`)

### 2. Generar el refresh token (una sola vez)

En tu máquina local:

```bash
git clone <este repo>
cd cupones-service
npm install

GMAIL_CLIENT_ID=tu_client_id \
GMAIL_CLIENT_SECRET=tu_client_secret \
npx ts-node src/auth.ts
```

Abrí la URL que aparece, autorizá con tu cuenta Gmail, copiá el código y pegalo en la terminal.
Te va a mostrar el `GMAIL_REFRESH_TOKEN` — guardalo.

### 3. Obtener el ID de la página de cupones en WordPress

En WordPress: Páginas → tu página de cupones → fijate en la URL del editor, el número al final es el ID.
Ej: `https://tusite.com/wp-admin/post.php?post=42&action=edit` → ID es `42`

### 4. Variables de entorno en Railway

```
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
WP_SITE_URL=https://argentofertas.com
WP_USERNAME=tu_usuario_wp
WP_PASSWORD=tu_app_password_wp
WP_COUPONS_PAGE_ID=42
GEMINI_API_KEY=...         # o OPENAI_API_KEY
AI_PROVIDER=gemini         # o openai
POLL_INTERVAL_MINUTES=30   # cada cuántos minutos revisar Gmail
```

### 5. Deploy en Railway

```bash
# Conectar repo a Railway o hacer push directo
railway up
```

El servicio arranca, revisa Gmail inmediatamente y luego cada 30 minutos.

---

## WP App Password

En WordPress: Usuarios → tu usuario → Application Passwords → crear una nueva llamada "cupones-service".
Usá esa contraseña como `WP_PASSWORD` (no tu contraseña normal).
