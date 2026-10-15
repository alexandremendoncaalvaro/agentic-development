# ADR-0095: Grade evidence from a starting tier

**Status:** accepted
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0070 — decision 1's single shape for every receipt (a record that names low and reversible stakes may leave claims ungraded) and decision 4's checks (the validator applies tier rules to a record with stakes); every other decision binds unchanged.
**Amends:** ADR-0060 — decision 1's phases gain Assess as a step of its own, and Appraise grades from a starting tier; every other decision binds unchanged.

## Context

The evidence records under `doc/research/` held 139 High and 25 Medium grades and no Low or Very-low, and no conclusion was ever Insufficient. WORKFLOW §17 ranked evidence in five tiers but gave no starting grade per tier, counted agreement twice (as the Consensus tier and as a modifier), and lacked three of GRADE's downgrade factors. The validator demanded a grade on every claim even for a small reversible change, so the quick mode of `ad-ground` could not exist on disk. `ad-research` named an Assess phase it never ran. Renaming the claim identifiers away from `E<n>` would collide with source identifiers such as `C1` and break 82 references, so the tiers are renamed instead.

## Decision

1. WORKFLOW §17 names five tiers with a starting grade, after GRADE: Measurement (High), Primary (Medium), Secondary (Low), Single (Low), Opinion (Very-low). Five factors lower a claim: risk of bias, inconsistency, indirectness (recency placed here by the kit), imprecision and search bias. A grade above the tier's start needs a stated reason. A normative claim is a design choice and carries no grade.
2. A ground record names its stakes (`**Stakes:** <low | medium | high> × <reversible | irreversible>`). With stakes, each claim names its tier, a grade above the start needs an `**Upgrade:**` line, and "design choice" is a valid strength. A low and reversible record is the short record: sources and claims with provenance, grades optional; a grade, once given, needs its tier.
3. A record without stakes keeps the earlier rules and receives a warning; existing records are not re-graded.
4. `ad-research` gains Step 8, Assess: when the decision a study grounded is revisited, its `## Assessment` section records what the study got right or wrong.

## Consequences

Positive:

- Grades discriminate: a Primary-tier claim reads Medium unless a reason raises it.
- Small reversible decisions get a record that matches their stakes.
- The Evidence-Based loop is closed by a written assessment.

Negative:

- Writers must choose a tier per claim.
- The rules apply only to records that name their stakes; a writer who omits the line gets the old rules and a warning, not an error.

## Alternatives Considered

- **Rename claim identifiers to `C<n>`.** Rejected: `C1` is already a source identifier, and 82 references cite `GROUND-NNNN E<n>`.
- **Re-grade existing records.** Rejected: decision records stay as written; the new rules apply forward.
