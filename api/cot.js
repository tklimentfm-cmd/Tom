// /api/cot.js — Vercel Serverless Function
// Stahuje COT data z CFTC API server-side (žádný CORS problém)

const INSTRUMENTS = {
  EUR: { code: '099741', label: 'EUR/USD' },
  GBP: { code: '096742', label: 'GBP/USD' },
  JPY: { code: '097741', label: 'JPY/USD' },
  AUD: { code: '232741', label: 'AUD/USD' },
  CAD: { code: '090741', label: 'CAD/USD' },
  CHF: { code: '092741', label: 'CHF/USD' },
  DXM: { code: '098662', label: 'DXM (USD Index)' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  const symbol = (req.query.symbol || 'EUR').toUpperCase();
  const limit  = parseInt(req.query.limit || '30', 10);

  const inst = INSTRUMENTS[symbol];
  if (!inst) {
    return res.status(400).json({ error: `Unknown symbol: ${symbol}. Valid: ${Object.keys(INSTRUMENTS).join(', ')}` });
  }

  try {
    const url = `https://publicreporting.cftc.gov/resource/6dca-aqww.json` +
      `?cftc_commodity_code=${inst.code}` +
      `&$order=report_date_as_yyyy_mm_dd DESC` +
      `&$limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`CFTC API error: ${response.status}`);

    const raw = await response.json();

    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error('CFTC vrátilo prázdná data');
    }

    // Seřadit od nejstaršího, zkusit všechny varianty názvů polí
    const data = raw
      .reverse()
      .map(row => {
        const longVal  = row.noncomm_positions_long_all  ?? row.noncomm_long_all  ?? row.long_all  ?? 0;
        const shortVal = row.noncomm_positions_short_all ?? row.noncomm_short_all ?? row.short_all ?? 0;
        const dateVal  = row.report_date_as_yyyy_mm_dd   ?? row.as_of_date_in_form_yymmdd ?? '';
        return {
          date:  String(dateVal).split('T')[0],
          long:  parseInt(longVal,  10) || 0,
          short: parseInt(shortVal, 10) || 0,
        };
      })
      .filter(r => r.date && (r.long > 0 || r.short > 0));

    if (data.length === 0) throw new Error('Nepodařilo se zparsovat žádná data z CFTC');

    return res.status(200).json({
      symbol,
      label: inst.label,
      updated: new Date().toISOString(),
      count: data.length,
      data,
    });

  } catch (err) {
    console.error('COT fetch error:', err);
    return res.status(502).json({ error: err.message });
  }
}
