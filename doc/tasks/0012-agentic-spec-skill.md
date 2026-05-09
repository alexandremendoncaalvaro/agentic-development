# Task `0012`: Ship `agentic-spec` skill + four-layer artifact stack (v0.5.0-beta.1)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

Spec-driven development with LLMs has converged on a four-layer artifact stack (constitution → spec → plan/decisions → code), most prominently in [GitHub Spec Kit](https://github.com/github/spec-kit). The kit covers layers 1, 3, and 4 but has no primitive for the feature-level spec layer. [ADR-0011](../adr/0011-agentic-spec-skill.md) accepts a new spec-driven skill `agentic-spec` that scaffolds `doc/specs/NNNN-<slug>.md`, adapts Spec Kit's mandatory sections to the kit's documentation discipline, expands `WORKFLOW.md` §1 with the four-layer stack framing, and adds a `Spec ref` field to the task template so tasks and specs are explicitly linked. F1–F8 reconciliations recorded in the ADR.

## Acceptance Criteria

- [x] [`doc/adr/0011-agentic-spec-skill.md`](../adr/0011-agentic-spec-skill.md) exists, status `accepted`, with the Spec Kit alignment, the four-layer stack rationale, and F1–F8 reconciliations.
- [x] [`src/skills/claude-code/agentic-spec/SKILL.md`](../../src/skills/claude-code/agentic-spec/SKILL.md) exists with frontmatter `name: agentic-spec`, `allowed-tools: Read, Write, Glob, Bash`, and a description carrying "spec", "PRD", "feature spec", "user scenarios", "acceptance criteria" trigger keywords.
- [x] [`src/skills/codex/agentic-spec/SKILL.md`](../../src/skills/codex/agentic-spec/SKILL.md) exists with the matching content shaped to the Codex `<background_information>` / `<instructions>` / `<output_contract>` template, plus an `agents/openai.yaml`.
- [x] `agentic-spec` is in `REQUIRED_SKILLS` in [`src/commands/init.js`](../../src/commands/init.js); [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS` carries an entry; the post-install slashLine summary lists `/agentic-spec`.
- [x] [`templates/task.md`](../../templates/task.md) gains a `**Spec ref:**` field above `**Board ref:**`, both optional. [`src/skills/{claude-code,codex}/agentic-task/SKILL.md`](../../src/skills/claude-code/agentic-task/SKILL.md) interview list adds `Spec ref` as an optional question (default blank for solo work).
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §1 articulates the four-layer artifact stack (Constitution → Spec → Plan/Decisions → Code) alongside the existing three-context-type framing.
- [x] [`README.md`](../../README.md) skill table lists `agentic-spec`; workflows-by-scenario section adds "Specifying a feature" alongside the existing entries.
- [x] Tests cover: `agentic-spec` is in `UNIVERSAL_SKILLS` in [`test/init.test.js`](../../test/init.test.js); end-to-end install lands the skill at both agent paths; `SKILL_DESCRIPTIONS` covers the new skill (already enforced).
- [x] Dogfood install in this repo refreshed via `node bin/agentic.js update --yes`; new skill lands at `.claude/skills/agentic-spec/` and `.agents/skills/agentic-spec/`; state files updated; AGENTS.md managed-skills section regenerates.
- [x] [`package.json`](../../package.json) bumped to `0.5.0-beta.1` (skill set expansion + WORKFLOW.md framing change = minor bump).
- [x] `npm test` passes.

## Plan

- [x] Branch `feat/0012-agentic-spec` cut from `cli`.
- [x] Write [`doc/adr/0011-agentic-spec-skill.md`](../adr/0011-agentic-spec-skill.md) in status `accepted`.
- [x] Write this task file.
- [x] Implement [`src/skills/claude-code/agentic-spec/SKILL.md`](../../src/skills/claude-code/agentic-spec/SKILL.md).
- [x] Implement [`src/skills/codex/agentic-spec/{SKILL.md,agents/openai.yaml}`](../../src/skills/codex/agentic-spec/).
- [x] Update [`templates/task.md`](../../templates/task.md) with `**Spec ref:**` field; update agentic-task skill bodies to interview for it.
- [x] Update [`WORKFLOW.md`](../../WORKFLOW.md) §1 with four-layer stack framing.
- [x] Wire `agentic-spec` into [`src/commands/init.js`](../../src/commands/init.js) `REQUIRED_SKILLS` + slashLine; add description in [`src/lib/rootdoc.js`](../../src/lib/rootdoc.js) `SKILL_DESCRIPTIONS`.
- [x] Update [`README.md`](../../README.md) skill table + workflows-by-scenario.
- [x] Update tests: `UNIVERSAL_SKILLS` constant.
- [x] Run `node bin/agentic.js update --yes` to refresh dogfood install.
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. Fix anything that drifted.
- [x] Atomic commits + PR + merge to `cli`; tag `v0.5.0-beta.1`; `npm publish --tag beta`; smoke verify.
- [x] Phase 2: holistic review of the kit (WORKFLOW alignment, redundancies, simplicity, daily-use flow).

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user (F1–F8):

- F1: Skill name `agentic-spec` (not `agentic-prd`); Spec Kit naming has industry traction. Description triggers include "PRD" so verbal calls land the right skill.
- F2: Universal install. Lazy-load means zero cost when not invoked.
- F3: Output path `doc/specs/NNNN-<slug>.md`. Plural directory matches `doc/adr/` and `doc/tasks/`.
- F4: Template adapts Spec Kit's mandatory sections (User Scenarios, Requirements, Success Criteria, Assumptions / Edge Cases / Out of Scope / Open Questions).
- F5: Task template gains `Spec ref` field above the existing `Board ref`; both optional. Doesn't replace `Board ref` (would break v0.4 tasks using it).
- F6: WORKFLOW.md §1 expansion to articulate four-layer stack.
- F7: Status lifecycle `draft | accepted | shipped | superseded by SPEC-NNNN`.
- F8: Codex parity asymmetric, same posture as ADR-0007 / ADR-0010.

User also asked for **Phase 2** after release: a holistic review of the kit through the lens of "is this aligned with WORKFLOW principles? are there redundancies? is the daily-use flow simple, intuitive, coherent? does it support real agentic dev (not vibe coding)?" That review runs after this task closes — likely surfaces refactor candidates that become Task 0013+.

### 2026-05-09 — close-out

Shipped in v0.5.0-beta.1; close-out flipped retroactively in the v0.5.1 discipline-cleanup release after the Phase 2 holistic coherence review surfaced Task 0011/0012 stale status. The Phase 2 review handoff lives at `.agentic/reviews/2026-05-09T21-39-48Z-v0.5-coherence-review.md` and produced the multi-release roadmap: v0.5.1 (cleanup) → v0.6.0 (coherence improvements) → v0.7.0 (agentic-hooks closing WORKFLOW §11) → v0.8.0 (project maturity profiles) → v0.9.0 (structured UX adoption). Task 0010 follow-ups still tracked.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
