export interface Coupon {
  code: string;
  discount: string;       // ej: "10€ de descuento" o "15% OFF"
  minPurchase?: string;   // ej: "en pedidos desde 50€"
  validFrom?: string;
  validUntil?: string;
  countries?: string[];   // ej: ["ES", "AR", "MX"]
  currency?: string;
}

export interface ExtractedCoupons {
  eventName: string;
  coupons: Coupon[];
  rawSummary: string;     // Resumen en español para el post
}

// Limpia el HTML del email antes de pasarlo a la IA
function cleanEmailHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/=3D/g, '=')   // quoted-printable
    .replace(/=\r?\n/g, '') // quoted-printable line continuations
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000); // limitar tokens
}

export async function extractCouponsFromEmail(
  emailHtml: string,
  subject: string,
  apiKey: string,
  provider: 'gemini' | 'openai' = 'gemini'
): Promise<ExtractedCoupons> {
  const cleanText = cleanEmailHtml(emailHtml);

  const prompt = `Sos un asistente que extrae cupones de descuento de emails de AliExpress Affiliate Program.

Analizá este email y extraé TODOS los códigos de cupón disponibles.

ASUNTO: ${subject}

CONTENIDO:
${cleanText}

IMPORTANTE:
- Extraé todos los códigos que veas (suelen estar en rojo o destacados, ej: ES10OFF, ILAFF1, GCC1, etc.)
- Para cada cupón identificá: código, descuento (en euros/porcentaje), mínimo de compra si aparece, fecha de validez, y países/regiones a los que aplica
- Si hay cupones para España (ES) priorizalos
- El campo "countries" debe ser un array de códigos de país ISO (ES, AR, MX, CO, etc.)
- El campo "rawSummary" debe ser un párrafo en español natural explicando las ofertas disponibles, útil para SEO (2-4 frases, menciona los descuentos más destacados y las fechas)
- El campo "eventName" es el nombre del evento/campaña (ej: "Anniversary Sale", "Super Deals")

Devolvé SOLO este JSON sin markdown ni explicaciones:
{
  "eventName": "...",
  "coupons": [
    {
      "code": "CODIGO",
      "discount": "X€ de descuento",
      "minPurchase": "en pedidos desde X€",
      "validFrom": "YYYY-MM-DD",
      "validUntil": "YYYY-MM-DD",
      "countries": ["ES", "AR"],
      "currency": "EUR"
    }
  ],
  "rawSummary": "..."
}`;

  if (provider === 'gemini') {
    return callGemini(prompt, apiKey);
  } else {
    return callOpenAI(prompt, apiKey);
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<ExtractedCoupons> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function callOpenAI(prompt: string, apiKey: string): Promise<ExtractedCoupons> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}
