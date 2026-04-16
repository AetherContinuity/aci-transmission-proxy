// ACI Fingrid Transmission Proxy — v4: oikea header x-api-key

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const ALLOWED = new Set([24,26,25,27,70,71,180,31,32,44,39,105,74]);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const ds    = Number(url.searchParams.get('ds'));
    const start = url.searchParams.get('start');
    const end   = url.searchParams.get('end');
    const size  = url.searchParams.get('size') || '168';

    if (!ds || !ALLOWED.has(ds)) {
      return new Response(JSON.stringify({
        error: `DS ${ds} not supported`, allowed: [...ALLOWED]
      }), { status: 400, headers: CORS });
    }

    const apiKey = env.FINGRID_NEW_API_KEY || '';
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No API key configured' }),
        { status: 500, headers: CORS });
    }

    let apiUrl = `https://data.fingrid.fi/api/datasets/${ds}/data?format=json&pageSize=${size}&sortOrder=desc`;
    if (start) apiUrl += `&startTime=${encodeURIComponent(start)}`;
    if (end)   apiUrl += `&endTime=${encodeURIComponent(end)}`;

    try {
      const resp = await fetch(apiUrl, {
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'ACI-Transmission-Proxy/4.0'
        }
      });

      const text = await resp.text();

      if (!resp.ok) {
        return new Response(JSON.stringify({
          error: `Fingrid API ${resp.status}`,
          preview: text.slice(0, 200),
          hasKey: !!apiKey,
          keyLength: apiKey.length,
          ds
        }), { status: resp.status, headers: CORS });
      }

      const json = JSON.parse(text);
      const rows = json.data || (Array.isArray(json) ? json : []);
      return new Response(JSON.stringify({
        data: rows,
        ds,
        total: json.pagination?.total ?? rows.length,
        fetched: new Date().toISOString()
      }), { headers: CORS });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, ds }),
        { status: 500, headers: CORS });
    }
  }
};
