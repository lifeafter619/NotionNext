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
X-Notion-Image-Proxy: v5
X-Notion-Image-Proxy-Origin-Cache: HIT
```

File responses additionally preserve `Content-Disposition`, `Content-Length`,
`Content-Range`, and support `GET`, `HEAD`, `OPTIONS`, and byte ranges. The
Worker returns `404` for paths outside `/image/`, `/images/`, and `/signed/`,
rejects other methods, and never caches upstream error pages. Full files are
cached as `200` responses; Cloudflare slices that cached object into `206`
range responses at the edge, so subsequent range downloads do not create
separate origin requests or partial cache entries. Repeat full-asset requests
should normally show an origin cache `HIT`; the exact Cloudflare cache header
depends on the zone and plan.
