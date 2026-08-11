# Task `0045`: Automate AGENTS and GUIDELINES reciprocity

**Status:** proposed
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

When a project has both `AGENTS.md` and `GUIDELINES.md`, repeating detailed
rules in both creates two competing sources of truth. The PRD's Next tier
defines the intended boundary: `AGENTS.md` stays operational and points to
`GUIDELINES.md`; `ad-drift` detects rule duplication. This task turns that
product commitment into observable installer and audit behavior.

## Acceptance Criteria

- [ ] `ad-bootstrap` writes an operational pointer to `GUIDELINES.md` instead of duplicating detailed rules when that file exists.
- [ ] `ad-drift` identifies duplicated detailed rules while accepting a load-bearing pointer as the intended relationship.
- [ ] The behavior is delivered for both hosts, dogfooded, and covered by deterministic tests.
- [ ] The local test gate and a fresh-context review pass before the task closes.

## Plan

- [ ] Ground the current `ad-bootstrap`, `ad-guidelines`, and `ad-drift` behavior against the binding documentation discipline.
- [ ] Add focused tests for pointer generation and duplication detection before changing skill sources or scripts.
- [ ] Implement the smallest dual-host change, refresh dogfood, and update only the canonical documentation that defines the relationship.
- [ ] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Next-tier roadmap. No feature specification
exists yet; create one first if grounding reveals a feature boundary broader
than the stated pointer-and-drift behavior.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
