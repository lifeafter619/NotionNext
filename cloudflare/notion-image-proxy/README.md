# Notion asset proxy

Cloudflare Worker proxy for NotionNext images and uploaded files.

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
```

Expected headers for a successful image response:

```text
Content-Type: image/*
X-Notion-Image-Proxy: v6
X-Notion-Image-Proxy-Origin-Cache: HIT
```

File responses additionally preserve `Content-Disposition`, `Content-Length`,
`Content-Range`, and support `GET`, `HEAD`, `OPTIONS`, and byte ranges. The
Worker returns `404` for paths outside `/image/`, `/images/`, and `/signed/`,
rejects other methods, and never caches upstream error pages. Full downloads
remain cacheable, while byte ranges are passed through and marked `no-store`.
Keep Wrangler's `[cache].enabled` set to `false`: Workers Cache removes the
incoming `Range` header and would force videos larger than the 512 MB Free-plan
cache limit into an unusable full-body `200` response. Repeat full-asset
requests should normally show an origin cache `HIT`; the exact Cloudflare cache
header depends on the zone and plan.
