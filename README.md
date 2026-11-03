# ACI Transmission Proxy

Cloudflare Worker — Fingrid transmission data via new API.

## Endpoint
GET https://aci-transmission-proxy.ruotsalainen-marko.workers.dev/?ds=24&start=2026-04-15T00:00:00Z&end=2026-04-16T00:00:00Z

## Supported datasets
- DS 24: NTC SE1→FI (day-ahead capacity)
- DS 26: NTC FI→SE1
- DS 25: NTC SE3→FI
- DS 70: Congestion income FI-SE1
- DS 71: Congestion income FI-SE3
- DS 180: Physical flow FI↔EE (EstLink, 3min)
- DS 31: Commercial flow FI↔SE1
- DS 32: Commercial flow FI↔SE3

## Catalog search (v6)

Find dataset ids by name instead of guessing them. A wrong id returns a
plausible-looking series (DS 105 returned constant zero), so ids should
come from Fingrid's own catalogue.

    GET ?catalog=siirto                 search, Finnish or English
    GET ?catalog=transmission&page=2    next page (pageSize 100)
    GET ?meta=30                        one dataset's description
    add &raw=1                          Fingrid's response unmodified

Each result carries `served_by_proxy`: whether `?ds=` already serves it
(the ALLOWED list). Catalogue routes are not restricted by ALLOWED.
Cached 24 h. Field names are picked defensively — if Fingrid changes its
schema a field comes back `null`, never invented; check with `raw=1`.

Live-tested 3.11.2026: field names `nameFi`, `nameEn`, `unitFi`,
`dataPeriodFi` confirmed. `status` is present in `?meta=` but not in search
results, so use `?meta=` to check whether a dataset is active. Fingrid
returns 429 when catalogue calls come faster than ~8 s apart; the proxy
passes it through as an error, not as an empty list.

## Inactive datasets (v7)

Datasets Fingrid marks `inactive` are still served (history is useful) but
the response gets `"status":"inactive"` and a `_warning`. Reason: DS 142
keeps returning a plausible constant (1900 MW in 2026, 0 MW in 11/2024)
after its updates ended — the same failure class as DS 105's constant zero.
List: 24–29, 48, 70, 71, 112, 115, 142 (checked with `?meta=` 3.11.2026).

Intraday free capacity added: 38/44 (SE1), 39/45 (SE3), 110/113 (EE).

## Auth
Requires FINGRID_NEW_API_KEY environment variable (Cloudflare Secret).

## Cache

Workers Cache (`wrangler.toml`: `[cache]` `enabled = true`) — not the
Cache API (`caches.default`), which doesn't work on workers.dev (it's
zone-scoped and would be shared across every workers.dev tenant). The
worker only sets `Cache-Control`; Cloudflare checks and stores the cache
itself, before the worker even runs on a hit. TTL is per-`ds`, matched to
that dataset's own update cadence (see `ttlForDs` in worker.js): 3 min for
real-time telemetry, 1 h for daily/weekly/static values, 5 min default for
everything in between (mostly the 15-min series).
