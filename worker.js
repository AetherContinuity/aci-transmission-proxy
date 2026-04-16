// ACI Fingrid Transmission Proxy — v4: oikea header x-api-key

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const ALLOWED = new Set([
  // NTC kapasiteetit (day-ahead)
  24,   // SE1→FI
  26,   // FI→SE1
  25,   // SE3→FI
  27,   // FI→SE3
  112,  // EE→FI
  115,  // FI→EE
  // Fyysinen siirto MW (15 min)
  60,   // FI↔SE1 power
  61,   // FI↔SE3 power
  57,   // FI↔NO power
  55,   // FI↔EE power
  180,  // FI↔EE EstLink (3 min)
  // Fyysinen siirto MWh (15 min) — energiadimensio
  404,  // FI↔SE1 energy
  403,  // FI↔SE3 energy
  405,  // FI↔NO energy
  406,  // FI↔EE energy
  // Kaupallinen siirto
  31,   // FI↔SE1 commercial
  32,   // FI↔SE3 commercial
  140,  // FI↔EE commercial
  // TSO-tukiteho
  382,  // Agreed supportive power FI-SE1
  383,  // Agreed supportive power FI-SE3
  384,  // Agreed supportive power FI-EE
  // mFRR
  378,  // mFRR flow FI-SE1
  379,  // mFRR flow FI-SE3
  380,  // mFRR flow FI-EE
  // Jakeluverkko — kulutus
  363,  // Kokonaiskulutus jakeluverkoissa (kWh/h)
  360,  // Kulutus käyttäjäryhmittäin
  365,  // Kulutuksen keskihajonta käyttäjäryhmittäin
  362,  // Pientuotannon ylijäämä tuotantotyypeittäin
  358,  // Kulutus asiakastyypin mukaan
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
