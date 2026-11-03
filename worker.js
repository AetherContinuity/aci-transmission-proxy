// ACI Fingrid Transmission Proxy — v7: inactive-varoitus, ID-kapasiteetit 38/39/44/45/110/113
// v6: luettelohaku (?catalog= / ?meta=)
// v5: lisätty DS 245/246 tuuliennuste

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
  // Congestion income
  70,   // Congestion income FI-SE1
  71,   // Congestion income FI-SE3
  48,   // Congestion income FI-EE
  // Muut
  369,  // mFRR säätösuunta (-1/0/1)
  396,  // CO2 päästökerroin gCO2/kWh
  395,  // Fossiilittoman tuotannon osuus %
  342,  // Aktivoitu mFRR MW
  382,  // Agreed supportive power FI-SE1
  383,  // Agreed supportive power FI-SE3
  384,  // Agreed supportive power FI-EE
  // Järjestelmän tila
  336,  // Electricity shortage status 0-3 (3 min) — suora Black Period -mittari
  209,  // Power system state (3 min)
  177,  // Frequency Hz (3 min)
  198,  // Surplus/deficit real-time MW (3 min)
  186,  // Surplus/deficit cumulative MW (3 min)
  // Sisäinen siirto
  30,   // Transmission north to south (1 min) — ainoa sisäinen siirtomittari
  87,   // SE1→FI real-time (3 min) — WEM §12 TRR
  89,   // SE3→FI real-time (3 min)
  187,  // NO→FI real-time (3 min)
  194,  // Net import/export real-time (3 min)
  28,   // Planned weekly capacity north to south
  29,   // Planned weekly capacity south to north
  // OL3 ja tuotanto
  372,  // OL3 protection scheme forecast MW/h
  188,  // Nuclear power production real-time (3 min)
  191,  // Hydro power production real-time (3 min)
  181,  // Wind power production real-time (3 min)
  201,  // CHP district heating real-time (3 min)
  202,  // Industrial cogeneration real-time (3 min)
  205,  // Reserve power plants real-time (3 min)
  // CO2
  265,  // CO2 emission factor real-time (3 min)
  266,  // CO2 emission factor production real-time (3 min)
  // Lämpötila
  178,  // Temperature Helsinki (3 min)
  182,  // Temperature Jyväskylä (3 min)
  185,  // Temperature Rovaniemi (3 min)
  196,  // Temperature Oulu (3 min)
  // Akut
  398,  // Battery storage discharging (3 min)
  399,  // Battery storage charging (3 min)
  424,  // Total installed battery capacity MW
  // Sähköpula-indikaattorit
  183,  // Peak load power real-time (3 min)
  371,  // Electric boiler consumption (1 min)
  // Tuuliennuste
  245,  // Wind power forecast 72h (15 min updates)
  246,  // Wind power forecast 24h (daily update)
  // Päivänsisäisen markkinan vapaa siirtokapasiteetti (aktiivisia, 15 min)
  38,   // ID-kapasiteetti SE1→FI
  44,   // ID-kapasiteetti FI→SE1
  39,   // ID-kapasiteetti SE3→FI
  45,   // ID-kapasiteetti FI→SE3
  110,  // ID-kapasiteetti EE→FI
  113,  // ID-kapasiteetti FI→EE
  // Suunniteltu DA-kapasiteetti — INACTIVE, ks. INACTIVE alla
  142,  // SE1→FI suunniteltu (SM-020:n 1900 MW nimittäjä)
]);

// Fingridin oma status = inactive (tarkistettu ?meta=-reitillä 3.11.2026).
// Näitä palvellaan yhä, koska historiallinen data on käyttökelpoista,
// mutta vastaukseen lisätään varoitus. Syy: DS 142 palauttaa lakkautettuna
// uskottavan vakioarvon (1900 MW 2026, mutta 0 MW 11/2024) — sama
// vikaluokka kuin DS 105:n vakionolla. Ilman varoitusta lakkautettu sarja
// luetaan nykytilaksi.
const INACTIVE = {
  24: 'päivitys päättyi 29.10.2024 (flow-based)',
  25: 'päivitys päättyi 29.10.2024 (flow-based)',
  26: 'päivitys päättyi 29.10.2024 (flow-based)',
  27: 'päivitys päättyi 29.10.2024 (flow-based)',
  112: 'päivitys päättyi (Fingrid: 29.9.)',
  115: 'päivitys päättyi (flow-based)',
  28: 'P1-viikkokapasiteetti lakkautettu',
  29: 'P1-viikkokapasiteetti lakkautettu',
  48: 'inactive, päättymispäivää ei kuvauksessa',
  70: 'inactive, päättymispäivää ei kuvauksessa',
  71: 'inactive, päättymispäivää ei kuvauksessa',
  142: 'päivitys päättyy 30.10 (Fingrid); arvot jatkuvat vakiona — EI nykyinen kapasiteetti',
};

// TTL porrastettu ds:n oman mittaustaajuuden mukaan (ks. kommentit
// ALLOWED-listassa) — ei yksi luku kaikille. 3 min -telemetria saa
// lyhyimmän TTL:n ettei hälytystyyppinen data (esim. DS 336) jää
// liian vanhaksi; päivä-/viikkotason arvot pisimmän.
const TTL_FAST = new Set([          // ~1-3 min telemetria
  180, 378, 379, 380, 369, 342, 336, 209, 177, 198, 186, 30, 87, 89, 187, 194,
  188, 191, 181, 201, 202, 205, 265, 266, 178, 182, 185, 196, 398, 399, 183, 371
]);
const TTL_SLOW = new Set([          // päivä-/viikkotaso tai lähes staattinen
  24, 26, 25, 27, 112, 115, 31, 32, 140, 382, 383, 384,
  363, 360, 365, 362, 358, 70, 71, 48, 28, 29, 246, 424
]);
function ttlForDs(ds) {
  if (TTL_FAST.has(ds)) return 180;   // 3 min
  if (TTL_SLOW.has(ds)) return 3600;  // 1 h
  return 300;                         // 5 min — oletus 15 min -sarjoille
}

