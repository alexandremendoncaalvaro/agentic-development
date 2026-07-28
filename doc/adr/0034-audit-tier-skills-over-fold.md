# ADR-0034: Two new audit-tier skills over folding into ad-review

**Status:** proposed
**Date:** 2026-07-27
**Deciders:** Alexandre Alvaro

## Context

The kit ships `ad-review` — a light, two-axis (Standards + Spec) fresh-context review of a **diff**, run pre-merge (ADR-0007). Two adjacent capabilities are wanted that `ad-review` does not cover:

1. A **maximum-gate, rules-anchored adversarial audit**: given a curated rule-set, walk *every* rule as a checklist emitting an explicit verdict (pass / violation / judgement-call / n-a — none skipped, so coverage is auditable), fan out one isolated fresh-context reviewer per rule-group, harden the rule-set's CRITICAL groups with a second, cross-model pass, aggregate by union (never merge, never "approve"), and gate on an evidence artifact per teammate-visible claim. This audits a *work product or state bound for the team* (before a post, PR, or handoff), not just a diff.
2. **Rule-set curation**: add / refine / merge / retire a convention through anti-overfitting gates, an effectiveness pass, and an adversarial review of each candidate, behind a hard human-approval gate (never writes unprompted).

A prior design draft recommended **folding** the two genuinely-new deltas of (1) — exhaustive per-rule coverage and a cross-model pass on CRITICAL groups — into `ad-review` as an enhancement, invoking ADR-0007 §6 (anti-category-bloat): `ad-review` already owns the fan-out / adversarial / union substrate, so a new skill adds surface for little gain.

ADR-0007 §6 is binding and must be engaged head-on: every new workflow-operational skill requires its own ADR *and* demonstrated need, precisely to resist bloat. The counter-question is therefore not "is a new skill convenient" but "is this a distinct operation, or an increment to an existing responsibility?"

## Decision

We will introduce **two new workflow-operational skills** rather than fold:

- **`ad-audit`** — the maximum-gate rules-anchored adversarial audit (capability 1 above).
- **`ad-level-up`** — rule-set curation (capability 2 above).

To free the name, the **existing documentation-drift `ad-audit` is renamed to `ad-drift`** (a more precise name for what it does — drift detection). `ad-review` **stays light and unchanged**: the exhaustive-coverage and cross-model deltas live *only* in the new `ad-audit`, so a routine pre-merge review never pays the maximum-gate cost.

The distinguishing principle, applied consistently across this program: **fold when a capability is an increment to a responsibility a skill already owns; create a new skill when it is a distinct operation.** `ad-audit` (audit a team-bound work product against a full rule-set as an exhaustive, evidence-gated checklist) is a distinct operation from `ad-review` (review a diff on two axes) — they share mechanism but differ in target, exhaustiveness, and cost tier. `ad-level-up` (a write operation on a curated rule-set, behind a human gate) has no existing home at all.

This ADR records the **strategic** decision — reject the fold, adopt two distinct skills, and rename to enable it. Per [ADR-0007](0007-workflow-operational-skills.md) §6, each new skill still lands with its **own follow-on ADR + task** carrying its concrete design (the new `ad-audit` and its rule-set location; `ad-level-up` and its curation gates), exactly as ADR-0007 established the workflow-operational category and deferred each member to its own record. Both skills are authored generic and dual-host (Claude Code + Codex); neither hardcodes any rule content. The CRITICAL cross-model pass is realized natively through the kit's dual-host split.

## Consequences

Positive:

- Clear separation of tiers: `ad-review` (light diff review) · `ad-audit` (maximum-gate rules audit) · `ad-drift` (documentation-drift detection) · `ad-level-up` (rule-set curation). Each reads as a distinct verb.
- `ad-review` stays cheap; nobody pays the exhaustive-coverage + cross-model cost on a routine review.
- The rename to `ad-drift` sharpens naming independent of the new skill — "drift" names the operation better than the generic "audit".

Negative / trade-offs:

- Two new skills grow the surface. This ADR records only the strategic reject-the-fold decision; per ADR-0007 §6 each skill still lands with its own follow-on ADR + task carrying its design, so the anti-bloat bar is engaged per-skill, not sidestepped.
- The rename touches a wide reference set (skills, profiles, narrative docs, the managed AGENTS.md table, dogfood installs). It is mechanical and verified by the suite, but it is a large diff.
- Landing the rename before the new `ad-audit` leaves a brief window on `main` with no `ad-audit` skill (only `ad-drift`). Merge sequencing keeps the window short; `ad-drift` covers the drift function throughout.

## Alternatives Considered

* **Fold the exhaustive-coverage + cross-model deltas into `ad-review`** (the draft recommendation) — rejected. It overloads one skill with a second, heavier mode and a different input (a curated rule-set vs a diff + spec) — one skill owning two distinct operations, the category-discipline concern [ADR-0007](0007-workflow-operational-skills.md) §6 exists to hold; and it makes every routine review pay the maximum-gate cost. Folding is right for an increment, not for a distinct operation.
* **Fold `ad-level-up` into an existing skill** — rejected. Rule-set curation is a write operation behind a human gate; no existing skill owns it, so any home would be forced.
* **Keep the doc-drift skill named `ad-audit`, name the new max-gate skill something else** — rejected. "Audit" best fits the rules-anchored maximum gate; "drift" is the precise name for drift detection. The rename improves both names.
* **Do nothing (ship neither)** — rejected. It leaves the maximum-gate audit and the rule-set curation the program is built to deliver unbuilt.
