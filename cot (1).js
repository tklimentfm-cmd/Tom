// /api/cot.js — Vercel Serverless Function
// Zkouší více zdrojů dat pro spolehlivost

const INSTRUMENTS = {
  EUR: { code: '099741', label: 'EUR/USD' },
  GBP: { code: '096742', label: 'GBP/USD' },
  JPY: { code: '097741', label: 'JPY/USD' },
  AUD: { code: '232741', label: 'AUD/USD' },
  CAD: { code: '090741', label: 'CAD/USD' },
  CHF: { code: '092741', label: 'CHF/USD' },
  DXM: { code: '098662', label: 'DXM (USD Index)' },
};

async function fetchWithTimeout(url, ms = 9000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'cot-dashboard/1.0' }
    });
    clearTimeout(id);
    return r;
  } catch(e) { clearTimeout(id); throw e; }
}

function parseRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(row => ({
      date:  String(row.report_date_as_yyyy_mm_dd ?? row.as_of_date ?? '').split('T')[0],
      long:  parseInt(row.noncomm_positions_long_all  ?? row.noncomm_long_all  ?? 0, 10) || 0,
      short: parseInt(row.noncomm_positions_short_all ?? row.noncomm_short_all ?? 0, 10) || 0,
    }))
    .filter(r => r.date && (r.long > 0 || r.short > 0))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const symbol = (req.query.symbol || 'EUR').toUpperCase();
  const limit  = Math.min(parseInt(req.query.limit || '30', 10), 60);
  const inst   = INSTRUMENTS[symbol];
  if (!inst) return res.status(400).json({ error: `Neznámý symbol: ${symbol}` });

  const errors = [];

  // ── Zdroj 1: CFTC Socrata (primární) ────────────────────────────────
  try {
    const url = `https://publicreporting.cftc.gov/resource/6dca-aqww.json`
      + `?cftc_commodity_code=${inst.code}`
      + `&$order=report_date_as_yyyy_mm_dd+DESC`
      + `&$limit=${limit}`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = parseRows(await r.json());
    if (data.length > 0) {
      return res.status(200).json({ symbol, label: inst.label, source: 'CFTC', updated: new Date().toISOString(), count: data.length, data });
    }
    errors.push('CFTC: prázdná data');
  } catch(e) { errors.push(`CFTC: ${e.message}`); }

  // ── Zdroj 2: Nasdaq Data Link mirror ────────────────────────────────
  try {
    const url = `https://data.nasdaq.com/api/v3/datasets/CFTC/${inst.code}_FO_ALL.json?rows=${limit}&api_key=DEMO`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    const cols = json.dataset?.column_names || [];
    const rows = json.dataset?.data || [];
    const li = cols.findIndex(c => /Non-Commercial Long/i.test(c));
    const si = cols.findIndex(c => /Non-Commercial Short/i.test(c));
    if (li < 0 || si < 0) throw new Error('Neznámé sloupce');
    const mapped = rows.map(row => ({
      report_date_as_yyyy_mm_dd: row[0],
      noncomm_positions_long_all:  row[li],
      noncomm_positions_short_all: row[si],
    }));
    const data = parseRows(mapped);
    if (data.length > 0) {
      return res.status(200).json({ symbol, label: inst.label, source: 'Nasdaq', updated: new Date().toISOString(), count: data.length, data });
    }
    errors.push('Nasdaq: prázdná data');
  } catch(e) { errors.push(`Nasdaq: ${e.message}`); }

  return res.status(502).json({ error: 'Všechny zdroje selhaly', details: errors, symbol });
}
