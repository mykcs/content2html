# Agent guide

This repository is often maintained by coding Agents. Prefer autonomous execution through available GitHub/deployment tools and avoid making the owner relay information between services.

## Read first

1. `docs/agents/README.md`
2. `docs/agents/web-gpt-cloudflare-build-budget-workflow.md`
3. `README.md`
4. `package.json`
5. `astro.config.mjs`
6. relevant open PRs and task-specific source/tests

## Current deployment fact

This site currently deploys to GitHub Pages at:

`https://mykcs.github.io/content2html/`

The `/content2html` base path is intentional. Do not introduce Cloudflare Pages, change canonical identity, or copy another site's deployment architecture unless the owner explicitly chooses a migration.

## Normal Agent workflow

```text
inspect current docs + open PRs
-> one focused branch / PR
-> Agent-side validation + production build
-> use the repository-appropriate preview/deployment mechanism
-> inspect affected routes/visuals when needed
-> merge only after acceptance
-> report exact build / preview / deployment state
```

"Local build" means the Agent execution environment, not the owner's computer.

## Build/resource rule

- Validate before pushing instead of using repeated CI push loops.
- Documentation/policy-only synchronization should use `[skip ci]` when no deployment is intended.
- Do not conflate GitHub Actions usage with Cloudflare Pages Build usage.
- If Cloudflare Pages is introduced later, first read `docs/agents/web-gpt-cloudflare-build-budget-workflow.md`; ordinary previews should use Agent-side build + Wrangler Direct Upload and automatic Preview branch builds should be disabled when appropriate.

## Validation

`npm run build` is the baseline correctness gate and currently runs `astro check && astro build`.

Run task-specific browser/print/SEO/i18n checks when the changed surface requires them.

## Completion report

Always state:

- Agent-side build result;
- Preview URL and mechanism, if any;
- whether a Cloudflare Git-integrated Pages Build was triggered (`0 / 1 / more / not applicable / unknown`);
- branch / PR / merge status;
- whether Production changed.
