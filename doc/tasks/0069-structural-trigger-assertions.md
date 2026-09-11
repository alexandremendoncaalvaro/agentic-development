# Task `0069`: Resolve structural trigger assertions for model-invocable skills

**Status:** done
**Created:** 2026-09-09
**Scope ref:** test/skills.test.js
**Evidence ref:** doc/research/0015-ground-skill-authoring-hygiene.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The original proposal assumed that three quoted phrases and a fixed first sentence
could stand in for testing whether a skill actually activates. Grounding showed
that the host contracts require descriptions to say what a skill does and when it
applies, while real activation confidence requires representative sessions. This
task resolves that proposal without adding a punctuation proxy; Task 0048 owns the
behavioral evaluation harness.

## Acceptance Criteria

- [x] Official host guidance and public reference implementations were checked against the proposed structural assertions.
- [x] No quoted-phrase count or fixed-sentence regex was added as a proxy for model activation.
- [x] Existing host-contract checks continue to enforce non-empty descriptions, capability and use context, invocation class, per-description caps, and the total listing budget.
- [x] Representative activation and trajectory measurement remains assigned to Task 0048 rather than being claimed by a static syntax test.
- [x] No changelog entry was added because this resolution changes no shipped behavior.

## Plan

- [x] Ground host guidance, public references, existing description tests, and repository history.
- [x] Compare the proposed syntax checks with the observable behavior they claimed to protect.
- [x] Reject the syntax proxy and retain the existing metadata contracts.
- [x] Route behavioral activation coverage to Task 0048.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`), finding 15. Deferred and not filed as a task yet: a live activation eval (N fresh sessions per skill, prompt with and without the skill loaded, activation rate reported). File it once this structural pass lands and the owner wants the measurement.

### 2026-09-11

Ground record `doc/research/0015-ground-skill-authoring-hygiene.md` found no host
contract for quoted trigger phrases or a fixed count. Anthropic and OpenAI require
descriptions to state capability and use context; representative evaluations, not
punctuation, establish activation behavior. The proposed structural assertions
were therefore rejected. Task 0048 already tracks the live fixture-based harness,
so no duplicate follow-up task was created.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
