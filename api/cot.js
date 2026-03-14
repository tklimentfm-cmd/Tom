// /api/cot.js — čte z data/cot.json (aktualizuje GitHub Action každý pátek)
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const symbol = (req.query.symbol || 'EUR').toUpperCase();

  try {
    const filePath = join(process.cwd(), 'data', 'cot.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

    if (!raw.pairs || !raw.pairs[symbol]) {
      return res.status(404).json({ error: `Symbol ${symbol} nenalezen v datech` });
    }

    const pair = raw.pairs[symbol];
    return res.status(200).json({
      symbol,
      label:   pair.label,
      updated: raw.updated,
      count:   pair.data.length,
      data:    pair.data,
    });

  } catch(e) {
    return res.status(500).json({ error: `Chyba čtení dat: ${e.message}` });
  }
}
