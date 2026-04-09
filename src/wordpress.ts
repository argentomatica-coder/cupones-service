import { ExtractedCoupons, Coupon } from './extractor';

const getFlagEmoji = (code: string): string => {
  const map: Record<string, string> = {
    ES:'🇪🇸', FR:'🇫🇷', BR:'🇧🇷', US:'🇺🇸', UK:'🇬🇧',
    DE:'🇩🇪', IT:'🇮🇹', PL:'🇵🇱', NL:'🇳🇱', MX:'🇲🇽',
    AR:'🇦🇷', CL:'🇨🇱', CO:'🇨🇴', PE:'🇵🇪', UY:'🇺🇾',
    VE:'🇻🇪', EC:'🇪🇨', GLOBAL:'🌍', GCC:'🇸🇦', IL:'🇮🇱',
  };
  return map[code.toUpperCase()] || '🏳️';
};

const getCountryName = (code: string): string => {
  const map: Record<string, string> = {
    ES:'España', FR:'Francia', BR:'Brasil', US:'Estados Unidos', UK:'Reino Unido',
    DE:'Alemania', IT:'Italia', PL:'Polonia', NL:'Holanda', MX:'México',
    AR:'Argentina', CL:'Chile', CO:'Colombia', PE:'Perú', UY:'Uruguay',
    VE:'Venezuela', EC:'Ecuador', GLOBAL:'Global (todos los países)',
    GCC:'Arabia / Golfo', IL:'Israel',
  };
  return map[code.toUpperCase()] || code;
};

// Genera HTML compatible con el parser de cupones.html
function generateCouponsHTML(data: ExtractedCoupons): string {
  const byCountry: Record<string, Coupon[]> = {};
  for (const coupon of data.coupons) {
    const countries = coupon.countries?.length ? coupon.countries : ['GLOBAL'];
    for (const country of countries) {
      const key = country.toUpperCase();
      if (!byCountry[key]) byCountry[key] = [];
      if (!byCountry[key].find(c => c.code === coupon.code)) {
        byCountry[key].push(coupon);
      }
    }
  }

  const sortedKeys = Object.keys(byCountry).sort((a, b) => {
    if (a === 'ES') return -1; if (b === 'ES') return 1;
    if (a === 'GLOBAL') return -1; if (b === 'GLOBAL') return 1;
    return a.localeCompare(b);
  });

  let innerHtml = '';
  for (const key of sortedKeys) {
    const flag = getFlagEmoji(key);
    const name = getCountryName(key);
    const coupons = byCountry[key];

    const rows = coupons.map(c => {
      // Formatear fecha legible
      let expiry = '';
      if (c.validFrom && c.validUntil) {
        const from = new Date(c.validFrom + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const until = new Date(c.validUntil + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        expiry = `Del ${from} al ${until}`;
      } else if (c.validUntil) {
        const until = new Date(c.validUntil + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        expiry = `Válido hasta el ${until}`;
      }

      return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f4f6fb;flex-wrap:wrap;gap:8px;">
              <div>
                <span style="color:#d4450c;font-size:1.1rem;font-weight:800;">${c.discount}</span>
                ${c.minPurchase ? `<span style="color:#5a6a82;font-size:0.85rem;margin-left:6px;">en compras ${c.minPurchase}</span>` : ''}
                <div style="font-size:0.8rem;color:#5a6a82;margin-top:2px;">Código para ${name}</div>
                ${expiry ? `<div style="font-size:0.75rem;color:#aaa;margin-top:2px;">⏰ ${expiry}</div>` : ''}
              </div>
              <code onclick="navigator.clipboard.writeText('${c.code}');this.textContent='¡Copiado!';setTimeout(()=>this.textContent='${c.code}',1500);"
                style="background:#1a4fa0;color:#fff;padding:6px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.95rem;user-select:all;"
                title="Click para copiar">${c.code}</code>
            </div>`;
    }).join('');

    innerHtml += `
      <div style="margin-bottom:16px;border:1px solid #dde4f0;border-radius:12px;overflow:hidden;">
        <div style="background:#eef3fc;padding:10px 16px;font-weight:700;font-size:0.95rem;color:#1a4fa0;">
          ${flag} Cupones ${name}
        </div>
        <div style="padding:16px;">
          ${rows}
        </div>
      </div>`;
  }

  const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:20px;background:#f4f6fb;border-radius:16px;border:1px solid #dde4f0;">
      <h3 style="font-size:1rem;color:#0f1a2e;margin:0 0 16px;border-left:4px solid #d4450c;padding-left:12px;">
        🏷️ Actualización — ${dateStr}
      </h3>
      ${innerHtml}
      <p style="font-size:0.7rem;color:#aaa;text-align:center;margin-top:16px;">
        Links de afiliado · El precio que pagás es el mismo que en AliExpress directo
      </p>
    </div>`;
}

// Publica un nuevo post en la categoría de cupones (compatible con cupones.html)
export async function updateWordPressCouponsPage(data: ExtractedCoupons): Promise<void> {
  const baseUrl = process.env.WP_SITE_URL?.replace(/\/$/, '');
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_PASSWORD;
  const categoryId = parseInt(process.env.WP_COUPONS_PAGE_ID || '33');

  if (!baseUrl || !username || !password) {
    throw new Error('Faltan variables WP_SITE_URL, WP_USERNAME o WP_PASSWORD');
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const html = generateCouponsHTML(data);
  const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const body = {
    title: `Cupones AliExpress — ${dateStr}`,
    content: html,
    status: 'publish',
    categories: [categoryId],
  };

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
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

  const post = await res.json() as any;
  console.log(`✅ Post de cupones publicado (ID: ${post.id})`);
}
