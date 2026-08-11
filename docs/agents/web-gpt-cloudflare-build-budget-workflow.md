# Web-GPT website workflow and hosted-build budget policy

Last reviewed: **2026-08-11**

## Current deployment fact

`content2html` is an Astro static site deployed to GitHub Pages at:

`https://mykcs.github.io/content2html/`

The repository deliberately uses the `/content2html` base path. Do not add another hosting provider merely to copy another project.

## Owner-level workflow preference

Routine website work should remain operable from ChatGPT/Codex-style tooling with minimal manual relay.

Before non-trivial work:

1. read `AGENTS.md` and current Agent docs;
2. inspect current `main`, relevant open PRs and overlap;
3. batch one coherent feature/change before publication;
4. run repository-owned validation and `npm run build` in the Agent environment;
5. use the review/deployment mechanism appropriate to this repository;
6. report exactly what was built, previewed, merged and deployed.

## Current preview/release rule

This repository is GitHub Pages-only. There is no Cloudflare Pages/Workers or Vercel deployment contract to preserve today.

For current work:

- validate Agent-side first;
- avoid repeated push-loop debugging;
- use focused Git publication only when needed for the requested outcome;
- use `[skip ci]` for docs/policy-only synchronization only when the actual workflow honors it and no deployment is desired;
- distinguish source/build/Preview/Production evidence rather than calling any one of them “done”.

## Future hosting changes: role-first, provider-second

Do not keep a standing instruction that a future Cloudflare adoption must use Direct Upload, or that a future Preview must use Vercel. Provider capabilities, quotas and product needs change.

If hosting/Preview modernization is requested later:

```text
inspect current product + live deployment
-> map source / CI / Preview / Production / runtime / canonical identity roles
-> identify the measured missing/problematic role
-> re-check current first-party provider docs and limits
-> choose the smallest architecture that solves it
-> preserve /content2html and SEO identity unless migration is explicit
-> validate exact reviewed head on a reversible non-production surface
-> define rollback
-> explicit Production cutover
-> verify Production
```

A new provider should normally replace or satisfy a distinct responsibility. Do not add a second/third provider merely because it is available or because another repository uses it.

## Build-resource rule

Hosted build resources are separate:

- GitHub Actions runner usage;
- Vercel deployments/build execution;
- Cloudflare Pages Builds;
- Cloudflare Workers Builds.

Do not describe one pool as protecting/consuming another. Batch coherent changes, avoid trigger-only commits, and report exact provider evidence when resource consumption matters. If provider quota/capability is central to a decision, verify the current official documentation rather than relying on this dated note.

## Validation contract

Current repository commands:

```bash
npm install
npm run build
npm test
```

For slides, print behavior, bilingual routing, SEO metadata, CSP or browser interaction, run the relevant targeted checks as well.

## Completion report

Every website task should state:

```text
Task status: completed / not completed
Agent-side validation/build: passed / failed / not run
Preview URL + mechanism: <actual value or none>
Hosted provider build triggered: yes / no / unknown / not applicable
GitHub branch / PR / merge status
Production changed: yes / no / unknown
Production URL: https://mykcs.github.io/content2html/
```

Do not claim a Preview exists unless it was actually created and checked.