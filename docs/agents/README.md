# Agent documentation

This directory is the stable Agent entrypoint for `mykcs/content2html`.

## Read first

1. [`web-gpt-cloudflare-build-budget-workflow.md`](./web-gpt-cloudflare-build-budget-workflow.md) — latest owner-level website execution rule. It preserves the current GitHub Pages architecture and records how to adopt the build-saving Cloudflare workflow only if Cloudflare is explicitly introduced later.
2. root [`AGENTS.md`](../../AGENTS.md) — repository-wide Agent operating rules.
3. root [`README.md`](../../README.md) — product purpose, current GitHub Pages identity, and local development commands.
4. `package.json`, `astro.config.mjs`, and task-specific source/tests.

## Current deployment boundary

`content2html` currently deploys to GitHub Pages at `https://mykcs.github.io/content2html/` with a deliberate `/content2html` base path. Do not migrate it to Cloudflare or copy another repository's deployment architecture without an explicit owner decision and a project-specific migration plan.

## Stable rule

Future Agents should update this directory when deployment architecture, build-budget assumptions, Agent workflow, or ownership boundaries materially change. Historical implementation details must not silently override current repository facts.
