# Task `0123`: Grade evidence from a starting tier

**Status:** in-progress
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

- [x] WORKFLOW §17 names tiers with a starting grade (Measurement High, Primary Medium, Secondary and Single Low, Opinion Very-low), the GRADE downgrade factors, a stated reason for any upgrade, and "design choice" for normative claims.
- [x] The ground template carries `Stakes`; each claim names its tier.
- [x] The validator (both hosts), for a record with `Stakes`: requires a tier, rejects a grade above the tier's start without an `Upgrade:` line, accepts "design choice", and makes grades optional for low and reversible stakes; a record without `Stakes` keeps today's rules with a warning (tests through the CLI).
- [x] `ad-research` gains an Assess step; `ad-ground` quick mode writes the short record.
- [x] A new ADR amends ADR-0070 and ADR-0060; existing records are not re-graded.

## Plan

- [x] Tests first through the validator CLI; then text, template and ADR; one PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. A short record lists sources and claims without grades.

### 2026-10-15 — built

Five validator tests went red, then green: a staked claim at its tier start
passes; a grade above the start needs `Upgrade:`; a staked claim needs a
tier and accepts "design choice"; low and reversible stakes leave grades
optional and malformed stakes fail; a record without stakes stays valid with
a warning. All 31 existing ground records stay valid, each with that
warning. WORKFLOW §17 names the tiers with starting grades and the five
downgrade factors; the template, `ad-ground` (both hosts) and `ad-research`
(Step 8, Assess, and an Assessment section) follow. RESEARCH-0030's derived
decision now names ADR-0085 and ADR-0093. The new WORKFLOW.md hash joins the
legacy-migration list.
