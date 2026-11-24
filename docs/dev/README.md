# Dev

This directory is the repository's discoverable Dev system.

- Current direction: [`LATEST.md`](LATEST.md)
- Engineering rationale: [`DESIGN.md`](DESIGN.md)
- Replaced directions: [`ARCHIVE.md`](ARCHIVE.md)
- Shared lifecycle: https://github.com/mykcs/.agents/blob/main/docs/agents/DEV_PROTOCOL.md
- Shared CI semantics: https://github.com/mykcs/.agents/blob/main/docs/agents/CI_STANDARD.md

Dev explains how content2html is maintained and where executable/live owners reside.

## Website acceptance map

| Area | Existing implementation and acceptance |
| --- | --- |
| Agent reading | Localized Agent page and src/lib/agent-reader.ts; scripts/check-agent-reader.mjs validates built reader files and source links. |
| Design | [Site standards](../site-standards.md) and src/styles/tokens.css; verify actual consumer roles. |
| Responsive | Desktop and Chrome 440×956, DPR3/touch emulation; retain slide, print and standalone fallback exceptions. |
| Expression | Wish and the actual article/slide source; preserve source provenance, dates, and scientific limitations. |
| Engineering | npm ci, npm run build and the existing standards checks; keep current stack and lockfile. |
| CI / publication | [LATEST](LATEST.md) and the existing GitHub Pages deploy workflow; distinguish local validation from actual published build. |
| Public output | Only approved public content and assets, no private draft/source data in the visitor reader. |
| Accessibility/performance | npm run test:standards:browser and relevant keyboard, contrast, overflow, clipboard, print and measured loading checks. |
| Governance | AGENTS, Wish, Dev and site standards own their respective decisions. |

This map routes to existing owners; it does not assert that unrun checks passed.
