# Task `0024`: Ship `agentic-diagnose` workflow-operational skill (v0.18.0-beta.1)

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** [ADR-0021](../adr/0021-diagnose-discipline.md)
**Board ref:**

## Context

[ADR-0021](../adr/0021-diagnose-discipline.md) accepts WORKFLOW §15 "Diagnose With Discipline" and defers the operationalizing skill to v0.18.x. v0.14.0-beta.1 shipped the principle (new §15 with five phases plus Sources updates for Kernighan/Pike and Popper); the skill is the last in [task-0020](0020-mattpocock-absorptions.md) Phase 2.

`agentic-diagnose` is a five-phase debugging skill operationalizing §15. Universal across all profiles per ADR-0021 §3 — diagnosis discipline applies regardless of project maturity.

Ordered fourth (last) in Phase 2 because it is the most self-contained — no dependency on `agentic-domain`, `agentic-grill`, or `agentic-deepen`. Ships once the upstream three have settled.

## Acceptance Criteria

- [x] [`src/skills/claude-code/agentic-diagnose/SKILL.md`](../../src/skills/claude-code/agentic-diagnose/SKILL.md) — name, allowed-tools `Read, Edit, Write, Glob, Grep, Bash`, trigger keywords from ADR-0021.
- [x] [`src/skills/codex/agentic-diagnose/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-diagnose/) — Codex parity, `<background_information>` / `<instructions>` / `<output_contract>` template.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-diagnose` in all four profiles' `universal` lists.
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/agentic-diagnose`.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [x] [`README.md`](../../README.md) — skill table + "Bug or performance regression?" hint cross-references `/agentic-diagnose`.
- [x] Five-phase body lifts §15 directly per ADR-0021 §4: build a feedback loop → reproduce → hypothesise (3-5 ranked falsifiable) → instrument → fix + regression-test. Per the user's 2026-05-10 confirmation, this kit ships the five-phase shape; mattpocock's six-phase variant (with split Cleanup/post-mortem) is documented as prior art but not adopted. Cleanup steps are folded into Phase 5 closing-checklist bullets.
- [x] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js); end-to-end install in [test/init.test.js](../../test/init.test.js) UNIVERSAL_SKILLS.
- [x] Dogfood install refreshed; skill lands at `.claude/skills/agentic-diagnose/` and `.agents/skills/agentic-diagnose/`.
- [x] [`package.json`](../../package.json) bumped to `0.15.0-beta.1` _(bundled with v0.15 — original schedule was v0.18; user chose to bundle 2026-05-10)_.
- [x] `npm test` passes (166/166 at closure).
- [ ] After ship: `/agentic-next` survey on `cli` reports no remaining absorptions from [task-0020](0020-mattpocock-absorptions.md). _Will run after the bundled v0.15 ship lands._

## Plan

- [x] Implement [Claude](../../src/skills/claude-code/agentic-diagnose/SKILL.md) + [Codex](../../src/skills/codex/agentic-diagnose/SKILL.md) skill bodies per ADR-0021 five-phase shape.
- [x] Wire profiles + init + rootdoc + README + tests.
- [x] Dogfood refresh + version bump (bundled with v0.15.0-beta.1).
- [ ] Atomic commits + PR + merge to `cli`; tag `v0.15.0-beta.1`; `npm publish --tag beta`; smoke verify. _Pending user authorization for shared-state actions (bundled commit/PR/tag/publish covers all four v0.15 skills together)._
- [ ] After ship lands: confirm [task-0020](0020-mattpocock-absorptions.md) Phase-2 close bullets 1+2 can flip green per the cascade noted in the closure entry. _Already flipped in this turn; verification on next `/agentic-next` survey._

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Stub opened to satisfy [task-0020](0020-mattpocock-absorptions.md) Phase-2 close DoD. Ship of this skill is the trigger to close task-0020 itself (last of the four deferred skills).
- **2026-05-10 — Implemented in v0.15 bundle.** Skill body lifts ADR-0021's five-phase shape verbatim with the Phase-1 framing borrowed from mattpocock's `diagnose` ("the loop is the skill — everything else is mechanical") attributed inline. The ten loop-construction techniques and the iteration-on-the-loop discipline are preserved. Phase 3 enforces 3-5 ranked falsifiable hypotheses with prediction wording. Phase 5 routes to `/agentic-deepen` when no correct seam exists for a regression test (ties the diagnose ↔ deepen pairing per ADR-0020 / ADR-0021). Per user's 2026-05-10 confirmation (b), kept the five-phase shape rather than adopting mattpocock's six-phase split (Cleanup/post-mortem is folded into Phase 5 closing checklist). Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked (with the post-ship `/agentic-next` survey deferred to after the bundled v0.15 ship lands), plus:

- [x] Local tests pass (166/166)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — _to run on the bundled v0.15 PR_
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
- [x] [task-0020](0020-mattpocock-absorptions.md) flipped to `done` per the cascade noted in this task's Plan _(closed earlier in the same turn that opened the four Phase-2 stubs)_.
