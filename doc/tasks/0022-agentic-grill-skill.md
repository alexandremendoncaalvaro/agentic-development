# Task `0022`: Ship `agentic-grill` workflow-operational skill (v0.16.0-beta.1)

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0022](../adr/0022-agentic-grill-skill.md)
**Board ref:**

## Context

`agentic-grill` is the interview-before-research skill that sits upstream of [`agentic-ground`](../../src/skills/claude-code/agentic-ground/SKILL.md). Resolves vocabulary inline against `CONTEXT.md` when present (depends on `agentic-domain` from [task-0021](0021-agentic-domain-skill.md), hence ordered second in [task-0020](0020-mattpocock-absorptions.md) Phase 2). Distinguishes from `agentic-tdg` (technique-known regime) and `agentic-spike` (technique-uncertain regime) by Step 0 routing.

No accepting ADR exists for this skill in v0.14. Per [ADR-0007](../adr/0007-workflow-operational-skills.md) §6, every workflow-operational skill ships with its own ADR; the ADR will be drafted at the start of the v0.16.x branch before the skill body lands.

Universal across all profiles per [task-0020](0020-mattpocock-absorptions.md) Phase 2.

## Acceptance Criteria

- [x] [`doc/adr/0022-agentic-grill-skill.md`](../adr/0022-agentic-grill-skill.md) accepted, naming the interview phases, the upstream-of-`agentic-ground` placement, and the routing disambiguation against `agentic-tdg` / `agentic-spike` / `agentic-diagnose`.
- [x] [`src/skills/claude-code/agentic-grill/SKILL.md`](../../src/skills/claude-code/agentic-grill/SKILL.md) — name, allowed-tools `Read, Glob, Grep, Bash`, trigger keywords from ADR-0022.
- [x] [`src/skills/codex/agentic-grill/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-grill/) — Codex parity, `<background_information>` / `<instructions>` / `<output_contract>` template.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-grill` in all four profiles' `universal` lists.
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/agentic-grill`.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [x] [`README.md`](../../README.md) — skill table + recommended-sequence narrative ("Question is fuzzy?" hint + greenfield sequence step 4) cross-references the interview → research routing.
- [x] Step 0 routing in `agentic-grill` body disambiguates against `agentic-ground` / `agentic-tdg` / `agentic-spike` / `agentic-diagnose`. Reverse cross-references to `agentic-grill` will follow as the existing skill bodies are revisited (not blocking v0.15).
- [x] Inline glossary updates land in `CONTEXT.md` when `agentic-domain` is installed (the bundled ship guarantees it is). Skill body documents the route via `/agentic-domain`.
- [x] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js); end-to-end install in [test/init.test.js](../../test/init.test.js) UNIVERSAL_SKILLS.
- [x] Dogfood install refreshed; skill lands at `.claude/skills/agentic-grill/` and `.agents/skills/agentic-grill/`.
- [x] [`package.json`](../../package.json) bumped to `0.15.0-beta.1` _(bundled with v0.15 — original schedule was v0.16; user chose to bundle 2026-05-10)_.
- [x] `npm test` passes (166/166 at closure).

## Plan

- [x] Draft + accept [ADR-0022](../adr/0022-agentic-grill-skill.md).
- [x] Implement [Claude](../../src/skills/claude-code/agentic-grill/SKILL.md) + [Codex](../../src/skills/codex/agentic-grill/SKILL.md) skill bodies.
- [x] Wire profiles + init + rootdoc + README + tests.
- [x] Cross-skill routing disambiguation in the `agentic-grill` body (`agentic-ground` / `agentic-tdg` / `agentic-spike` / `agentic-diagnose`).
- [x] Dogfood refresh + version bump (bundled with v0.15.0-beta.1).
- [ ] Atomic commits + PR + merge to `cli`; tag `v0.15.0-beta.1`; `npm publish --tag beta`; smoke verify. _Pending user authorization for shared-state actions (bundled commit/PR/tag/publish covers all four v0.15 skills together)._

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Stub opened to satisfy [task-0020](0020-mattpocock-absorptions.md) Phase-2 close DoD. Unique among the four Phase-2 stubs in that no accepting ADR exists yet; ADR drafting is the first step of the v0.16.x branch.
- **2026-05-10 — Implemented in v0.15 bundle.** ADR-0022 drafted and accepted as part of the bundled v0.15 release. Skill body lifts mattpocock's `grill-with-docs` discipline (codebase-first, one question at a time with recommendation, challenge against glossary, sharpen fuzzy language, scenario-test relationships, capture inline) into the kit's vocabulary with explicit Step 0 routing to the four downstream skills (`agentic-ground` / `agentic-tdg` / `agentic-spike` / `agentic-diagnose`) and the three-criteria ADR rule for decision capture. Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (166/166)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — _to run on the bundled v0.15 PR_
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
