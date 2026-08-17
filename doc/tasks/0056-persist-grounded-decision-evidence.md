# Task `0056`: Persist grounded decision evidence

**Status:** done
**Created:** 2026-08-12
**Scope ref:** doc/adr/0059-grade-of-evidence-primitive.md
**Evidence ref:** doc/research/0002-ground-durable-evidence.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`ad-ground` already gathers and grades evidence, but its citations disappear
with the chat that carried them. A grounded decision must remain auditable by a
later owner or reviewer without trusting the agent's recollection. Record the
claim-to-source map in the existing evidence layer, validate its shape
deterministically, and link it from the work it supports.

## Acceptance Criteria

- [x] `WORKFLOW.md` and `ad-philosophy` state that chat-only citations do not
      ground a material repository decision.
- [x] Both `ad-ground` hosts write a `doc/research/NNNN-ground-<slug>.md`
      receipt, require a valid source map before implementation, and distinguish
      source-map validation from source-content review.
- [x] The receipt has a dual-host, byte-identical deterministic validator with
      expected-output tests for valid, invalid, and unreadable input.
- [x] Tasks can link a ground receipt through `Evidence ref`; `ad-research`
      remains the standalone record for an open question.
- [x] A scratch consumer install materializes and runs the validator on both
      hosts; full tests and review pass.

## Plan

- [x] Ground the persistence design across provenance guidance, a practical
      agent-decision implementation, in-repo evidence contracts, and history.
- [x] Add the accepted ADR, the durable ground record, and the new task.
- [x] Write expected-output tests before the validator, then implement it in
      both host skill trees.
- [x] Update dual-host skill contracts, templates, workflow guidance, and the
      dogfood installation.
- [x] Verify package contents, a scratch both-host install, full tests, and a
      fresh-context review; then close the task.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-12

The owner explicitly required auditable evidence for autonomous decisions. The
implementation direction is grounded in
`doc/research/0002-ground-durable-evidence.md`: repository-local evidence
records plus structural validation, not a new decision-log product or a
chat-only citation convention.

### 2026-08-12 — completed

Validated `npm pack --dry-run` includes both host templates and validators.
A scratch `init --agent both -y` ran the installed validators on both hosts
with `valid: true` and an empty `unreadable` list. The CI-exact local suite
passed 615 tests. The final two-axis review found no remaining Standards or
Spec issues; its ignored audit trail is
`.agentic/reviews/2026-08-12T001500Z-working-tree-durable-ground-evidence-final.md`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
