# Task `0049`: Define and close 1.0 release readiness

**Status:** done
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

- [x] An ADR records objective 1.0 entrance criteria, including the relationship between product completeness, audit evidence, and external adoption or deliberate non-requirement.
- [x] Each accepted technical gate is implemented and runs locally and in CI, or the ADR records why it is deliberately excluded.
- [x] The PRD, release contract, and repository protection rules describe the same release path without referring to a discontinued `cli` development branch.
- [x] A release-readiness review verifies the criteria against the current repository before any 1.0 publication is proposed.

## Plan

- [x] Use `/ad-grill-me` and `/ad-ground` to turn the PRD's open 1.0 question into decision-ready options.
- [x] Record the selected entrance criteria in an ADR before wiring gates or changing release policy.
- [x] Implement and verify the chosen gates in small, reviewable tasks; do not fold unrelated quality tooling into one change.
- [x] Run the release-readiness review and update the task according to observed evidence.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Later-tier roadmap after branch
consolidation. The task does not set a 1.0 date or criterion; those remain an
owner decision captured through the ADR.

### 2026-09-15

The owner selected stable 1.0 as the next release and deliberately declined a
numeric external-adoption threshold. Grounding in `doc/research/0019-ground-one-point-zero-readiness.md`
found that Node 20 is already end-of-life, the existing major bump still targets
`1.0.0-beta.1`, GitHub secret scanning and push protection are enabled, and the
current dependency audit is clean. ADR-0078 records the resulting compatibility,
quality-gate, security, and final-audit boundary before implementation begins.

The local implementation gate is green: ESLint, Prettier, 939 behavioral tests,
and the high-severity dependency audit pass through `npm run verify`; the ground
record, drift scan, package dry run, and stable-version dry run also pass. A
two-axis review found and resolved two documentation inconsistencies before
commit: a duplicated changelog category and an inaccurate claim that local
pre-push emulates the remote operating-system matrix. Remote CI and the matching
required-check ruleset remain the final closure evidence.

GitHub Actions run 35006930176 passed all four required legs on PR #136:
Ubuntu and Windows at Node 22.13.0 and Node 24. The active `protect-main`
ruleset was read back with those exact four contexts while retaining its
deletion, non-fast-forward, and pull-request protections. This closes the final
remote and repository-protection evidence; the 1.0 publication itself remains a
separate digest-bound `/ad-release` operation.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
