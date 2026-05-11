# Task `0028`: Rename slash-command prefix `agentic-` → `ad-`

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md)
**Board ref:**

## Context

[ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md) accepts the slash-command rename for ergonomics (`/agentic-X` is 9 prefix chars; `/ad-X` is 2). Breaking change is null-cost while the kit has no external users.

Scope strictly inside skill identity surface; `agentic` brand stays on CLI binary, npm package, repo name, state files, and managed-doc marker.

## Acceptance Criteria

- [x] [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md) accepted with the 23-skill mapping table and the rename-surface / preserve scope.
- [x] Source skill directories renamed: `src/skills/claude-code/agentic-*/` → `src/skills/claude-code/ad-*/` and `src/skills/codex/agentic-*/` → `src/skills/codex/ad-*/`.
- [x] SKILL.md frontmatter `name:` fields rewritten across all 23 Claude Code skills.
- [x] Codex `agents/openai.yaml` `display_name:` fields rewritten across all 23 Codex skills.
- [x] Inside skill bodies: all `/agentic-X` slash-command references and bare `agentic-X` cross-skill mentions rewritten to `/ad-X` / `ad-X`.
- [x] `src/lib/profiles.js`, `src/commands/init.js`, `src/lib/rootdoc.js` skill-name strings rewritten.
- [x] `test/init.test.js` UNIVERSAL_SKILLS list, `test/profile.test.js` assertions, and any other test skill-name strings rewritten.
- [x] `agentic update --yes --force` run to refresh dogfood install: old `.claude/skills/agentic-*/` + `.agents/skills/agentic-*/` dirs removed; new `ad-*` dirs land; state files updated.
- [x] Narrative docs (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `WORKFLOW.md`) refresh: skill tables, counts unchanged, cross-references updated, single forward-pointing note on the rename for historical context (AGENTS.md Gotchas).
- [x] `npm test` passes (179/179 at closure).

## Plan

- [x] Draft + accept [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md) (commit b5a7089).
- [x] Mechanical rename across source skill dirs + frontmatter + bodies + wiring + tests (commit b1e5cc6).
- [x] Dogfood refresh via `agentic update --yes --force` (commit b8fa60b).
- [x] `.gitignore` exclude `.claude/settings.local.json` — accidentally captured side fix (commit b601b50).
- [x] Narrative doc refresh + global forward-pointer (commit e5f46d1).
- [x] PR + merge — landed via PR #25 (merge commit d7fd731) on 2026-05-10.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: rename slash commands + skill dirs only; preserve `agentic` brand; historical refs handled via single forward-pointer in narrative docs; commit split = ADR + rename + dogfood + docs.
- **2026-05-10 — Shipped.** Five-commit chain b5a7089 → b1e5cc6 → b8fa60b → b601b50 → e5f46d1. 23 skills renamed across source + dogfood + frontmatter + wiring + tests + narrative docs. ADR/task filenames under `doc/` preserved as historical record. `agentic` brand preserved (CLI binary, npm package, repo, state files, managed-doc marker). Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (179/179)
- [x] Code review completed — fresh-context review on the v0.15 + rename bundle (artifact: .agentic/reviews/2026-05-10T23-30-00Z-v0.15.0-bundle-with-rename-review.md, gitignored). 5 Concerns surfaced and addressed in fix commit a5c31eb before merge.
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
