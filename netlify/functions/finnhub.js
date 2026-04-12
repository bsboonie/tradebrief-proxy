exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  const type = p.type;
  const BASE = 'https://finnhub.io/api/v1';
  const TOKEN = process.env.FINNHUB_TOKEN;
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (!type) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing type parameter' }) };

  let url;
  try {
    if (type === 'earnings') {
      const { symbol } = p;
      if (!symbol) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbol' }) };
      url = `${BASE}/calendar/earnings?symbol=${encodeURIComponent(symbol)}&token=${TOKEN}`;

    } else if (type === 'fundamentals') {
      const { symbol } = p;
      if (!symbol) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbol' }) };
      url = `${BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${TOKEN}`;

    } else if (type === 'news') {
      const { symbol, from, to } = p;
      if (!symbol) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing symbol' }) };
      const params = new URLSearchParams({ symbol, token: TOKEN });
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      url = `${BASE}/company-news?${params.toString()}`;

    } else {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unknown type: ${type}` }) };
    }

    const res = await fetch(url);
    const data = await res.json();
    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
