# Task `0016`: Ship `agentic-next` workflow-operational skill (v0.10.0-beta.1)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

User surfaced a navigation gap during real use: kit ships twelve skills + four maturity profiles + four artifact layers, but no primitive answers "given my current state, what should I invoke next?" README "Recommended daily sequence" (v0.6) is static prose; `agentic-audit` detects drift but does not advise on workflow order. ADR-0015 accepts a new workflow-operational skill `agentic-next` modeled on `flutter doctor`: layer-by-layer state survey + profile-aware filtering + prioritized concrete next-action recommendations. Universal install across every profile.

## Acceptance Criteria

- [x] [`doc/adr/0015-agentic-next-skill.md`](../adr/0015-agentic-next-skill.md) exists, status `accepted`, with the five-step survey shape, profile-aware branching, and the read-only / advisory posture.
- [x] [`src/skills/claude-code/agentic-next/SKILL.md`](../../src/skills/claude-code/agentic-next/SKILL.md) exists with frontmatter `name: agentic-next`, `allowed-tools: Read, Glob, Grep, Bash`, and a description carrying the auto-trigger keywords ("what's next", "next step", "where am I", "project status", "doctor", "what should I do", "audit my workflow").
- [x] [`src/skills/codex/agentic-next/SKILL.md`](../../src/skills/codex/agentic-next/SKILL.md) exists with the matching content shaped to the Codex `<background_information>` / `<instructions>` / `<output_contract>` template plus an `agents/openai.yaml`.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) `PROFILES` catalog adds `agentic-next` to every profile's `universal` list (poc / solo / team / mature). The profile-aware survey logic is documented in the skill body, not in the catalog (skill detects profile at runtime).
- [x] [`src/commands/init.js`](../../src/commands/init.js) `REQUIRED_SKILLS` (the team-profile compatibility export) includes `agentic-next`; slashLine summary lists `/agentic-next`.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS` carries an entry for `agentic-next`.
- [x] [`README.md`](../../README.md) skill table lists `agentic-next` as the third workflow-operational universal skill alongside `agentic-philosophy` and `agentic-review`. "Recommended daily sequence" section mentions the skill as the recovery / mid-flow check.
- [x] Tests cover: `agentic-next` is in `UNIVERSAL_SKILLS` in [`test/init.test.js`](../../test/init.test.js); end-to-end install lands the skill at both agent paths for every profile; profile catalog tests assert `agentic-next` is in every profile's universal set.
- [x] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes`; new skill lands at `.claude/skills/agentic-next/` and `.agents/skills/agentic-next/`.
- [x] [`package.json`](../../package.json) bumped to `0.10.0-beta.1` (skill set expansion = minor).
- [x] `npm test` passes (135 → 137+).

## Plan

- [x] Branch `feat/v0.10.0-agentic-next` cut from `cli`.
- [x] Write [`doc/adr/0015-agentic-next-skill.md`](../adr/0015-agentic-next-skill.md) in status `accepted`.
- [x] Write this task file.
- [x] Implement [`src/skills/claude-code/agentic-next/SKILL.md`](../../src/skills/claude-code/agentic-next/SKILL.md).
- [x] Implement [`src/skills/codex/agentic-next/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-next/).
- [x] Update [`src/lib/profiles.js`](../../src/lib/profiles.js) — add `agentic-next` to all four profiles' universal lists.
- [x] Update [`src/commands/init.js`](../../src/commands/init.js) — REQUIRED_SKILLS export + slashLine summary.
- [x] Update [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS`.
- [x] Update [`README.md`](../../README.md) — skill table + "Recommended daily sequence" cross-ref.
- [x] Update tests: `UNIVERSAL_SKILLS` constant in `test/init.test.js`; add profile-coverage assertion in `test/profile.test.js`.
- [x] Run `node bin/agentic.js update --yes` to refresh dogfood install.
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. Fix anything that drifted.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.10.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user (N1–N7):

- N1: skill first, CLI deferred. The "what's next?" question arises mid-conversation more often than mid-shell-session.
- N2: name `agentic-next`. Description triggers cover "doctor", "status", "where am I" so alternative mental models land the same skill.
- N3: universal across all four profiles. Navigation aid is broadly valuable.
- N4: profile-aware survey logic. `poc` skips Layer 2/3 noise; `solo` informational on ADRs; `team`/`mature` full.
- N5: structured Markdown output (no JSON; works in both hosts uniformly).
- N6: auto-trigger keywords cover multiple mental models for the same intent.
- N7: complements `agentic-audit`, not folded in. Audit = drift; next = navigation. Skill bodies cross-reference.

### 2026-05-09 — close-out (v0.10.0-beta.1)

Shipped in v0.10.0-beta.1. Close-out flipped retroactively after `/agentic-next` itself surfaced this task as in-progress despite the v0.10.0 release — fitting meta-validation that the skill works on real state. ADR-0015 + Task 0016 + `src/skills/{claude-code,codex}/agentic-next/` + agents/openai.yaml + profile catalog updates (universal in all four profiles) + init.js wiring + README updates + UNIVERSAL_SKILLS extension all landed; 139/139 tests green at the time of release.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
