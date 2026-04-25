exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  const type = p.type;
  const BASE = 'https://api.tradier.com/v1';
  const AUTH = { 'Authorization': `Bearer ${process.env.Tradier_Token}`, 'Accept': 'application/json' };
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (!type) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing type parameter' }) };

  let url;
  try {
    if (type === 'quotes') {
      const symbols = p.symbols;
      if (!symbols) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbols' }) };
      url = `${BASE}/markets/quotes?symbols=${symbols}&greeks=false`;
    } else if (type === 'history') {
      const { symbol, interval, start, end } = p;
      if (!symbol) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbol' }) };
      const params = new URLSearchParams({ symbol, interval: interval || 'daily' });
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      url = `${BASE}/markets/history?${params.toString()}`;
    } else if (type === 'options') {
      const { symbol, expiration } = p;
      if (!symbol) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbol' }) };
      const params = new URLSearchParams({ symbol, greeks: 'true' });
      if (expiration) params.append('expiration', expiration);
      url = `${BASE}/markets/options/chains?${params.toString()}`;
    } else if (type === 'expirations') {
      const { symbol } = p;
      if (!symbol) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbol' }) };
      url = `${BASE}/markets/options/expirations?symbol=${symbol}&includeAllRoots=true&strikes=false`;
    } else {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unknown type: ${type}` }) };
    }

    const res = await fetch(url, { headers: AUTH });
    const data = await res.json();
    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
