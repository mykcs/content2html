---
name: content2html
description: Build and maintain the content2html Astro site using its existing content collections, routes, and validation commands.
---

# content2html repository guide

Use this guide when changing this repository. The user-facing workflow and visual/content requirements are in the repository-root `SKILL.md`; this skill records verified repository conventions for engineering work.

## Repository facts

- This is a static Astro site using Tailwind CSS 4. Content lives in `src/content/`; generated pages and layouts live in `src/pages/`, `src/components/`, and `src/layouts/`.
- The production site is GitHub Pages at `https://mykcs.github.io/content2html/`. The `/content2html` base path is intentional; preserve it in links and route generation.
- Follow nearby source files for imports, exports, and naming. Existing Astro pages use relative imports. The repository does not establish a universal absolute-import or named-export rule.
- `npm run build` runs `astro check && astro build` and is the baseline validation command.
- `npm test` only checks that the Playwright CLI is available and prints that there is no Jest suite; it does not run a test suite. `scripts/verify-print-e2e.mjs` is a targeted browser-based print verifier, not a general unit-test runner. Check its URL and environment requirements before using it.

## Change workflow

1. Read the relevant files under `src/`, `references/`, and the repository-root `SKILL.md` before changing behavior.
2. Match the existing Astro content-collection and page-route structure. Do not invent modules, APIs, or test frameworks that are absent from the repository.
3. Run `npm run build` after source or route changes. For documentation-only edits, validate the Markdown and frontmatter changed by the edit.
4. Keep deployment configuration aligned with GitHub Pages and the existing `/content2html` base path.

## Tool configuration boundary

The repository contains generated Codex configuration for six MCP servers: GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking. It includes `npx` packages tagged `@latest` and a Playwright `--extension` argument. This skill does not require those services; do not install, launch, or authorize them as part of repository work. Keep any personal credentials outside the repository.
