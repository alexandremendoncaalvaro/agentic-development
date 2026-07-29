# Task `0012`: Checkbox honesty rule in `ad-task`

**Status:** in-progress
**Created:** 2026-07-29
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A fresh-context reviewer observed that task files inherit a convention of checking Plan items that bundle steps (e.g. "PR; merge on CI green") before every step has happened — a record that overstates completion, at odds with the evidence discipline in ADR-0042. The fix is one rule in the `ad-task` skill, both hosts: a checkbox is checked only after everything it names has actually happened; bundled steps split when their parts complete at different moments.

## Acceptance Criteria

- [x] Both host `ad-task` files carry the checkbox-honesty rule next to the existing status-flip rule.
- [x] Dogfood regenerated; `npm test` green.

## Plan

- [x] Edit both host SKILL.md files.
- [x] `node bin/agentic.js update --yes --force`; `npm test`; fresh-context review.
- [ ] PR opened.
- [ ] Merged on CI green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-29

Applied per the reviewer's observation and the owner's direction to stop treating ground-resolved fixes as open decisions. The Plan section above practices the rule it lands: PR/merge items unchecked until they happen.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
