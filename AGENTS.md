# Agent guide

This repository is often maintained by coding Agents. Prefer autonomous execution through available GitHub/deployment tools and avoid making the owner relay information between services.

## Read first

1. `docs/agents/README.md`
2. `docs/agents/web-gpt-cloudflare-build-budget-workflow.md`
3. `docs/agents/basemodel-hosting-pattern-suggestion.md`
4. `README.md`
5. `package.json`
6. `astro.config.mjs`
7. relevant open PRs and task-specific source/tests

## Current deployment fact

This site currently deploys to GitHub Pages at:

`https://mykcs.github.io/content2html/`

The `/content2html` base path is intentional. GitHub Pages currently satisfies both the hosting and canonical-identity roles. Do not add Vercel, Cloudflare, or another provider merely because a sibling repository uses it.

## Normal Agent workflow

```text
inspect current docs + open PRs
-> one focused branch / PR when publication is needed
-> Agent-side validation + production build
-> use the repository-appropriate review/deployment mechanism
-> inspect affected routes/visuals when needed
-> merge/release only after acceptance
-> report exact build / preview / deployment state
```

"Local build" means the Agent execution environment, not the owner's computer.

## Hosting/provider decision rule

Before proposing a new provider, identify the real roles first:

- source/history;
- validation/CI;
- Preview/review;
- Production/static delivery;
- runtime/API behavior;
- canonical hostname/SEO identity.

Add a provider only when it fills a demonstrated missing role or replaces an existing provider with a concrete benefit. Avoid a second/third provider solely for account-wide uniformity. A provider-hosted hostname/base path is part of product identity; migration must preserve redirects, canonical URLs, hreflang, sitemap and rollback.

If Preview becomes a real workflow bottleneck later, evaluate current provider options and quotas at that time from first-party documentation. Do not pre-commit this repository to Vercel, Cloudflare Pages, Workers, or Direct Upload in advance.

## Build/resource rule

- Validate before pushing instead of using repeated CI push loops.
- Batch coherent edits before publication to avoid hosted build storms.
- Documentation/policy-only synchronization may use `[skip ci]` when no deployment is intended and the actual provider/workflow honors it.
- Do not conflate GitHub Actions, Vercel deployments, Cloudflare Pages Builds, or Workers Builds; they are different resource pools.
- Do not claim quota safety or exact counters without provider evidence.

## Validation

`npm run build` is the baseline correctness gate and currently runs `astro check && astro build`.

Run task-specific browser/print/SEO/i18n checks when the changed surface requires them. A successful build or provider READY badge is not the same as real user-visible acceptance.

## Completion report

Always state:

- Agent-side build result;
- Preview URL and mechanism, if any;
- hosted build/provider resource triggered when relevant (`yes / no / unknown / not applicable`);
- branch / PR / merge status;
- whether Production changed.
