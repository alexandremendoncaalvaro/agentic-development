# Task `0028`: Rename slash-command prefix `agentic-` → `ad-`

**Status:** proposed
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md)
**Board ref:**

## Context

[ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md) accepts the slash-command rename for ergonomics (`/agentic-X` is 9 prefix chars; `/ad-X` is 2). Breaking change is null-cost while the kit has no external users.

Scope strictly inside skill identity surface; `agentic` brand stays on CLI binary, npm package, repo name, state files, and managed-doc marker.

## Acceptance Criteria

- [x] [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md) accepted with the 23-skill mapping table and the rename-surface / preserve scope.
- [ ] Source skill directories renamed: `src/skills/claude-code/agentic-*/` → `src/skills/claude-code/ad-*/` and `src/skills/codex/agentic-*/` → `src/skills/codex/ad-*/`.
- [ ] SKILL.md frontmatter `name:` fields rewritten across all 23 Claude Code skills.
- [ ] Codex `agents/openai.yaml` `display_name:` fields rewritten across all 23 Codex skills.
- [ ] Inside skill bodies: all `/agentic-X` slash-command references and bare `agentic-X` cross-skill mentions rewritten to `/ad-X` / `ad-X`.
- [ ] `src/lib/profiles.js`, `src/commands/init.js`, `src/lib/rootdoc.js` skill-name strings rewritten.
- [ ] `test/init.test.js` UNIVERSAL_SKILLS list, `test/profile.test.js` assertions, and any other test skill-name strings rewritten.
- [ ] `agentic update --yes --force` run to refresh dogfood install: old `.claude/skills/agentic-*/` + `.agents/skills/agentic-*/` dirs removed; new `ad-*` dirs land; state files updated.
- [ ] Narrative docs (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`) refresh: skill tables, counts unchanged, cross-references updated, single forward-pointing note on the rename for historical context.
- [ ] `npm test` passes.

## Plan

- [x] Draft + accept [ADR-0026](../adr/0026-slash-command-rename-ad-prefix.md).
- [ ] Mechanical rename across source skill dirs + frontmatter + bodies + wiring + tests (single atomic commit — logically one concern).
- [ ] Dogfood refresh via `agentic update --yes --force`.
- [ ] Narrative doc refresh + global forward-pointer.
- [ ] Atomic commits + PR + merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task opened. Decisions confirmed: rename slash commands + skill dirs only; preserve `agentic` brand; historical refs handled via single forward-pointer in narrative docs; commit split = ADR + rename + dogfood + docs.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
