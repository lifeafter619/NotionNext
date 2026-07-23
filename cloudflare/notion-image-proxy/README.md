# Notion image proxy

Cloudflare Worker proxy for NotionNext images.

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
```

Expected headers for a successful image response:

```text
Content-Type: image/*
X-Notion-Image-Proxy: v4
X-Notion-Image-Proxy-Origin-Cache: HIT
```

The Worker returns `404` for paths outside `/image/` and `/images/`, rejects
methods other than `GET` and `HEAD`, and never caches non-image upstream
responses. Repeat requests should normally show an origin cache `HIT`; the
exact Cloudflare cache header depends on the zone and plan.
