import { ExtractedCoupons, Coupon } from './extractor';

// Formatea fecha de YYYY-MM-DD a "16 de marzo"
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

// Genera el HTML del post de cupones con acordeón por país
function generateCouponsHTML(data: ExtractedCoupons): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const uid = `ao${Date.now()}`;

  const byCountry: Record<string, Coupon[]> = {};
  for (const coupon of data.coupons) {
    const countries = coupon.countries?.length ? coupon.countries : ['GLOBAL'];
    for (const country of countries) {
      if (!byCountry[country]) byCountry[country] = [];
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

  const couponCard = (c: Coupon) => {
    const dateRange = c.validFrom && c.validUntil
      ? `Del ${formatDate(c.validFrom)} al ${formatDate(c.validUntil)}`
      : c.validUntil
      ? `Válido hasta el ${formatDate(c.validUntil)}`
      : '';
    return `
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
  <div style="flex:1;min-width:180px;">
    <div style="font-size:1.15rem;font-weight:800;color:#111;letter-spacing:0.5px;font-family:'Courier New',monospace;">${c.code}</div>
    <div style="font-size:13px;color:#444;margin-top:3px;font-weight:500;">${c.discount}${c.minPurchase ? ` · ${c.minPurchase}` : ''}</div>
    ${dateRange ? `<div style="font-size:11px;color:#aaa;margin-top:3px;">⏱ ${dateRange}</div>` : ''}
  </div>
  <button
    onclick="(function(btn,code){navigator.clipboard.writeText(code).then(function(){btn.textContent='✓ Copiado!';btn.style.background='#1a7a4a';setTimeout(function(){btn.textContent='Copiar';btn.style.background='#e8390e';},2000);})})(this,'${c.code}')"
    style="background:#e8390e;color:#fff;border:none;padding:10px 16px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background 0.2s;">
    Copiar
  </button>
</div>`;
  };

  // Ordenar: ES primero, luego GLOBAL, luego resto alfabético
  const sorted = Object.entries(byCountry).sort(([a], [b]) => {
    if (a === 'ES') return -1;
    if (b === 'ES') return 1;
    if (a === 'GLOBAL') return -1;
    if (b === 'GLOBAL') return 1;
    return a.localeCompare(b);
  });

  const accordions = sorted.map(([country, coupons], idx) => {
    const name = countryNames[country] || `🌐 ${country}`;
    const count = coupons.length;
    const isFirst = idx === 0;
    const accId = `${uid}_${country}`;
    return `
<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:8px;">
  <div id="hdr_${accId}"
    onclick="(function(){var b=document.getElementById('bdy_${accId}');var h=document.getElementById('hdr_${accId}');var a=document.getElementById('arr_${accId}');var open=b.style.display!=='none';b.style.display=open?'none':'block';a.style.transform=open?'rotate(0deg)':'rotate(180deg)';h.style.background=open?'#fff':'#fafafa';})()"
    style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;background:${isFirst ? '#fafafa' : '#fff'};user-select:none;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;line-height:1;">${name.split(' ')[0]}</span>
      <span style="font-size:14px;font-weight:700;color:#111;">${name.split(' ').slice(1).join(' ')}</span>
      <span style="font-size:11px;color:#aaa;font-weight:400;">${count} ${count === 1 ? 'cupón' : 'cupones'}</span>
    </div>
    <div id="arr_${accId}" style="transform:${isFirst ? 'rotate(180deg)' : 'rotate(0deg)'};transition:transform 0.2s;width:20px;height:20px;background:${isFirst ? '#111' : '#f5f5f5'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:${isFirst ? '#fff' : '#888'};">▼</div>
  </div>
  <div id="bdy_${accId}" style="display:${isFirst ? 'block' : 'none'};border-top:1px solid #f0f0f0;padding:12px;background:#fafafa;">
    ${coupons.map(couponCard).join('')}
  </div>
</div>`;
  }).join('');

  return `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<div id="${uid}" style="font-family:'Inter',sans-serif;max-width:680px;margin:0 auto;">
<style>#${uid},#${uid} *{font-family:'Inter',sans-serif!important;box-sizing:border-box;}#${uid} p{margin:0;}</style>

<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
  <span style="background:#111;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:4px;">ArgentOfertas</span>
  <span style="background:#fff1ee;color:#993C1D;border:1px solid #F0997B;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:4px;">${data.eventName || 'Ofertas activas'}</span>
</div>

<p style="font-size:11px;color:#bbb;margin:6px 0 16px;">Actualizado: ${dateStr}</p>
<p style="font-size:14px;line-height:1.7;color:#555;margin-bottom:20px;">${data.rawSummary}</p>

${accordions}

<p style="font-size:11px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:14px;margin-top:8px;">
  Cupones proporcionados por AliExpress. Pueden expirar sin previo aviso. Links de afiliado — sin coste extra para vos.
</p>
</div>`;
}

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
