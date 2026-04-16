// ACI Fingrid Transmission Proxy — v3: kokeile eri header-nimiä

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const ALLOWED = new Set([24,26,25,27,70,71,180,31,32,44,39]);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const ds   = Number(url.searchParams.get('ds'));
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
      return new Response(JSON.stringify({
        error: 'No API key', envKeys: Object.keys(env)
      }), { status: 500, headers: CORS });
    }

    let apiUrl = `https://data.fingrid.fi/api/datasets/${ds}/data?format=json&pageSize=${size}&sortOrder=desc`;
    if (start) apiUrl += `&startTime=${encodeURIComponent(start)}`;
    if (end)   apiUrl += `&endTime=${encodeURIComponent(end)}`;

    // Kokeile subscription key myös query paramina varmuuden vuoksi
    const apiUrlWithKey = apiUrl + `&subscription-key=${encodeURIComponent(apiKey)}`;

    const results = {};

    // Testi 1: x-functions-key header
    try {
      const r1 = await fetch(apiUrl, {
        headers: { 'x-functions-key': apiKey, 'Accept': 'application/json' }
      });
      const t1 = await r1.text();
      results.header_x_functions_key = { status: r1.status, preview: t1.slice(0,100) };
    } catch(e) { results.header_x_functions_key = { error: e.message }; }

    // Testi 2: Ocp-Apim-Subscription-Key header (Azure API Management standardi)
    try {
      const r2 = await fetch(apiUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' }
      });
      const t2 = await r2.text();
      results.header_ocp_apim = { status: r2.status, preview: t2.slice(0,100) };
    } catch(e) { results.header_ocp_apim = { error: e.message }; }

    // Testi 3: query param
    try {
      const r3 = await fetch(apiUrlWithKey, {
        headers: { 'Accept': 'application/json' }
      });
      const t3 = await r3.text();
      results.query_param = { status: r3.status, preview: t3.slice(0,100) };
    } catch(e) { results.query_param = { error: e.message }; }

    return new Response(JSON.stringify({
      debug: true, ds, keyLength: apiKey.length, results
    }), { headers: CORS });
  }
};
