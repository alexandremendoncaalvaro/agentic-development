# Task `0076`: Resolve configurable project evidence sources

**Status:** done
**Created:** 2026-09-15
**Scope ref:** doc/specs/0006-configurable-project-evidence-sources.md
**Evidence ref:** doc/research/0020-ground-project-evidence-sources.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0006-configurable-project-evidence-sources.md
**Board ref:**

## Context

State-reading skills currently infer project status only from repository-local
artifacts. That is incomplete for projects whose active plan lives in GitHub
issues and pull requests, and it causes otherwise accurate recommendations to
miss the work the engineer actually needs to advance. The kit needs one generic,
shared, auditable source resolver before stable 1.0 publication.

## Acceptance Criteria

- [x] Repository-only projects retain their existing zero-configuration state-reader behavior and execute no GitHub command.
- [x] A closed, versioned configuration resolves matching machine and project layers with deterministic precedence and only allowlisted repository and GitHub providers.
- [x] GitHub issues and pull requests are gathered through fixed shell-free commands using existing authentication, bounded queries, provenance, freshness, and per-source failure reporting.
- [x] `ad-next`, `ad-roadmap`, and standalone `ad-brief` compose one shared project-evidence capability without duplicating provider logic or changing their specialist responsibilities.
- [x] Private project mapping is installed outside the public repository, and representative dogfood proves GitHub-primary state changes the recommendation without leaking private data.
- [x] Both host sources, project dogfood copies, user-level installations, package contents, documentation, and tests are synchronized and green.

## Plan

- [x] De-risk the source, authentication, precedence, privacy, and composition decisions; persist the four-source ground record.
- [x] Record and accept the shared capability architecture, then update the feature spec and task evidence links.
- [x] Add one failing public-interface test for repository-only fallback, then implement the minimum shared capability to make it pass.
- [x] Add one failing behavior at a time for configuration precedence, validation, GitHub collection, and partial failure; keep both hosts byte-identical.
- [x] Route `ad-next`, `ad-roadmap`, and `ad-brief` through the shared fact packet and add static composition tests.
- [x] Refresh project dogfood, install the machine-local mapping and user-level skills, then verify a private GitHub-primary repository without retaining its output.
- [x] Run focused and complete gates, package dry-run, drift, fresh-context review, and maximum audit; resolve every verified finding.
- [x] Commit atomically, open the feature pull request, and merge only after all required checks pass.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-15

Pre-construction risk register, ordered by impact times uncertainty:

1. Capability ownership: extending `ad-next` alone would duplicate provider and
   configuration behavior when roadmap and briefing need the same facts. Retire
   through four-source grounding and the deletion test.
2. Configuration scope: project-only state would not follow the same repository
   across worktrees, while machine-only state would prevent a team-owned override.
   Retire by grounding the repository's existing layered-store pattern.
3. GitHub execution: inherited host settings, account wrappers, query text, and
   partial command failures could make a convenient integration unsafe or
   unreliable. Retire through official CLI contracts, the existing shell-free
   preflight seam, fake-executable tests, and real read-only probes.
4. Privacy and boundedness: fetching full issue or pull-request bodies would load
   excessive private context and weaken source-role separation. Retire by limiting
   the shared packet to list metadata and leaving selected-item depth to callers.
5. Real-project fit: a local-only survey may not represent the active work in a
   GitHub-primary project. A read-only measurement confirmed that the target
   project has no local PRD/spec/task stack while authenticated issue and
   pull-request list probes succeed. Retire with private dogfood after the public
   implementation is green.

GROUND-0020 validated the source architecture with two official GitHub CLI
contracts, one public adapter reference, six in-repository patterns and
measurements, and two relevant history points. All critical unknowns are now
Strong or Conditional with a named mitigation: exact-remote matching is mitigated
by project override; list-only metadata is mitigated by a targeted selected-item
read; external failure is mitigated by the permanent repository baseline. The
residual technical risk is below the cost of continuing with a local-only state
reader, so implementation may begin under ADR-0079.

The implementation completed ten red-green public-interface cases covering the
repository-only default, exact machine matching, duplicate-match rejection,
project precedence, closed-schema failures, invalid JSON privacy, shell-free
bounded GitHub arguments, query-level partial failure, and source-level
isolation. The focused suite passed 10/10. The full local gate passed ESLint,
Prettier, 961/961 tests, and the high-severity dependency audit; `git diff
--check`, the ground-record validator, the drift scan, and the npm package
dry-run also passed.

Project dogfood and both user-level host installs are byte-identical to their
canonical sources. A sanitized installed-skill run in the configured private
repository selected the machine layer, retained the repository as supporting
evidence, read the GitHub primary source without failure, and changed
`ad-next` from missing-local-plan advice to configured implementation in
progress. No private repository coordinate, query, title, body, or remote was
retained in repository artifacts or review trails. Final `ad-review` reported
zero Standards and Spec findings; the maximum `ad-audit` was complete with
zero violations or judgement calls. The remaining work is deliberately external:
commit, exact PR publication approval, required remote CI, and merge.

PR [#137](https://github.com/alexandremendoncaalvaro/agentic-development/pull/137)
published the exact approved English draft. Its required Ubuntu and Windows
matrix passed on Node 22.13 and 24, with no review comments and a clean merge
state. It merged into `main` as
`e10734cc37ce504c5bed8c8e95b02b244f449884`; the feature branch was removed.
The configurable project-evidence front is complete, and stable 1.0 readiness is
now the next product front.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
