exports.handler = async (event) => {
  const { symbol, expiration, greeks } = event.queryStringParameters || {};
  if (!symbol) return { statusCode: 400, body: 'Missing symbol parameter' };

  const params = new URLSearchParams({ symbol, greeks: greeks || 'true' });
  if (expiration) params.append('expiration', expiration);

  const url = `https://api.tradier.com/v1/markets/options/chains?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.Tradier_Token}`,
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
