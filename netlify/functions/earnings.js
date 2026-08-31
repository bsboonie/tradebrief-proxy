// ╔══════════════════════════════════════════════════════════════════╗
// ║  tradebrief-proxy — earnings.js                                  ║
// ║  Alpha Vantage EARNINGS_CALENDAR → filtered JSON                 ║
// ║  Built: 2026-08-28  ·  for TradeBrief v7.15.0                    ║
// ║                                                                  ║
// ║  Env var required:  ALPHAVANTAGE_KEY                             ║
// ║  Requires Node 18+ (global fetch)                                ║
// ║                                                                  ║
// ║  GET /.netlify/functions/earnings?symbols=AAPL,MSFT[&horizon=]   ║
// ║  → { ok, horizon, count, fetchedAt, dates:{ TICKER:'YYYY-MM-DD'} }║
// ║                                                                  ║
// ║  Always returns HTTP 200. Check `ok` and `dates`, not res.ok.    ║
// ║  Does NOT touch tradier.js or any existing route.                ║
// ╚══════════════════════════════════════════════════════════════════╝

const AV_BASE = 'https://www.alphavantage.co/query';

// Minimal RFC4180-ish CSV line splitter.
// Required: AV company names contain commas ("Alphabet, Inc") and are quoted.
// A naive split(',') shifts every column after `name` and corrupts reportDate.
function splitCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }  // escaped quote
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function reply(headers, payload) {
  return { statusCode: 200, headers, body: JSON.stringify(payload) };
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const key = process.env.ALPHAVANTAGE_KEY;
  if (!key) {
    return reply(headers, { ok: false, error: 'ALPHAVANTAGE_KEY not set in Netlify env', dates: {} });
  }

  const q = event.queryStringParameters || {};

  const horizon = ['3month', '6month', '12month'].includes(q.horizon) ? q.horizon : '3month';

  const wanted = String(q.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const want = wanted.length ? new Set(wanted) : null;   // no symbols = return everything

  try {
    const url = `${AV_BASE}?function=EARNINGS_CALENDAR&horizon=${horizon}&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    const text = (await res.text()).trim();

    // AV signals rate limits / bad keys as JSON with a 200 status.
    if (text.startsWith('{')) {
      let msg = 'Alpha Vantage returned an error object';
      try {
        const j = JSON.parse(text);
        msg = j.Note || j.Information || j['Error Message'] || msg;
      } catch (e) { /* keep default */ }
      return reply(headers, { ok: false, error: msg, dates: {} });
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length < 2) {
      return reply(headers, { ok: false, error: 'Empty calendar payload', dates: {} });
    }

    const head = splitCSVLine(lines[0]).map(h => h.trim());
    const iSym = head.indexOf('symbol');
    const iDate = head.indexOf('reportDate');
    if (iSym < 0 || iDate < 0) {
      return reply(headers, {
        ok: false,
        error: 'Unexpected CSV shape — columns: ' + head.join('|'),
        dates: {}
      });
    }

    const dates = {};
    let scanned = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const sym = String(cols[iSym] || '').trim().toUpperCase();
      const d = String(cols[iDate] || '').trim();
      if (!sym) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      scanned++;
      if (want && !want.has(sym)) continue;
      // A ticker can appear more than once in a 6/12month horizon — keep the soonest.
      if (!dates[sym] || d < dates[sym]) dates[sym] = d;
    }

    return reply(headers, {
      ok: true,
      horizon,
      count: Object.keys(dates).length,
      scanned,
      fetchedAt: new Date().toISOString(),
      dates
    });

  } catch (e) {
    return reply(headers, {
      ok: false,
      error: String((e && e.message) || e),
      dates: {}
    });
  }
};
