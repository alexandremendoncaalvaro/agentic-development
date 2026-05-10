# Task `0023`: Ship `agentic-deepen` workflow-operational skill (v0.17.0-beta.1)

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0020](../adr/0020-deep-modules-vocabulary.md)
**Board ref:**

## Context

[ADR-0020](../adr/0020-deep-modules-vocabulary.md) accepts the Ousterhout/Feathers vocabulary in WORKFLOW §8. v0.14.0-beta.1 shipped the principle (§8 grew from 4 lines to ~25 lines covering deletion test, interface-as-test-surface, two-adapters rule); the operationalizing skill is deferred per [task-0020](0020-mattpocock-absorptions.md) Phase 2.

`agentic-deepen` surfaces deepening opportunities in the codebase using the §8 vocabulary. Pairs with [`agentic-audit`](../../src/skills/claude-code/agentic-audit/SKILL.md) — audit detects drift; deepen proposes refactors. Universal across `team` and `mature` profiles only — premature for `poc` and `solo` per ADR-0020 §4 (deepening is a stable-codebase practice, not a greenfield one).

Ordered third in Phase 2 because the §8 vocabulary needs to settle in real ADRs and architecture docs before a skill consumes it.

## Acceptance Criteria

- [x] [`src/skills/claude-code/agentic-deepen/SKILL.md`](../../src/skills/claude-code/agentic-deepen/SKILL.md) — name, allowed-tools `Read, Glob, Grep, Bash`, trigger keywords from ADR-0020.
- [x] [`src/skills/codex/agentic-deepen/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-deepen/) — Codex parity, `<background_information>` / `<instructions>` / `<output_contract>` template.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-deepen` in `team` and `mature` profiles' `universal` lists only (excluded from `poc` and `solo` per ADR-0020 §4). Monotone-superset invariant preserved (poc ⊆ solo ⊆ team ⊆ mature).
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary added; the existing universal-label filter now keys off `agentic-deepen` to suppress it for `poc`/`solo` profiles.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry that explicitly notes the team+mature scope.
- [x] [`README.md`](../../README.md) — skill table marks profile scope (`universal in team + mature only`); "Stable codebase friction?" hint cross-references `/agentic-audit` pairing.
- [x] Pairs with `agentic-audit`: skill body documents audit→deepen routing in Step 3 and `## Next` section. Audit's outbound routing remains a separate follow-up (not blocking v0.15).
- [x] Tests: profile-scoped install assertion in [test/profile.test.js](../../test/profile.test.js) — present in team/mature, absent in poc/solo. New test shape for the kit (first profile-scoped skill).
- [x] Dogfood install refreshed; skill lands at `.claude/skills/agentic-deepen/` and `.agents/skills/agentic-deepen/` (this repo is `team` profile).
- [x] [`package.json`](../../package.json) bumped to `0.15.0-beta.1` _(bundled with v0.15 — original schedule was v0.17; user chose to bundle 2026-05-10)_.
- [x] `npm test` passes (166/166 at closure).

## Plan

- [x] Implement [Claude](../../src/skills/claude-code/agentic-deepen/SKILL.md) + [Codex](../../src/skills/codex/agentic-deepen/SKILL.md) skill bodies per ADR-0020 §8 vocabulary.
- [x] Wire profiles (team + mature only) + init + rootdoc + README + tests.
- [x] Pairing with `agentic-audit` documented in both skill bodies (Step 3 grilling loop + `## Next`).
- [x] Dogfood refresh + version bump (bundled with v0.15.0-beta.1).
- [ ] Atomic commits + PR + merge to `cli`; tag `v0.15.0-beta.1`; `npm publish --tag beta`; smoke verify. _Pending user authorization for shared-state actions (bundled commit/PR/tag/publish covers all four v0.15 skills together)._

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Stub opened to satisfy [task-0020](0020-mattpocock-absorptions.md) Phase-2 close DoD. First skill in the kit with profile-scoped install (team + mature only); test coverage must assert exclusion from `poc`/`solo` as well as inclusion in `team`/`mature`.
- **2026-05-10 — Implemented in v0.15 bundle.** Skill body lifts mattpocock's `improve-codebase-architecture` shape (three phases — explore organically → present numbered candidates → grilling loop on chosen candidate) into the kit's WORKFLOW §8 vocabulary verbatim (Module / Interface / Depth / Seam / Adapter / Leverage / Locality, plus deletion test, two-adapters rule, interface-is-test-surface). Candidate template enforces the deletion test and the two-adapters check inline. Profile scoping verified via the new test in [test/profile.test.js](../../test/profile.test.js) — present in team/mature, absent in poc/solo, monotone-superset invariant preserved. The `init.js` slashLine filter was extended to suppress `/agentic-deepen` for `poc`/`solo` so the install summary does not advertise an absent skill. Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (166/166)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — _to run on the bundled v0.15 PR_
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
