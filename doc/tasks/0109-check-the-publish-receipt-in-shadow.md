# Task `0109`: Check the publish receipt before outward posts, in shadow

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 and 2, publish check)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Outward text must be the text the owner approved. `ad-publish` shows an
exact-text approval receipt in chat and says any change invalidates it, but
persists nothing, so no tool can check that a posted comment was approved or
unchanged.

## Acceptance Criteria

- [ ] On the owner's approval, `ad-publish` records the destination, the SHA-256 of the normalized approved body and the approval time under `.agentic/receipts/`, on both hosts.
- [ ] `sequence-gate.mjs` logs "would block" before `gh pr comment`, `gh issue comment`, a comments API call and a chat send tool when no receipt matches the outgoing body's hash; it reads the body from `--body`, `--body-file` and the tool input.
- [ ] Normalization is stated and tested (line endings, trailing whitespace), so a reformatted but identical body matches and any other change does not.
- [ ] Tests cover a matching body, an edited body, no receipt, each body source, and an unrelated command.

## Plan

- [ ] `/ad-ground` how each outward command carries its body; red, then green (`/ad-tdd`).
- [ ] `ad-publish` text; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
