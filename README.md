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

**Not live-tested** at the time of writing (data.fingrid.fi was not
reachable from the authoring environment). First calls after deploy:
`?catalog=siirto&raw=1`, then `?meta=30`.

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
