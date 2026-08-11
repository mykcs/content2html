# Hosting architecture suggestion — use `basemodel` for reasoning, not provider copying

Last reviewed: **2026-08-11**

Status: **advisory only. `content2html` remains GitHub Pages-only.**

## Current local decision

`content2html` is an Astro static site served intentionally from:

`https://mykcs.github.io/content2html/`

GitHub Pages currently satisfies the site's Production and canonical-identity needs. There is no demonstrated runtime requirement or Preview bottleneck that justifies adding another provider today.

## Updated lesson from `basemodel`

After its 2026-08-11 cross-provider audit, `basemodel` retained:

```text
GitHub = source
Vercel = ordinary PR Preview
Cloudflare Pages = Production
```

Its previously validated Cloudflare Workers Static Assets shadow is now a dormant future option rather than an automatic Production target.

The transferable lesson is **provider-role separation**, not that every site should use Vercel + Cloudflare:

1. inventory source/CI/Preview/Production/runtime/canonical-identity roles;
2. keep the smallest provider set that satisfies real needs;
3. add a provider only for a real missing role or as a deliberate replacement;
4. avoid a third routine provider merely for consistency;
5. treat provider-hosted domains/base paths as product/SEO identity;
6. validate the exact reviewed head and distinguish build/READY from real-page acceptance;
7. re-check current first-party provider docs when quotas/features are material.

For `content2html`, this reasoning currently points to **no hosting migration**.

## When a second provider would become justified

Re-evaluate only if a concrete trigger appears, for example:

- lack of public PR Preview repeatedly blocks review;
- GitHub Pages has a measured reliability/feature/limit problem;
- the product gains runtime/API behavior GitHub Pages cannot serve;
- a custom-domain/identity migration is already planned for product reasons;
- the owner explicitly requests a hosting migration after its tradeoffs are understood.

If Preview alone becomes the problem, compare current Preview products then; do not assume Vercel or Cloudflare is automatically correct. If runtime is the problem, choose based on the runtime requirement rather than static-host fashion.

## Migration sequence if one is ever approved

```text
record current role/identity map
-> prove the actual missing role
-> choose the smallest replacement/addition
-> keep framework migration separate
-> build provider-neutral artifact
-> create reversible non-production evidence
-> verify exact head + routes/assets/SEO/base path
-> define rollback
-> explicit cutover
-> verify Production
-> only then retire old infrastructure
```

Do not commit provider credentials. Current repository authority remains `AGENTS.md`, `docs/agents/README.md`, `package.json`, `astro.config.mjs`, and live GitHub Pages behavior.