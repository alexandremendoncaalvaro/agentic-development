# Task `0049`: Define and close 1.0 release readiness

**Status:** proposed
**Created:** 2026-08-11
**Scope ref:** doc/product/PRD.md — Later tier: 1.0 release readiness
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

`main` is already the single development branch and the current npm release is
still pre-1.0. The PRD names the remaining release-quality gaps — lint and
format wiring, secret scanning, dependency audit, clean own-dogfood audits —
but intentionally leaves the actual 1.0 entrance criterion open. Without one
accepted decision and a tracked closure plan, a 1.0 release would be an
impression rather than a repeatable quality threshold.

## Acceptance Criteria

- [ ] An ADR records objective 1.0 entrance criteria, including the relationship between product completeness, audit evidence, and external adoption or deliberate non-requirement.
- [ ] Each accepted technical gate is implemented and runs locally and in CI, or the ADR records why it is deliberately excluded.
- [ ] The PRD, release contract, and repository protection rules describe the same release path without referring to a discontinued `cli` development branch.
- [ ] A release-readiness review verifies the criteria against the current repository before any 1.0 publication is proposed.

## Plan

- [ ] Use `/ad-grill-me` and `/ad-ground` to turn the PRD's open 1.0 question into decision-ready options.
- [ ] Record the selected entrance criteria in an ADR before wiring gates or changing release policy.
- [ ] Implement and verify the chosen gates in small, reviewable tasks; do not fold unrelated quality tooling into one change.
- [ ] Run the release-readiness review and update the task according to observed evidence.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Later-tier roadmap after branch
consolidation. The task does not set a 1.0 date or criterion; those remain an
owner decision captured through the ADR.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
