# Task `0069`: Structural trigger assertions for model-invocable skills

**Status:** proposed
**Created:** 2026-09-09
**Scope ref:** test/skills.test.js
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Anthropic's authoring guidance and the superpowers project both recommend testing that a skill actually triggers before shipping it. The kit has no trigger test of any kind. A live activation eval (running representative prompts with and without the skill and measuring activation) needs real sessions and has a cost; this task ships the structural half now and records the live half as a follow-up in Notes.

## Acceptance Criteria

- [ ] Every model-invocable skill's `description` (per ADR-0073) contains at least three quoted trigger phrases.
- [ ] Every model-invocable `description` opens with the use case in its first sentence (the first sentence names what the skill does or when to use it, not a section reference).
- [ ] `test/skills.test.js` enforces both criteria on both hosts and names the offending skill.
- [ ] `CHANGELOG.md` updated.

## Plan

- [ ] Ground (official docs, in-repo): the description guidance from platform.claude.com best practices and the skill-creator guide; the existing description tests as the house pattern.
- [ ] Red: the two assertions.
- [ ] Green: adjust any description that fails, keeping the 350-character cap of task-0065.
- [ ] Full suite; `CHANGELOG.md`; `/ad-review`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`), finding 15. Deferred and not filed as a task yet: a live activation eval (N fresh sessions per skill, prompt with and without the skill loaded, activation rate reported). File it once this structural pass lands and the owner wants the measurement.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
