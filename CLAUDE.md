@AGENTS.md

# Claude Code-specific notes

The imported `AGENTS.md` is the provider-neutral repository contract. Keep this file as a thin Claude adapter; do not duplicate project architecture, deployment workflow, global host policy, skill lifecycle rules or historical CI assumptions here.

For project context, follow `docs/agents/README.md`, root `README.md`, `package.json`, `astro.config.mjs`, the task-relevant source/tests, and the repository's current ADRs when their rationale is needed.

User-global files under `~/.claude/` or `~/.agents/` may exist in a local Claude Code environment, but they are optional host conveniences rather than repository dependencies. Remote Agents must not require owner-specific absolute paths or stale cross-project CI rules to work on this repository.
