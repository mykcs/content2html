# Hosting architecture suggestion — review the `mykcs/basemodel` pattern before future hosting changes

Last reviewed: **2026-08-11**

Status: **advisory only. This does not change `content2html` hosting.**

`content2html` currently uses Astro + GitHub Pages and intentionally serves under the `/content2html` base path. Preserve that current truth unless the owner explicitly starts a project-specific hosting migration.

## Pattern worth evaluating

The sibling website `mykcs/basemodel` has converged on a useful division of responsibilities:

```text
GitHub = source of truth
non-main branch / PR -> Vercel Preview
Production target     -> Cloudflare Workers Static Assets
```

In `basemodel`, Vercel is used because PR Preview, build feedback and Agent-visible logs are already working well there. Cloudflare Workers Static Assets is being evaluated as the modern Cloudflare Production target through a reversible shadow migration; the existing Pages Production is not removed until parity is proved.

Agents working here may use that project as a **reference implementation and decision record**, especially:

- `mykcs/basemodel/docs/agents/LATEST.md`
- `mykcs/basemodel/docs/agents/current/hosting-architecture.md`
- `mykcs/basemodel/vercel.json`
- `mykcs/basemodel/wrangler.jsonc` once the Workers shadow configuration lands

## Do not copy it blindly

Before proposing the same split here, first answer:

1. Is GitHub Pages still meeting the product's real requirements?
2. Does `/content2html` need to remain the canonical base path?
3. Is an external PR Preview valuable enough to justify Vercel?
4. Is there any runtime/API behavior that would change the choice of static host?
5. What are the current canonical, redirect, sitemap and SEO assumptions?
6. Can a shadow deployment prove parity without touching the existing Production site?

If the answer is simply “the other repository uses it,” do not migrate.

## If a future migration is approved

Prefer the same safety sequence used by `basemodel`:

```text
record current architecture
-> create provider-neutral build contract
-> add non-production Preview/shadow path
-> validate exact Git head
-> compare routes/assets/SEO/headers
-> define rollback
-> explicit owner cutover
-> verify Production
-> retire old host only after verification
```

Keep framework migration separate from hosting migration. Astro does not need to become Next.js merely because Vercel is used for Preview.

Do not commit provider API tokens or other live credentials into this repository.

## Current authority remains local

For this repository, `AGENTS.md`, `docs/agents/README.md`, `package.json`, `astro.config.mjs` and the current GitHub Pages behavior remain authoritative. This note is a prompt to **evaluate** the newer `basemodel` deployment pattern when hosting work is requested, not permission to change hosting autonomously.
