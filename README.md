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

## Auth
Requires FINGRID_NEW_API_KEY environment variable (Cloudflare Secret).

## Cache

Cloudflare Cache API (`caches.default`). TTL is per-`ds`, matched to that
dataset's own update cadence (see `ttlForDs` in worker.js): 3 min for
real-time telemetry, 1 h for daily/weekly/static values, 5 min default for
everything in between (mostly the 15-min series).
