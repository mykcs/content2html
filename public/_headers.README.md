# `_headers` file — known limitation (2026-06-29)

`public/_headers` is **present but NOT served** by GitHub Pages user/org sites.

Per [GitHub Pages _headers docs](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#static-content) (added 2023-09-01):

- ✅ **Project Pages** sites (e.g. `username.github.io/project-name/`) — `_headers` IS served
- ❌ **User/Organization Pages** sites (e.g. `username.github.io/`) — `_headers` is **ignored**

This repo is `mykcs/content2html` published at `https://mykcs.github.io/content2html/`.
Although it's a "project" URL path, **the site itself is a User Page** (the org `mykcs`
has `mykcs.github.io` as its User Page root), so `_headers` is ignored.

## Workaround (Round 12, 2026-06-29)

`src/layouts/BaseLayout.astro:53` injects an equivalent `<meta http-equiv>` CSP +
X-Content-Type-Options + Referrer-Policy. CSP via meta is enforced by browsers.

## What cannot be replicated via meta

| Header | Meta equivalent? | Reason |
|---|---|---|
| Content-Security-Policy | ✅ yes | Browser enforces |
| X-Content-Type-Options | ✅ yes (nosniff) | Browser enforces |
| Referrer-Policy | ✅ yes | Browser enforces |
| X-Frame-Options: SAMEORIGIN | ❌ **NO** | Server-only directive, ignored by browsers when set via meta. Need real HTTP header. |
| X-Robots-Tag | ⚠️ partial | `<meta name="robots">` exists but server X-Robots-Tag adds per-path granularity not exposed to meta |

## Migration path (future work)

To get full `_headers` coverage including X-Frame-Options:

1. **Move to custom domain** (Project Pages) — requires DNS configuration, breaks current `mykcs.github.io/content2html/` URL.
2. **Migrate to Netlify/Vercel/Cloudflare Pages** — full `_headers` support with no caveats.
3. **Use Cloudflare in front of GH Pages** — proxy + `_headers` injection, but adds latency.

For now: client-side CSP via meta covers the most important attack vectors (XSS,
MIME sniffing, referrer leakage). X-Frame-Options is documented as a known limitation.