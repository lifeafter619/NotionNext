# Notion asset proxy

Cloudflare Worker proxy for Notion-hosted images, video, audio, uploaded files,
and allowlisted Waline emoji assets used by NotionNext. Ordinary external URLs
are deliberately excluded.

## Deploy

1. Copy `wrangler.toml.example` to `wrangler.toml`.
2. Replace `cdn.example.com` with your CDN domain.
3. Deploy:

```bash
npx wrangler deploy
```

The API token needs Workers Scripts edit access for the account. Custom domain
binding also needs access to the domain zone.

4. Set NotionNext env:

```env
NEXT_PUBLIC_NOTION_HOST=https://cdn.example.com
```

## Verify

```bash
curl -I "https://cdn.example.com/images/page-cover/gradients_11.jpg"
# For a Notion uploaded file, use its stable /signed/ URL:
curl -I "https://cdn.example.com/signed/<encoded-source>?table=block&id=<block-id>"
# Waline emoji images and picker metadata use a strict package route:
curl -I "https://cdn.example.com/external/waline-emojis/1.2.0/tieba/tieba_agree.png"
curl -I "https://cdn.example.com/external/waline-emojis/1.2.0/tieba/info.json"
```

Expected headers for a successful image response:

```text
Content-Type: image/*
X-Notion-Image-Proxy: v10
X-Notion-Image-Proxy-Edge-Cache: MISS    # first request anywhere
X-Notion-Image-Proxy-Edge-Cache: R2-HIT  # colo cold, served from R2
X-Notion-Image-Proxy-Edge-Cache: HIT     # served from the local colo cache
X-Notion-Image-Proxy-Origin-Cache: HIT   # upstream fetch cache, plan-dependent
```

## Image-bed route: `/f/<key>`

Objects uploaded manually to the bucket are served read-only at
`https://<cdn-domain>/f/<key>` — e.g. object `2026/photo.webp` becomes
`https://cdn.example.com/f/2026/photo.webp`. Content type comes from the
object metadata (set automatically by dashboard/wrangler/S3 uploads) with an
extension-based fallback. Responses carry `Cache-Control: max-age=86400`
(not immutable, so overwriting a key propagates within a day) plus the R2
ETag for cheap revalidation, and repeats are served from the colo cache.

Upload options:

```bash
# Dashboard: R2 → notion-image-proxy-cache → Upload (drag & drop)
# Wrangler:
npx wrangler r2 object put notion-image-proxy-cache/photo.webp --file ./photo.webp
# PicGo / PicList / any S3 client: R2 is S3-compatible — endpoint
# https://<account_id>.r2.cloudflarestorage.com, bucket
# notion-image-proxy-cache, custom URL prefix https://<cdn-domain>/f/
```

The `v1/` prefix is the proxy's internal cache namespace: it is hidden from
`/f/` and is the only prefix covered by the bucket's auto-expiry lifecycle
rule, so manual uploads are never deleted automatically. Avoid naming your
own files under `v1/`.

## Caching architecture (works on the Free plan)

Three independent layers, all available on every Cloudflare plan:

1. **Cache API (`caches.default`)** — the Worker stores validated `200`
   responses per colo and serves repeats locally. Errors, ranges, and partial
   probes never enter this cache, so a bad upstream answer can never stick.
   Query parameters are sorted so `?width=1080&cache=v2` and
   `?cache=v2&width=1080` share one entry.
2. **R2 persistence (`ASSET_BUCKET` binding, optional)** — validated assets
   up to 100 MB are stored durably. A colo that has never seen an asset reads
   it from R2 in ~100ms and repopulates its local cache, so Notion is only
   contacted once per asset globally. Keys hash the normalized path+query, so
   every hostname bound to the Worker shares one stored copy. Without the
   binding the Worker silently skips this layer.
3. **`fetch()` subrequest cache** — upstream fetches use
   `cf: { cacheEverything, cacheTtl }`. `cacheTtl` (unlike `cacheEverything`
   alone) also overrides Notion's `private`/`no-store` response directives,
   which otherwise force a full origin round trip on every request. If a
   cached subrequest entry turns out to be a stored upstream error, the Worker
   bypasses the cache once and uses the live answer (self-healing), so a
   poisoned entry only ever costs one extra hop.

Recommended free dashboard toggle: **Caching → Tiered Cache → Smart Tiered
Caching** for the zone, which lets `fetch()` subrequest cache hits be shared
across colos instead of each colo going back to Notion.

File responses additionally preserve `Content-Disposition`, `Content-Length`,
`Content-Range`, and support `GET`, `HEAD`, `OPTIONS`, and byte ranges. The
Worker returns `404` for paths outside `/image/`, `/images/`, `/signed/`, and
the strict `/external/waline-emojis/<version>/<pack>/<file>` route. The Waline
route accepts only the official `qq`, `tieba`, `weibo`, and `bilibili` packs,
and only image files or `info.json`. `/image/` and `/signed/` still require a
Notion-owned asset, so the Worker cannot be used as an open proxy. It rejects
other methods and never caches upstream error pages. Full downloads remain
cacheable, while byte ranges are passed through and marked `no-store`.
Keep Wrangler's `[cache].enabled` set to `false`: Workers Cache removes the
incoming `Range` header and would force videos larger than the 512 MB Free-plan
cache limit into an unusable full-body `200` response. Repeat full-asset
requests should normally show an origin cache `HIT`; the exact Cloudflare cache
header depends on the zone and plan.
