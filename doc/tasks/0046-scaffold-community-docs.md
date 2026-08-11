# Task `0046`: Scaffold community contribution and security docs

**Status:** proposed
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The kit scaffolds engineering-operational documentation but does not yet help
an open-source maintainer create the public collaboration and vulnerability
reporting documents contributors expect. The accepted PRD places
`CONTRIBUTING.md` and `SECURITY.md` scaffolds in the Next tier. Security
contact, disclosure expectations, and support scope are maintainer policy, so
the generator must expose those genuine choices rather than invent them.

## Acceptance Criteria

- [ ] The kit can scaffold `CONTRIBUTING.md` and `SECURITY.md` from concise, GitHub-conventional templates without overwriting maintained local policy.
- [ ] The flow asks only for maintainer-owned policy gaps, including the security contact and disclosure expectations, and preserves an explicit blank or unsupported answer.
- [ ] The resulting documents clearly separate contributor workflow from security reporting and contain no fabricated contact or support commitment.
- [ ] The dual-host behavior, tests, dogfood refresh, local gate, and fresh-context review are complete.

## Plan

- [ ] Use `/ad-grill-me` to establish the kit's policy boundary and the maintainer-owned fields.
- [ ] Ground GitHub-conventional document shapes and write a feature specification if the generator interface is broader than one task.
- [ ] Add dual-host sources and tests following the selected design; preserve existing user documents by default.
- [ ] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Next-tier roadmap. This is HITL because the
kit may provide structure but must not decide a maintainer's security policy.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
