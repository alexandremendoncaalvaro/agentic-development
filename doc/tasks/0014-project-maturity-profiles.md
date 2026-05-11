# Task `0014`: Ship project maturity profiles (v0.8.0-beta.1)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

Phase 2 of the holistic coherence review surfaced that the kit assumes "team product" as the implicit default install set. The user articulated the principle ("Steve Rogers / Capitão América" metaphor) — the kit must amplify, not coerce, and the same toolkit should scale from solo PoC to mature regulated product without ceremony jumps. ADR-0013 accepts four profiles (`poc`, `solo`, `team`, `mature`) selectable at init, recorded in the state file, and changeable later via a new `agentic profile` command. Default `team` preserves v0.7 behavior; existing installs migrate transparently.

## Acceptance Criteria

- [x] [`doc/adr/0013-project-maturity-profiles.md`](../adr/0013-project-maturity-profiles.md) exists, status `accepted`, with the four-profile catalog, the monotone-superset rule, and the schemaVersion-stays-at-1 forward-compat decision.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) exposes `PROFILES` (the four-profile catalog), `DEFAULT_PROFILE` (`team`), `requiredSkillsForProfile(name)`, `conditionalSkillsForProfile(name)`, and `validateProfile(name)`. Catalog data carries per-profile universal lists, conditional rules, and a human-readable `note`.
- [x] [`src/lib/state.js`](../../src/lib/state.js) reads / writes an optional `profile` field. Missing field on load → defaults to `team`. New writes always include the field.
- [x] [`src/commands/init.js`](../../src/commands/init.js) refactored to consume the profile catalog rather than hardcoded `REQUIRED_SKILLS` / `CONDITIONAL_SKILLS`. New `--profile <name>` flag accepted; non-interactive defaults to `team`. Interactive TUI shows the profile selection as the first prompt with notes per profile.
- [x] [`src/commands/update.js`](../../src/commands/update.js) reads the stored profile from state and honors profile-scoped install routing.
- [x] [`src/commands/profile.js`](../../src/commands/profile.js) implements `agentic profile` (show), `agentic profile list`, and `agentic profile set <name>` (with prompt-before-add/remove). `set` runs the equivalent of `update` after writing the new profile field.
- [x] [`src/index.js`](../../src/index.js) wires the new `profile` command alongside `init` and `update`.
- [x] Tests cover: profile catalog completeness; state file round-trip with and without profile field; `init --profile poc` installs only the poc set; `init --profile mature` installs the team set plus recommends agentic-hooks; `agentic profile set <name>` prompts before changes; legacy state without profile field migrates to `team` silently.
- [x] [`README.md`](../../README.md) gains a "Profiles" subsection in the install flow describing the four profiles, the default, and the change-later path.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §1 mentions the four-layer stack scales by profile (specs and ADRs are universal in `team`/`mature`, opt-in in `solo`, blocked in `poc`).
- [x] Dogfood: kit's own state stays at `team` (preserves v0.7 install set byte-identical).
- [x] [`package.json`](../../package.json) bumped to `0.8.0-beta.1`.
- [x] `npm test` passes.

## Plan

- [x] Branch `feat/v0.8.0-profiles` cut from `cli`.
- [x] Write [`doc/adr/0013-project-maturity-profiles.md`](../adr/0013-project-maturity-profiles.md) in status `accepted`.
- [x] Write this task file.
- [x] Implement [`src/lib/profiles.js`](../../src/lib/profiles.js) catalog.
- [x] Extend [`src/lib/state.js`](../../src/lib/state.js) for optional `profile` field.
- [x] Refactor [`src/commands/init.js`](../../src/commands/init.js) to consume the catalog; add `--profile` flag and TUI prompt.
- [x] Update [`src/commands/update.js`](../../src/commands/update.js) to read profile from state.
- [x] Implement [`src/commands/profile.js`](../../src/commands/profile.js).
- [x] Wire [`src/index.js`](../../src/index.js).
- [x] Add tests under [`test/`](../../test/) covering profile selection, state round-trip, and migration.
- [x] Update [`README.md`](../../README.md) Profiles subsection + [`WORKFLOW.md`](../../WORKFLOW.md) §1 stack-scales-by-profile note.
- [x] Run `node bin/agentic.js update --yes` to refresh dogfood install (kit stays at `team`).
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. Fix anything that drifted.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.8.0-beta.1`; `npm publish --tag beta`; smoke verify.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user (G1–G6):

- G1: default `team` profile. Explicit `--profile` flag and TUI prompt. No auto-detect.
- G2: profile changeable via `agentic profile set <name>`.
- G3: per-profile template depth deferred to a follow-up ADR. v0.8 changes which skills install; templates remain universal.
- G4: gate posture per profile (poc=zero, solo=advisory, team=hooks recommended, mature=hooks deterministic recommended) is informational in the profile catalog; enforcement remains via `agentic-hooks` invocation.
- G5: profile field in same state file (no separate `.agentic/profile.json`).
- G6: profile is first-class TUI choice — first prompt before agent select.

The principle the user articulated ("Steve Rogers becomes Capitão América") translates directly: same posture (philosophy + ground), additive capabilities as maturity grows, never coerced ceremony.

### 2026-05-09 — close-out (v0.8.0-beta.1)

Shipped in v0.8.0-beta.1. Close-out flipped retroactively after `/agentic-next` surfaced this task as in-progress despite the v0.8.0 release. ADR-0013 + Task 0014 + `src/lib/profiles.js` catalog + state schema extension + init/update/profile commands + README "Project maturity profiles" section + 15 new tests in `test/profile.test.js` all landed; 126/126 tests green at the time of release. Existing v0.7 installs migrate to `team` transparently via the loader's optional-field default.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
