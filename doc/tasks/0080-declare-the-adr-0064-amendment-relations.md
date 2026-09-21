# Task `0080`: Declare the ADR-0064 amendment relations

**Status:** proposed
**Created:** 2026-09-21
**Scope ref:** doc/adr/0064-install-all-skills-with-contextual-guidance.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`doc/adr/PROJECTION.md` attributes seven partial retirements to ADR-0064 —
0020, 0021, 0036, 0053, 0054, 0060, and 0061 all lose their profile-based
installation scope to it. None of the seven carries an `Amended by:` header,
and ADR-0064 declares no `Amends:` at all, so the projection's own reliable
check cannot see the relation. Every other cross-record amendment in the
directory is declared on both sides and pairs cleanly; this group is the sole
exception.

Task 0079 verified the gap while correcting three stale statements on the same
page, and kept it out of that change because it is a different claim. Correcting
a sentence that describes the present is cheap and needs no re-reading of the
records; asserting that ADR-0064 amends seven named decisions requires opening
each one and confirming that what the projection says was retired is what the
record actually decided. An over-attributed row would be copied into a header
field and become harder to dislodge.

## Acceptance Criteria

- [ ] Each of the seven records is read against its projection row, and the row is confirmed, narrowed, or corrected before any header field is written.
- [ ] Every confirmed relation is declared on both sides: `Amends:` on ADR-0064 naming the record and the retired part, `Amended by:` on the record naming ADR-0064.
- [ ] The projection's "Verifying this page" section drops the ADR-0064 exception once no exception remains, so the header-pair check describes the whole directory.
- [ ] Any row that verification does not confirm is corrected in the table with its reason, rather than declared.

## Plan

- [ ] Read the seven records and their rows; record per-record verification in the Notes before editing.
- [ ] Land the header fields and the projection edit in one commit, per the projection's same-commit rule.
- [ ] Run the full local gate and a fresh-context review before opening a pull request.

## Notes

### 2026-09-21 — Opened from Task 0079

The gap is documentation-only: no consumer behavior depends on it. Its cost is
that a reader following the projection's documented check concludes the
directory is fully paired when seven relations are invisible to it. Until this
task lands, the projection names the exception explicitly, so the check is at
least honest about its own coverage.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
