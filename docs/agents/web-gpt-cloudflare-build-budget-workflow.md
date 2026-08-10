# Web-GPT website workflow and Cloudflare build-budget policy

Last reviewed: 2026-08-10
Owner decision: 2026-08-10

## Current deployment fact

`content2html` is currently an Astro static site deployed to GitHub Pages at:

```text
https://mykcs.github.io/content2html/
```

The repository's current `astro.config.mjs` deliberately uses:

```text
site = https://mykcs.github.io/content2html/
base = /content2html
```

Do **not** add Cloudflare Pages, change the base path, or redesign deployment architecture merely to make this repository match `basemodel`.

## Owner-level workflow preference

The owner wants routine website work to remain operable from ChatGPT/Codex-style web tooling with minimal manual relay between services.

Before non-trivial work:

1. read `AGENTS.md` and this file;
2. inspect current `main`, relevant open PRs, and overlapping work;
3. keep one coherent feature on one branch / PR;
4. run repository-owned validation and `npm run build` in the Agent execution environment;
5. use the deployment/preview mechanism appropriate to this repository rather than inventing a new platform dependency;
6. report exactly what was built, previewed, merged, and deployed.

"Local build" means the Agent execution environment. The owner should not have to run commands on their own computer just to validate an ordinary website change.

## Current preview/release rule

Because this repository is currently GitHub Pages-only, the `basemodel` Cloudflare rule of "Wrangler Preview then one Cloudflare Production Build" is **not currently applicable**.

Do not create a Cloudflare project merely for temporary previews unless the owner separately decides to adopt Cloudflare for this site.

For current GitHub Pages work:

- validate locally/Agent-side first;
- avoid repeated push-loop debugging;
- use a focused PR and the existing GitHub Pages deployment model;
- use `[skip ci]` for documentation/policy-only synchronization when a deployment is not desired;
- do not conflate GitHub Actions usage with Cloudflare Pages Build usage.

## If Cloudflare Pages is adopted later

If the owner later explicitly chooses Cloudflare Pages for this repository, use the following default unless a project-specific migration plan says otherwise:

```text
GitHub remains source of truth
-> automatic Preview branch deployments = None
-> Agent-side production build
-> Wrangler Direct Upload of prebuilt output to a unique Preview branch
-> inspect public pages.dev Preview
-> source sync without Git-integrated Preview Build
-> merge accepted work to the chosen Production branch
-> only the deliberate Production boundary may consume a Git-integrated Pages Build
```

Cloudflare currently documents that an existing Git-integrated Pages project can disable automatic deployments and still accept manual Wrangler deployments.

When Cloudflare is actually introduced, first create a project-specific migration/runbook that preserves this site's `/content2html` routing, canonical URLs, bilingual hreflang, sitemap behavior, OG metadata, and GitHub Pages rollback path until cutover is proven.

## Cloudflare pre-push gate for any future integration

If a Cloudflare Pages project is ever connected, before the first ordinary non-skip branch push:

1. confirm which branch is Production;
2. confirm Preview automatic deployment is `None` when possible;
3. if Branch control is unknown, use a Cloudflare-supported skip prefix instead of speculative pushes;
4. use Wrangler Direct Upload for ordinary public Preview review;
5. do not spend a Git-integrated Preview Build merely to show visual changes.

Cloudflare currently documents these skip prefixes: `[CI Skip]`, `[CI-Skip]`, `[Skip CI]`, `[Skip-CI]`, `[CF-Pages-Skip]`.

## Validation contract

Current repository commands:

```bash
npm install
npm run build
npm test
```

`npm run build` already runs `astro check && astro build`.

For changes affecting slides, print behavior, bilingual routing, SEO metadata, CSP, or browser interaction, run the relevant existing targeted scripts/tests in addition to the normal build.

## Required completion report

Every website task should report:

```text
Task status: completed / not completed
Agent-side validation/build: passed / failed / not run
Preview URL: <actual URL if one exists>
Preview mechanism: GitHub Pages / Wrangler Direct Upload / other / none
Cloudflare Git-integrated Pages Builds triggered: 0 / 1 / more / not applicable / unknown
GitHub branch / PR / merge status
Production changed: yes / no / unknown
Production URL: https://mykcs.github.io/content2html/
```

## Current Cloudflare references for future adoption

- https://developers.cloudflare.com/pages/configuration/branch-build-controls/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
