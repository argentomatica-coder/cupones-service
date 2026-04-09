import { google, gmail_v1 } from 'googleapis';

const SENDER = 'aliexpress@notice.aliexpress.com';
const LABEL_PROCESSED = 'cupones-procesados';

export function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

// Busca emails de cupones AliExpress no procesados aún
export async function fetchUnprocessedCouponEmails(): Promise<{ id: string; html: string; subject: string; date: string }[]> {
  const gmail = getGmailClient();

  // Buscar emails del remitente con "coupon" o "code" o "promo" en asunto, no etiquetados como procesados
  const query = `from:${SENDER} (subject:coupon OR subject:code OR subject:promo OR subject:sale OR subject:off) -label:${LABEL_PROCESSED}`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10,
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  const results: { id: string; html: string; subject: string; date: string }[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const html = extractHtmlFromMessage(full.data);
      const subject = extractHeader(full.data, 'Subject') || '';
      const date = extractHeader(full.data, 'Date') || '';

      if (html) {
        results.push({ id: msg.id, html, subject, date });
      }
    } catch (e) {
      console.error(`Error leyendo mensaje ${msg.id}:`, (e as Error).message);
    }
  }

  return results;
}

// Marca el email como procesado añadiendo una etiqueta
export async function markEmailAsProcessed(messageId: string): Promise<void> {
  const gmail = getGmailClient();

  // Obtener o crear la etiqueta
  let labelId: string | undefined;
  try {
    const labelsRes = await gmail.users.labels.list({ userId: 'me' });
    const existing = labelsRes.data.labels?.find(l => l.name === LABEL_PROCESSED);
    if (existing?.id) {
      labelId = existing.id;
    } else {
      const created = await gmail.users.labels.create({
        userId: 'me',
        requestBody: { name: LABEL_PROCESSED, labelListVisibility: 'labelHide', messageListVisibility: 'hide' },
      });
      labelId = created.data.id || undefined;
    }
  } catch {}

  if (labelId) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: { addLabelIds: [labelId] },
    });
  }
}

function extractHtmlFromMessage(message: gmail_v1.Schema$Message): string {
  const payload = message.payload;
  if (!payload) return '';

  // Buscar parte HTML recursivamente
  const findHtml = (part: gmail_v1.Schema$MessagePart): string => {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) {
      for (const p of part.parts) {
        const result = findHtml(p);
        if (result) return result;
      }
    }
    return '';
  };

  return findHtml(payload);
}

function extractHeader(message: gmail_v1.Schema$Message, name: string): string | undefined {
  return message.payload?.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || undefined;
}
