# Task `0046`: Scaffold community contribution and security docs

**Status:** done
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

- [x] The kit can scaffold `CONTRIBUTING.md` and `SECURITY.md` from concise, GitHub-conventional templates without overwriting maintained local policy.
- [x] The flow asks only for maintainer-owned policy gaps, including the security contact and disclosure expectations, and preserves an explicit blank or unsupported answer.
- [x] The resulting documents clearly separate contributor workflow from security reporting and contain no fabricated contact or support commitment.
- [x] The dual-host behavior, tests, dogfood refresh, local gate, and fresh-context review are complete.

## Plan

- [x] Establish the kit's policy boundary and maintainer-owned fields from the scan; the scoped task did not require a grilling session.
- [x] Ground GitHub-conventional document shapes and write a feature specification if the generator interface is broader than one task.
- [x] Add dual-host sources and tests following the selected design; preserve existing user documents by default.
- [x] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Next-tier roadmap. This is HITL because the
kit may provide structure but must not decide a maintainer's security policy.

### 2026-08-12

Implementation started with a dual-host deterministic detector. The skill will
preserve existing policy and ask the maintainer only for policy the repository
cannot establish from observable facts.

### 2026-08-12 — completion evidence

`ad-community-docs` ships with skill-local templates and a byte-identical
dual-host detector for root, `.github/`, and `docs/` locations. The detector's
expected-output tests covered normal, multi-location, and unreadable paths;
the initially red test failed because the script did not exist. `npm pack
--dry-run` included the new skill, and a scratch `init --agent both` installed
and executed the detector from both consumer paths. The full local suite passed
601 tests. A fresh-context reviewer found the scratch install assertion was
missing, it was added for both hosts, and the follow-up review confirmed the
concern resolved.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
