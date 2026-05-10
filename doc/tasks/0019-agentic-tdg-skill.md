# Task `0019`: Ship `agentic-tdg` workflow-operational skill (v0.13.0-beta.1)

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

WORKFLOW.md §9 (Outcome-Based Prompting / TDG) is documented but only partially automated — the §9.4 TDM clause is inline in `agentic-philosophy` Goal-Driven Execution; the other three sub-practices (ground truth pair, three approaches, single-criterion selection) have no implementing skill. [ADR-0018](../adr/0018-agentic-tdg-skill.md) accepts a workflow-operational skill `agentic-tdg` that scaffolds the four §9 sub-practices end-to-end. Distinguishes from `agentic-spike` (§14, unknown-technique regime) by Step 0 routing.

## Acceptance Criteria

- [x] [`doc/adr/0018-agentic-tdg-skill.md`](../adr/0018-agentic-tdg-skill.md) exists, status `accepted`, with the §9 sub-practice mapping and the spike-vs-tdg disambiguation.
- [x] [`src/skills/claude-code/agentic-tdg/SKILL.md`](../../src/skills/claude-code/agentic-tdg/SKILL.md) exists with frontmatter `name: agentic-tdg`, `allowed-tools: Read, Glob, Grep, Bash`, and a description carrying the §9 trigger keywords.
- [x] [`src/skills/codex/agentic-tdg/SKILL.md`](../../src/skills/codex/agentic-tdg/SKILL.md) exists with the matching content shaped to the Codex `<background_information>` / `<instructions>` / `<output_contract>` template plus an `agents/openai.yaml`.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) `PROFILES` catalog adds `agentic-tdg` to every profile's `universal` list.
- [x] [`src/commands/init.js`](../../src/commands/init.js) slashLine summary lists `/agentic-tdg`.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS` carries an entry.
- [x] [`README.md`](../../README.md) skill table lists `agentic-tdg`. "Recommended daily sequence" cross-references it for implementation-phase regime.
- [x] Tests cover: `agentic-tdg` is in `UNIVERSAL_SKILLS`; profile-coverage assertion in `test/profile.test.js`.
- [x] Dogfood install refreshed; new skill lands at `.claude/skills/agentic-tdg/` and `.agents/skills/agentic-tdg/`.
- [x] [`package.json`](../../package.json) bumped to `0.13.0-beta.1`.
- [x] `npm test` passes (146 → 148+).

## Plan

- [x] Branch `feat/v0.13.0-agentic-tdg` cut from `cli`.
- [x] Write [`doc/adr/0018-agentic-tdg-skill.md`](../adr/0018-agentic-tdg-skill.md).
- [x] Write this task file.
- [x] Implement [`src/skills/claude-code/agentic-tdg/SKILL.md`](../../src/skills/claude-code/agentic-tdg/SKILL.md).
- [x] Implement [`src/skills/codex/agentic-tdg/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-tdg/).
- [x] Wire profiles + init + rootdoc + README + tests.
- [x] Dogfood refresh + version bump.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.13.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-10

ADR-0018 lifts §9 directly. Step 0 disambiguation against `agentic-spike` (§14 unknown-technique regime) prevents over-trigger. agentic-plan-mode (§6) and agentic-eval (§13) remain deferred per ADR-0007 §6.

Shipped v0.13.0-beta.1: PR #23 merged into `cli` at `c2e11c2`; tag `v0.13.0-beta.1` pushed; `npm publish --tag beta` succeeded; smoke-verified `npx @alexandrealvaro/agentic@beta init --agent claude-code --yes` lands `.claude/skills/agentic-tdg/SKILL.md` in fresh scratch dir. 150 tests pass (was 148).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
