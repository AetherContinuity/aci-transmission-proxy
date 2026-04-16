// ACI Fingrid Transmission Proxy — Cloudflare Worker
// Hakee siirtodatan Fingridin uudesta API:sta (vaatii subscription key)
// Endpoint: GET /?ds=24&start=...&end=...&size=100

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Sallitut siirtodatasetit
const ALLOWED = new Set([
  24,   // NTC SE1→FI (day-ahead kapasiteetti)
  26,   // NTC FI→SE1
  25,   // NTC SE3→FI
  27,   // NTC FI→SE3
  70,   // Congestion income FI-SE1
  71,   // Congestion income FI-SE3
  180,  // Fyysinen siirto FI↔EE (EstLink, 3min)
  31,   // Commercial flow FI↔SE1
  32,   // Commercial flow FI↔SE3
  44,   // Intraday capacity FI→SE1
  39,   // Intraday capacity SE3→FI
]);

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

    // Validointi
    if (!ds || !ALLOWED.has(ds)) {
      return new Response(JSON.stringify({
        error: `DS ${ds} not supported. Allowed: ${[...ALLOWED].join(', ')}`
      }), { status: 400, headers: CORS });
    }

    const apiKey = env.FINGRID_NEW_API_KEY || '';
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FINGRID_NEW_API_KEY not configured' }),
        { status: 500, headers: CORS });
    }

    // Fingrid uusi API endpoint
    let apiUrl = `https://data.fingrid.fi/api/datasets/${ds}/data?format=json&pageSize=${size}&sortOrder=desc`;
    if (start) apiUrl += `&startTime=${encodeURIComponent(start)}`;
    if (end)   apiUrl += `&endTime=${encodeURIComponent(end)}`;

    try {
      const resp = await fetch(apiUrl, {
        headers: {
          'x-functions-key': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'ACI-Transmission-Proxy/1.0'
        }
      });

      if (!resp.ok) {
        const text = await resp.text();
        return new Response(JSON.stringify({
          error: `Fingrid API ${resp.status}`,
          preview: text.slice(0, 200),
          ds, apiUrl: apiUrl.split('?')[0]
        }), { status: resp.status, headers: CORS });
      }

      const json = await resp.json();
      // Normalisoi: palauta { data: [...], ds, total }
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
