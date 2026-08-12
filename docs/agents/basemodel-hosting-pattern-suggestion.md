# Hosting architecture suggestion — use `basemodel` for reasoning, not provider copying

Last reviewed: **2026-08-12**

Status: **advisory only. `content2html` remains GitHub Pages-only.**

## Current local decision

`content2html` is an Astro static site served intentionally from:

`https://mykcs.github.io/content2html/`

GitHub Pages currently satisfies the site's Production and canonical-identity needs. There is no demonstrated runtime requirement or Preview bottleneck that justifies adding another provider today.

## Updated provider-role lesson from `basemodel`

`basemodel` changed its deployment ownership on 2026-08-12 after the owner explicitly required normal Cloudflare Pages Builds to become zero and one provider to own both review and release:

```text
GitHub = source
Vercel = Preview + Production
Cloudflare Pages = frozen legacy rollback snapshot
```

Vercel now owns both Preview and Production for `basemodel`. Its Astro/React framework did not change; the migration consolidated deployment ownership and moved canonical identity to the Vercel Production domain.

The earlier 2026-08-11 audit that retained Cloudflare Pages Production was valid under the earlier objective—reduce wasteful Preview builds without migrating the host—but it was later superseded when the owner changed the actual requirement. The transferable lesson is therefore **provider-role separation plus current-objective review**, not that every site should use Vercel or Cloudflare:

1. inventory source/CI/Preview/Production/runtime/canonical-identity roles;
2. resolve current requirements against project current docs, executable config/tests and live provider state;
3. keep the smallest provider set that satisfies real needs;
4. add or remove a provider only for a real missing role or a deliberate replacement;
5. avoid a second or third routine provider merely for account-wide consistency;
6. treat provider-hosted domains/base paths as product/SEO identity;
7. validate the exact reviewed head and distinguish build/READY from real-page acceptance and Production verification;
8. treat architecture decisions as current guidance, not eternal rules after the owner changes the objective.

For `content2html`, this reasoning still points to **no hosting migration**.

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
-> prove the actual missing role and current owner objective
-> choose the smallest replacement/addition
-> keep framework migration separate
-> build provider-neutral artifact
-> create reversible non-production evidence
-> verify exact head + routes/assets/SEO/base path
-> define rollback
-> explicit cutover
-> verify Production
-> only then retire or freeze old infrastructure
```

Do not commit provider credentials. Current repository authority remains `AGENTS.md`, `docs/agents/README.md`, `package.json`, `astro.config.mjs`, and live GitHub Pages behavior.
