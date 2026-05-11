# Task `0021`: Ship `agentic-domain` workflow-operational skill (v0.15.0-beta.1)

**Status:** done
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:** ADR-0019
**Board ref:**

## Context

ADR-0019 accepts the Domain layer (`CONTEXT.md`) as Layer 2 of the artifact stack and defines its lazy-creation discipline. v0.14.0-beta.1 shipped the principle (WORKFLOW renumbering, ADR, doc updates, skill-body rename four-layer→five-layer); the operationalizing skill is deferred to its own minor per [task-0020](0020-mattpocock-absorptions.md) Phase 2 schedule.

`agentic-domain` lazily creates and updates `CONTEXT.md` from grilling sessions, spec drafting, or explicit `/agentic-domain` invocation. Universal across all profiles' ' First skill in the Phase 2 rollout because the layer landed in v0.14.

## Acceptance Criteria

- [x] [`src/skills/claude-code/agentic-domain/SKILL.md`](../../src/skills/claude-code/agentic-domain/SKILL.md) — name, allowed-tools `Read, Write, Edit, Glob, Grep, Bash`, trigger keywords from ADR-0019.
- [x] [`src/skills/codex/agentic-domain/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-domain/) — Codex parity, `<background_information>` / `<instructions>` / `<output_contract>` template.
- [x] [`src/lib/profiles.js`](../../src/lib/profiles.js) — `agentic-domain` in all four profiles' `universal` lists.
- [x] [`src/commands/init.js`](../../src/commands/init.js) — slashLine summary lists `/agentic-domain`.
- [x] [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) — `SKILL_DESCRIPTIONS` entry.
- [x] [`README.md`](../../README.md) — skill table + recommended-sequence cross-reference.
- [ ] Wire-ins per ADR-0019: `agentic-bootstrap` inserts `CONTEXT.md` pointer in `AGENTS.md` once the file exists; `agentic-spec` consumes glossary in spec drafts; `agentic-architecture` consumes glossary in architecture prose; `agentic-audit` flags drift between glossary terms and code identifiers. _Deferred — these are integrations into existing skills, separable from the `agentic-domain` skill itself. Tracked as a follow-up in [task-0020](0020-mattpocock-absorptions.md) Notes._
- [x] Tests: profile-coverage assertion in [test/profile.test.js](../../test/profile.test.js) (`agentic-domain` universal in every profile' ' end-to-end install in [test/init.test.js](../../test/init.test.js) UNIVERSAL_SKILLS.
- [x] Dogfood install refreshed; skill lands at `.claude/skills/agentic-domain/` and `.agents/skills/agentic-domain/`.
- [x] [`package.json`](../../package.json) bumped to `0.15.0-beta.1` (shipped together with the other three Phase-2 skills as the v0.15 bundle).
- [x] `npm test` passes (166/166 at closure).

## Plan

- [x] Implement [Claude](../../src/skills/claude-code/agentic-domain/SKILL.md) + [Codex](../../src/skills/codex/agentic-domain/SKILL.md) skill bodies.
- [x] Wire profiles + init + rootdoc + README + tests.
- [ ] Wire-ins to bootstrap / spec / architecture / audit' ' _Deferred to follow-up; not blocking v0.15 ship._
- [x] Dogfood refresh + version bump (bundled with v0.15.0-beta.1).
- [ ] Atomic commits + PR + merge to `cli`; tag `v0.15.0-beta.1`; `npm publish --tag beta`; smoke verify. _Pending user authorization for shared-state actions (bundled commit/PR/tag/publish covers all four v0.15 skills together)._

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Stub opened to satisfy [task-0020](0020-mattpocock-absorptions.md) Phase-2 close DoD ("each deferred skill has its own task file open"). Acceptance + Plan to be expanded at the start of the v0.15.x branch when implementation begins.
- **2026-05-10 — Implemented in v0.15 bundle.** User chose to bundle all four Phase-2 skills (this one plus `agentic-grill` / `agentic-deepen` / `agentic-diagnose`) into a single v0.15.0-beta.1 release rather than the originally-scheduled per-minor stack (v0.15 → v0.18). Rationale: 3 of 4 skills are direct mirrors of mature mattpocock prior art; bundling kept the WORKFLOW §15 / §8 / Layer-2 deltas coherent in one ship. Skill body lifts ADR-0019 verbatim into the lazy lifecycle owner pattern: detect existing `CONTEXT.md` / `CONTEXT-MAP.md`, resolve term with the four-part entry shape (Definition / `_Avoid_` / Related code), insert alphabetically, write or edit, cross-reference adjacent layers (suggestions only — no spec/ADR edits). The wire-ins to `agentic-bootstrap` / `agentic-spec` / `agentic-architecture` / `agentic-audit` are deferred as a separate follow-up; the standalone skill ships in v0.15 and can be invoked directly via `/agentic-domain`. Status flipped `proposed` → `done`.

## Definition of Done

All Acceptance Criteria checked (with the noted wire-ins follow-up deferred), plus:

- [x] Local tests pass (166/166)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — _to run on the bundled v0.15 PR_
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
