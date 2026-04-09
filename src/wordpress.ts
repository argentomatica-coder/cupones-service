import { ExtractedCoupons, Coupon } from './extractor';

// Genera el HTML del post de cupones
function generateCouponsHTML(data: ExtractedCoupons): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  // Agrupar cupones por país/región
  const byCountry: Record<string, Coupon[]> = {};
  for (const coupon of data.coupons) {
    const countries = coupon.countries?.length ? coupon.countries : ['GLOBAL'];
    for (const country of countries) {
      if (!byCountry[country]) byCountry[country] = [];
      // Evitar duplicados
      if (!byCountry[country].find(c => c.code === coupon.code)) {
        byCountry[country].push(coupon);
      }
    }
  }

  const countryNames: Record<string, string> = {
    ES: '🇪🇸 España', AR: '🇦🇷 Argentina', MX: '🇲🇽 México',
    CO: '🇨🇴 Colombia', CL: '🇨🇱 Chile', PE: '🇵🇪 Perú',
    BR: '🇧🇷 Brasil', UY: '🇺🇾 Uruguay', VE: '🇻🇪 Venezuela',
    EC: '🇪🇨 Ecuador', US: '🇺🇸 Estados Unidos',
    GLOBAL: '🌍 Global', GCC: '🇸🇦 Arabia / Golfo',
    IN: '🇮🇳 India', IL: '🇮🇱 Israel',
  };

  const couponCard = (c: Coupon) => `
<div style="font-family:'Inter',sans-serif;background:#f7f7f7;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
  <div>
    <div style="font-size:1.3rem;font-weight:800;color:#111;letter-spacing:0.5px;">${c.code}</div>
    <div style="font-size:13px;color:#555;margin-top:3px;">${c.discount}${c.minPurchase ? ` · ${c.minPurchase}` : ''}</div>
    ${c.validUntil ? `<div style="font-size:11px;color:#aaa;margin-top:2px;">Válido hasta ${c.validUntil}</div>` : ''}
  </div>
  <button onclick="navigator.clipboard.writeText('${c.code}').then(()=>{this.textContent='✓ Copiado!';setTimeout(()=>this.textContent='Copiar código',2000)})"
    style="background:#e8390e;color:#fff;border:none;padding:10px 18px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">
    Copiar código
  </button>
</div>`;

  const sections = Object.entries(byCountry)
    // Priorizar ES arriba
    .sort(([a], [b]) => (a === 'ES' ? -1 : b === 'ES' ? 1 : a.localeCompare(b)))
    .map(([country, coupons]) => `
<div style="margin-bottom:24px;">
  <h3 style="font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#111;margin:0 0 10px 0;">${countryNames[country] || `🌐 ${country}`}</h3>
  ${coupons.map(couponCard).join('')}
</div>`).join('');

  return `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<div id="ao-cupones" style="font-family:'Inter',sans-serif;max-width:680px;margin:0 auto;">
<style>#ao-cupones,#ao-cupones *{font-family:'Inter',sans-serif!important;box-sizing:border-box;}</style>

  <!-- HEADER -->
  <div style="background:#111;border-radius:12px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
    <div>
      <div style="color:#fff;font-size:18px;font-weight:800;">Cupones AliExpress activos</div>
      <div style="color:#aaa;font-size:12px;margin-top:4px;">Actualizado: ${dateStr}</div>
    </div>
    <div style="background:#e8390e;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:5px 12px;border-radius:4px;">${data.eventName || 'Ofertas activas'}</div>
  </div>

  <!-- RESUMEN SEO -->
  <p style="font-size:14px;line-height:1.7;color:#555;margin-bottom:24px;">${data.rawSummary}</p>

  <!-- CUPONES POR PAÍS -->
  ${sections}

  <!-- NOTA -->
  <p style="font-size:11px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:16px;margin-top:8px;">
    Los cupones son proporcionados por AliExpress y pueden expirar o cambiar sin previo aviso. Verificá la validez antes de usar. Links de afiliado — el precio que pagás es el mismo que en AliExpress directamente.
  </p>
</div>`;
}

// Actualiza la página fija de cupones en WordPress
export async function updateWordPressCouponsPage(data: ExtractedCoupons): Promise<void> {
  const baseUrl = process.env.WP_SITE_URL?.replace(/\/$/, '');
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_PASSWORD;
  const pageId = process.env.WP_COUPONS_PAGE_ID;

  if (!baseUrl || !username || !password || !pageId) {
    throw new Error('Faltan variables WP_SITE_URL, WP_USERNAME, WP_PASSWORD o WP_COUPONS_PAGE_ID');
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const html = generateCouponsHTML(data);

  const now = new Date();
  const monthYear = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const seoTitle = `Cupones AliExpress ${monthYear} — Códigos activos | ArgentOfertas`;
  const seoDesc = `Cupones y códigos de descuento de AliExpress para ${monthYear}. ${data.rawSummary.slice(0, 100)}...`;

  const body = {
    content: html,
    status: 'publish',
    meta: {
      _yoast_wpseo_title: seoTitle,
      _yoast_wpseo_metadesc: seoDesc,
      rank_math_title: seoTitle,
      rank_math_description: seoDesc,
    },
  };

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/pages/${pageId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  console.log(`✅ Página de cupones actualizada (ID: ${pageId})`);
}
