# Agent documentation

This directory is the stable Agent entrypoint for `mykcs/content2html`.

`content2html` is small enough that current status and the repository map live here instead of maintaining empty `LATEST.md/current/history` scaffolding.

## Read first

1. root [`AGENTS.md`](../../AGENTS.md) — repository operating rules and completion-report contract;
2. this file — project purpose, current architecture and ownership map;
3. [`basemodel-hosting-pattern-suggestion.md`](./basemodel-hosting-pattern-suggestion.md) — **advisory reference for future hosting work: evaluate the newer `mykcs/basemodel` Vercel-Preview + Cloudflare-Workers pattern, but do not copy it without a project-specific migration decision**;
4. [`web-gpt-cloudflare-build-budget-workflow.md`](./web-gpt-cloudflare-build-budget-workflow.md) only when evaluating a future Cloudflare introduction; it does **not** describe the current host;
5. root [`README.md`](../../README.md) — product/user guidance;
6. `package.json`, `astro.config.mjs`, task-specific source and tests — executable truth.

Account-wide owner preferences are supplied by the shared Agent harness when available. Keep only project-specific constraints here instead of copying global preference prose into this repository.

## Current project truth

- Product: content-to-HTML website/tool.
- Framework: Astro.
- Current deployment: GitHub Pages.
- Public path: `https://mykcs.github.io/content2html/`.
- The `/content2html` base path is intentional.
- Baseline correctness gate: `npm run build` (`astro check && astro build`).

Do not migrate the project to Cloudflare, Vercel or another repository's hosting architecture merely for cross-repository uniformity. Deployment architecture is project truth and changes only through an explicit project-specific migration decision.

The sibling `mykcs/basemodel` project is now a useful **reference** for how to separate PR Preview from Production hosting and how to shadow-migrate a static Astro site. Read the suggestion note before future hosting redesigns, but preserve this repository's GitHub Pages/base-path contract until its own migration gate is approved.

## Repository map

```text
src/ / public/          production application/content/assets
package.json            scripts and dependency contract
astro.config.mjs        Astro/base-path configuration
docs/agents/            stable Agent orientation and project policy
AGENTS.md                repository operating workflow
README.md                human-facing product instructions
```

Inspect the current tree before editing; generated output or Agent scratch state is not production source merely because it exists locally.

## Normal Agent workflow

```text
read AGENTS + this file
-> inspect current source/tests
-> make one focused change
-> run repository-local validation/build
-> use the repository-appropriate preview/deployment path
-> inspect affected routes/visuals when relevant
-> report exact Git/build/deployment state
```

“Agent-side/local build” means the Agent execution environment, not the owner's computer.

## Build and resource boundary

- Validate before pushing instead of using repeated hosted-CI push loops.
- Documentation/policy-only synchronization should avoid an unnecessary deployment/CI run when the hosting platform supports a skip mechanism.
- Do not conflate GitHub Actions usage with Cloudflare Pages Build usage.
- If Cloudflare is introduced later, first re-evaluate current Cloudflare guidance and this repository's own architecture. Prefer a reversible shadow migration; do not replace the current Production/canonical host merely to match another repo.

## Knowledge precedence

```text
current user instruction
> current repository code/config/tests
> root AGENTS.md + this current Agent entrypoint
> task-specific current docs
> historical/migration notes
```

If a historical note disagrees with current repository facts, update or supersede the note rather than restoring the old architecture.

## Completion report

For implementation work, report:

- Agent-side build result;
- preview URL/mechanism when one was created;
- hosted build usage when relevant;
- branch / PR / merge status;
- whether Production changed.

## Maintenance rule

Update this file when deployment architecture, base-path/canonical identity, validation commands, repository ownership or cross-repository dependencies change materially. Do not turn it into a chronological log.
