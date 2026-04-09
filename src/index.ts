import { fetchUnprocessedCouponEmails, markEmailAsProcessed } from './gmail';
import { extractCouponsFromEmail } from './extractor';
import { updateWordPressCouponsPage } from './wordpress';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MINUTES || '30') * 60 * 1000;
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini') as 'gemini' | 'openai';
const AI_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function processCouponEmails(): Promise<void> {
  log('🔍 Buscando emails de cupones...');

  let emails;
  try {
    emails = await fetchUnprocessedCouponEmails();
  } catch (e) {
    log(`❌ Error buscando emails: ${(e as Error).message}`);
    return;
  }

  if (emails.length === 0) {
    log('ℹ️  No hay emails nuevos de cupones');
    return;
  }

  log(`📧 Encontrados ${emails.length} email(s) para procesar`);

  for (const email of emails) {
    log(`📨 Procesando: "${email.subject}"`);
    try {
      // Extraer cupones con IA
      const coupons = await extractCouponsFromEmail(
        email.html,
        email.subject,
        AI_KEY,
        AI_PROVIDER
      );

      log(`🏷️  Extraídos ${coupons.coupons.length} cupones (evento: ${coupons.eventName})`);

      if (coupons.coupons.length === 0) {
        log('⚠️  No se encontraron cupones en este email, saltando...');
        await markEmailAsProcessed(email.id);
        continue;
      }

      // Actualizar WordPress
      await updateWordPressCouponsPage(coupons);

      // Marcar como procesado para no repetir
      await markEmailAsProcessed(email.id);

      log(`✅ Email procesado y WordPress actualizado`);

    } catch (e) {
      log(`❌ Error procesando email ${email.id}: ${(e as Error).message}`);
      // No marcamos como procesado para reintentar en el próximo ciclo
    }
  }
}

async function main() {
  log('🚀 Argentofertas Cupones Service iniciado');
  log(`⏱️  Polling cada ${POLL_INTERVAL_MS / 60000} minutos`);
  log(`🤖 Proveedor IA: ${AI_PROVIDER}`);

  // Validar variables de entorno requeridas
  const required = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'WP_SITE_URL', 'WP_USERNAME', 'WP_PASSWORD', 'WP_COUPONS_PAGE_ID'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    log(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!AI_KEY) {
    log('❌ Falta GEMINI_API_KEY o OPENAI_API_KEY');
    process.exit(1);
  }

  // Primera ejecución inmediata
  await processCouponEmails();

  // Luego polling periódico
  setInterval(processCouponEmails, POLL_INTERVAL_MS);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
