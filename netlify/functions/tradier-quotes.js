exports.handler = async (event) => {
  const symbols = event.queryStringParameters?.symbols;
  if (!symbols) return { statusCode: 400, body: 'Missing symbols parameter' };

  const url = `https://api.tradier.com/v1/markets/quotes?symbols=${encodeURIComponent(symbols)}&greeks=false`;

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
