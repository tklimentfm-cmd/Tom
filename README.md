# COT Forex Dashboard

Live CFTC COT data dashboard pro forex trading — EUR, GBP, JPY, AUD, CAD, CHF, DXM.

## Jak nasadit na Vercel (5 minut)

### Možnost A — přes GitHub (doporučeno)

1. Založ nový repo na [github.com](https://github.com/new)
2. Nahraj všechny soubory z tohoto projektu
3. Jdi na [vercel.com](https://vercel.com) → **Add New Project**
4. Propoj GitHub repo → klikni **Deploy**
5. Hotovo — dostaneš URL jako `cot-dashboard.vercel.app`

### Možnost B — přes Vercel CLI

```bash
npm install -g vercel
cd cot-dashboard
vercel
# Následuj instrukce, za ~1 minutu máš live URL
```

## Struktura projektu

```
cot-dashboard/
├── api/
│   └── cot.js          # Serverless funkce — volá CFTC API (server-side, bez CORS)
├── public/
│   └── index.html      # Frontend dashboard
├── vercel.json         # Routing config
└── package.json
```

## Jak funguje aktualizace

- CFTC vydává nová data každý **pátek v ~21:30 CZ**
- API route cachuje odpověď na **1 hodinu** (`s-maxage=3600`)
- Po pátku stačí otevřít dashboard — data se načtou automaticky

## Páry

| Symbol | Instrument | CFTC kód |
|--------|-----------|----------|
| EUR | Euro FX | 099741 |
| GBP | British Pound | 096742 |
| JPY | Japanese Yen | 097741 |
| AUD | Australian Dollar | 232741 |
| CAD | Canadian Dollar | 090741 |
| CHF | Swiss Franc | 092741 |
| DXM | US Dollar Index | 098662 |

## Přidat další páry

V `api/cot.js` přidej do objektu `INSTRUMENTS`:
```js
NZD: { code: '112741', label: 'NZD/USD' },
```
A v `public/index.html` přidej `'NZD'` do pole `PAIRS`.
