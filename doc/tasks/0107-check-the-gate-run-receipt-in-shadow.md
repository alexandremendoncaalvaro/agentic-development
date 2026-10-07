# Task `0107`: Check the gate-run receipt before push, in shadow

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 to 4, gate-run check)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The tracer bullet for ADR-0089: the cheapest receipt (a local gate run keyed
to the commit SHA and exit code) and the first check of the shadow gate, end to
end on both hosts. It proves the gate script, its matching, its freshness rule
and its evidence line before the other checks reuse them.

## Acceptance Criteria

- [ ] A gate-run wrapper runs the repository's CI-mirror command and records the commit SHA, the command, the exit code and the time under `.agentic/receipts/`; in this repository the pre-push runner writes it, and `ad-pr`'s preflight writes it for consumers.
- [ ] `sequence-gate.mjs`, byte-identical in both `ad-hooks` trees, runs on `PreToolUse` for Bash and, before `git push` or `gh pr create`, appends a "would block" line to the ADR-0083 evidence file when no fresh gate-run receipt with exit 0 exists for `HEAD`; it always exits 0 and emits no decision object.
- [ ] Freshness follows ADR-0089 decision 3: `HEAD`, or only receipt-neutral paths changed since the receipt (`.agentic/gates.json`, default `doc/tasks/**`).
- [ ] `AD_SEQUENCE_GATE=0` silences it; malformed input exits 0 silently.
- [ ] Contract tests by mock stdin cover a fresh receipt, a missing one, a stale one, a receipt-neutral change, a failing exit code, an unrelated command, and both hosts' event shapes; this repository wires the hook for dogfood.

## Plan

- [ ] `/ad-ground` the `PreToolUse` input shapes on both hosts and the evidence line format; record the GROUND study.
- [ ] Red, then green, one behavior at a time (`/ad-tdd`).
- [ ] `ad-hooks` text and wiring; ARCHITECTURE and CONTEXT terms; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — plan approved

The owner accepted ADR-0089 and approved this plan.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
