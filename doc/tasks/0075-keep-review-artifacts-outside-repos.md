# Task `0075`: Keep review artifacts outside repositories

**Status:** done
**Created:** `2026-09-15`
**Scope ref:** doc/adr/0007-workflow-operational-skills.md
**Evidence ref:** doc/research/0018-ground-reviewer-repository-cleanliness.md
**Owner:** `Alexandre Alvaro`
**Execution:** `AFK`
**Spec ref:**
**Board ref:** https://github.com/alexandremendoncaalvaro/agentic-development/pull/126

## Context

The Claude Code fresh-context reviewer can run shell commands even though its
role is read-only. A verification probe created inside a consumer repository
can therefore survive the review and be swept into a later product commit.
The stale PR that first addressed this behavior conflicts with the current
reviewer contract and no longer meets repository publication standards. The
current implementation needs the same safety invariant rebuilt against `main`
and verified for both hosts.

## Acceptance Criteria

- [x] Both fresh-context reviewer definitions require temporary verification artifacts to stay under the operating-system temporary directory and require repository status to remain unchanged.
- [x] The Claude Code reviewer explicitly removes temporary artifacts after use and never modifies tracked repository files.
- [x] A public-contract test fails when either host loses the repository-cleanliness invariant.
- [x] Canonical host sources, installed reviewer definitions, and package contents remain synchronized.
- [x] The stale PR is superseded only after the clean successor is merged.

## Plan

- [x] Ground the reviewer-cleanliness invariant against host documentation, public reviewer patterns, current source, and PR history.
- [x] Add one failing public-contract test for both host reviewer definitions and confirm the expected RED result.
- [x] Add the minimum host-specific instruction text, refresh dogfood, and confirm GREEN.
- [x] Update the changelog, run focused and full gates, then complete `ad-review` and `ad-audit`.
- [x] Commit, open and merge a clean successor PR, then close PR #126 with an exact approved explanation.

## Notes

### 2026-09-15

The stale PR remains open while its still-valid safety behavior is rebuilt. Its
conflicts, obsolete publication text, and prohibited `Co-Authored-By` trailer
will not be copied into the successor.

GROUND-0018 selected the minimum host-specific contract: temporary artifacts
stay under the operating-system temporary directory; Claude removes them and
never edits tracked files; both hosts leave repository status unchanged. The
existing Bash capability remains because ADR-0007 binds it, while worktree
isolation remains a separate, reversible future decision if the prompt-level
postcondition proves insufficient.

TDD RED: the new cross-host public-contract test failed because neither
reviewer definition named the operating-system temporary directory or required
an unchanged repository status. TDD GREEN: after the minimum prompt changes,
the focused test passed (1/1). The project dogfood refresh left canonical and
installed reviewer files byte-identical, the full suite passed (937/937), and
`npm pack --dry-run --json` succeeded with 339 package entries.

The final two-axis `ad-review` found no Standards or Spec issues. `ad-audit`
first tightened the changelog from an execution guarantee to a verifiable
contract claim and pinned the pre-change repository evidence to base tree
`ab8652222331d098e706253e18cdc1ed28c6b734`; its re-audit then accounted for
every resolved rule group and all ten changed files with no blockers or open
questions. Final gates remained green: focused 1/1, full suite 937/937,
ground validator valid with A1/B2/C2/D1, package dry-run 339 entries, and both
canonical/install comparisons byte-identical.

PR #134 merged the clean successor into `main` as
`9b98d51b6afc790a05acd5ea4f5226fab95d9be5` after all four required CI jobs
passed. Only then was PR #126 closed with the owner's exact approved
explanation. The implementation, verification, dogfood, merge, and stale-PR
cleanup are complete.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
