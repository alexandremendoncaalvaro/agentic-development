# Task `0123`: Grade evidence from a starting tier

**Status:** proposed
**Created:** 2026-10-15
**Scope ref:** doc/adr/0070-persist-grounded-decision-evidence.md (amended by a new ADR)
**Evidence ref:** GRADE handbook §5; doc/research records
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Of 164 graded claims in doc/research, 139 are High and none Low; no conclusion is Insufficient; the quick mode of `ad-ground` contradicts a validator that demands a grade on every claim; `ad-research` announces an Assess step it does not have.

## Acceptance Criteria

- [ ] WORKFLOW §17 names tiers with a starting grade (Measurement High, Primary Medium, Secondary and Single Low, Opinion Very-low), the GRADE downgrade factors, a stated reason for any upgrade, and "design choice" for normative claims.
- [ ] The ground template carries `Stakes`; each claim names its tier.
- [ ] The validator (both hosts), for a record with `Stakes`: requires a tier, rejects a grade above the tier's start without an `Upgrade:` line, accepts "design choice", and makes grades optional for low and reversible stakes; a record without `Stakes` keeps today's rules with a warning (tests through the CLI).
- [ ] `ad-research` gains an Assess step; `ad-ground` quick mode writes the short record.
- [ ] A new ADR amends ADR-0070 and ADR-0060; existing records are not re-graded.

## Plan

- [ ] Tests first through the validator CLI; then text, template and ADR; one PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. A short record lists sources and claims without grades.
