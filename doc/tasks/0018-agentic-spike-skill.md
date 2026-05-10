# Task `0018`: Ship `agentic-spike` workflow-operational skill (v0.12.0-beta.1)

**Status:** in-progress
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

WORKFLOW.md §14 (Staged Spikes With Golden Fixtures) is documented but unautomated — the same gap [ADR-0007](../adr/0007-workflow-operational-skills.md) §1 names. /agentic-next survey on the kit's own repo flagged it as one of the deferred §6 candidates with the most-established prior art (XP spike, golden datasets, trajectory evaluation, stage-segmented error analysis, visual CV debugging). [ADR-0017](../adr/0017-agentic-spike-skill.md) accepts a workflow-operational skill `agentic-spike` that scaffolds the four-stage flow (discovery → golden fixture → pipeline with gates → two-layer evaluation), output to `spikes/NNNN-<slug>/`, promote-or-delete lifecycle.

## Acceptance Criteria

- [ ] [`doc/adr/0017-agentic-spike-skill.md`](../adr/0017-agentic-spike-skill.md) exists, status `accepted`, with the four-stage body, the disambiguation against `agentic-ground` in Step 0, and the promote-or-delete lifecycle.
- [ ] [`src/skills/claude-code/agentic-spike/SKILL.md`](../../src/skills/claude-code/agentic-spike/SKILL.md) exists with frontmatter `name: agentic-spike`, `allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch, WebSearch`, and a description carrying the auto-trigger keywords.
- [ ] [`src/skills/codex/agentic-spike/SKILL.md`](../../src/skills/codex/agentic-spike/SKILL.md) exists with the matching content shaped to the Codex `<background_information>` / `<instructions>` / `<output_contract>` template plus an `agents/openai.yaml`.
- [ ] [`src/lib/profiles.js`](../../src/lib/profiles.js) `PROFILES` catalog adds `agentic-spike` to every profile's `universal` list (poc / solo / team / mature). Universal install per ADR-0017 §1.
- [ ] [`src/commands/init.js`](../../src/commands/init.js) `REQUIRED_SKILLS` (the team-profile compatibility export) includes `agentic-spike` automatically (derived from team universal); slashLine summary lists `/agentic-spike`.
- [ ] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS` carries an entry for `agentic-spike`.
- [ ] [`README.md`](../../README.md) skill table lists `agentic-spike`. "Recommended daily sequence" mentions when the skill auto-invokes (technique uncertain across multiple plausible approaches).
- [ ] Tests: `agentic-spike` is in `UNIVERSAL_SKILLS` in [`test/init.test.js`](../../test/init.test.js); end-to-end install lands the skill at both agent paths for every profile; profile catalog tests assert `agentic-spike` is in every profile's universal set.
- [ ] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes --force`; new skill lands at `.claude/skills/agentic-spike/` and `.agents/skills/agentic-spike/`.
- [ ] [`package.json`](../../package.json) bumped to `0.12.0-beta.1` (skill set expansion = minor).
- [ ] `npm test` passes (142 → 145+).

## Plan

- [x] Branch `feat/v0.12.0-agentic-spike` cut from `cli`.
- [x] Write [`doc/adr/0017-agentic-spike-skill.md`](../adr/0017-agentic-spike-skill.md) in status `accepted`.
- [x] Write this task file.
- [ ] Implement [`src/skills/claude-code/agentic-spike/SKILL.md`](../../src/skills/claude-code/agentic-spike/SKILL.md).
- [ ] Implement [`src/skills/codex/agentic-spike/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-spike/).
- [ ] Update [`src/lib/profiles.js`](../../src/lib/profiles.js) — add `agentic-spike` to all four profiles' universal lists.
- [ ] Update [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary.
- [ ] Update [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS`.
- [ ] Update [`README.md`](../../README.md) — skill table + "Recommended daily sequence" cross-ref.
- [ ] Update tests: `UNIVERSAL_SKILLS` constant + profile-coverage assertion.
- [ ] Run `node bin/agentic.js update --yes --force` to refresh dogfood install.
- [ ] Bump version in [`package.json`](../../package.json).
- [ ] Run `npm test`. Fix anything that drifted.
- [ ] Atomic commits + PR + merge to `cli`; tag `v0.12.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-10

ADR-0017 lifts §14 directly — four-stage flow, Step 0 disambiguation against `agentic-ground`, promote-or-delete lifecycle. Universal in all four profiles per the WORKFLOW-principles-bind-every-profile rule from ADR-0013.

`agentic-tdg` (§9), `agentic-plan-mode` (§6), `agentic-eval` (§13) remain deferred per ADR-0007 §6. Each gets its own ADR + task when proposed; no implicit bundling.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