// ── Luettelohaku ─────────────────────────────────────────────────────
// Fingridin datasettinumerot eivät ole arvattavissa, ja väärä numero
// palauttaa uskottavan näköisen sarjan (vrt. DS 105 = vakio nolla).
// Tämä reitti hakee numerot nimen perusteella Fingridin omasta
// luettelosta, jotta ds-arvo tulee lähteestä eikä muistista.
//
//   ?catalog=siirto            hakusana (fi tai en)
//   ?catalog=transmission&page=2
//   ?meta=30                   yhden datasetin kuvaus
//   &raw=1                     Fingridin vastaus sellaisenaan
//
// Kenttänimet poimitaan puolustavasti: jos Fingrid muuttaa skeemaa,
// tiivistetty kenttä jää tyhjäksi eikä keksi arvoa, ja raw=1 näyttää
// mitä tuli. Puuttuva kenttä on null, ei tyhjä merkkijono.
const CATALOG_TTL = 86400; // luettelo muuttuu harvoin

function pick(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return null;
}

function slim(d) {
  const id = Number(pick(d, 'id', 'datasetId'));
  return {
    id,
    name_fi: pick(d, 'nameFi', 'name_fi'),
    name_en: pick(d, 'nameEn', 'name_en'),
    unit: pick(d, 'unitFi', 'unitEn', 'unit'),
    period: pick(d, 'dataPeriodFi', 'dataPeriodEn', 'dataPeriod'),
    status: pick(d, 'status', 'statusFi', 'statusEn'),
    served_by_proxy: ALLOWED.has(id),
  };
}

async function catalog(url, env) {
  const apiKey = env.FINGRID_NEW_API_KEY || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No API key configured' }),
      { status: 500, headers: CORS });
  }
  const raw  = url.searchParams.get('raw') === '1';
  const meta = url.searchParams.get('meta');
  let apiUrl;
  if (meta !== null) {
    const id = Number(meta);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ error: 'meta must be a dataset id' }),
        { status: 400, headers: CORS });
    }
    apiUrl = `https://data.fingrid.fi/api/datasets/${id}`;
  } else {
    const q = (url.searchParams.get('catalog') || '').trim();
    if (!q) {
      return new Response(JSON.stringify({ error: 'catalog needs a search term' }),
        { status: 400, headers: CORS });
    }
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    apiUrl = `https://data.fingrid.fi/api/datasets?search=${encodeURIComponent(q)}` +
             `&page=${page}&pageSize=100`;
  }

  try {
    const resp = await fetch(apiUrl, {
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json',
                 'User-Agent': 'ACI-Transmission-Proxy/6.0' }
    });
    const text = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({
        error: `Fingrid API ${resp.status}`, upstream: apiUrl.replace(/\?.*$/, ''),
        preview: text.slice(0, 200)
      }), { status: resp.status, headers: CORS });
    }
    const json = JSON.parse(text);
    let body;
    if (raw) {
      body = { upstream: apiUrl, raw: json };
    } else if (meta !== null) {
      const d = json.data && !Array.isArray(json.data) ? json.data : json;
      body = { upstream: apiUrl, dataset: slim(d),
               description_fi: pick(d, 'descriptionFi'),
               description_en: pick(d, 'descriptionEn') };
    } else {
      const rows = Array.isArray(json.data) ? json.data
                 : Array.isArray(json) ? json : [];
      body = {
        upstream: apiUrl,
        count: rows.length,
        total: json.pagination?.total ?? null,
        page: json.pagination?.currentPage ?? null,
        last_page: json.pagination?.lastPage ?? null,
        datasets: rows.map(slim),
        _note: 'total null = Fingrid ei palauttanut sivutustietoa; vertaa count-kenttään ennen kuin oletat luettelon täydeksi.'
      };
    }
    const r = new Response(JSON.stringify(body), { headers: CORS });
    r.headers.set('Cache-Control', `public, max-age=${CATALOG_TTL}`);
    return r;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: CORS });
  }
}

// Workers Cache (wrangler.toml [cache] enabled = true), ei Cache API:a
// (caches.default) — se ei toimi workers.dev-osoitteissa. Cache-Control-
// otsikko riittää; Cloudflare hoitaa haun ja tallennuksen itse.
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // Luettelohaku: ?catalog=<hakusana> tai ?meta=<ds>. Ei ALLOWED-rajausta,
    // koska tarkoitus on nimenomaan löytää datasetit ennen kuin niitä
    // lisätään listaan. Vastaus kertoo kunkin kohdalla, palveleeko tämä
    // proxy jo sen dataa (served_by_proxy).
    if (url.searchParams.has('catalog') || url.searchParams.has('meta')) {
      return catalog(url, env);
    }

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
      const body = {
        data: rows,
        ds,
        total: json.pagination?.total ?? rows.length,
        fetched: new Date().toISOString()
      };
      if (INACTIVE[ds]) {
        body.status = 'inactive';
        body._warning = `Fingrid: tietoaineisto lakkautettu — ${INACTIVE[ds]}. ` +
                        'Arvot eivät välttämättä kuvaa nykytilaa.';
      }
      const response = new Response(JSON.stringify(body), { headers: CORS });
      if (request.method === 'GET') {
        const ttl = ttlForDs(ds);
        response.headers.set('Cache-Control', `public, max-age=${ttl}`);
      }
      return response;

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, ds }),
        { status: 500, headers: CORS });
    }
  }
};
