# ADR-0059: A shared grade-of-evidence primitive, first consumed by `ad-ground`

**Status:** accepted
**Date:** 2026-08-10
**Deciders:** Alexandre Alvaro

## Context

[ADR-0058](0058-evidence-graded-research-discovery-methodology.md) adopted an evidence-graded methodology whose shared engine is a two-axis grade-of-evidence primitive, and it scoped the `ad-ground` increment to its own implementing ADR. This is that ADR. It is the prerequisite for both fronts (`ad-research`, `ad-derisk`), so it lands first.

The concrete gap is in `ad-ground`'s Step 4 confidence checkpoint (`.claude/skills/ad-ground/SKILL.md:46`). Today it is a *coverage* checklist — "A consulted: yes/no", "B consulted: yes/no", "C consulted: yes/no", "D checked: yes/no". It verifies that the four sources were *consulted*; it says nothing about how *reliable* what they returned is. An agent can pass the checkpoint on four weak sources — one undated blog, one unrelated gist, no in-repo analog, no prior commit — and proceed with false confidence. There is no per-claim reliability grade, no provenance beyond a bare citation, no honest handling of sources that disagree, and no proportional "is this enough to proceed for *this* decision" verdict. "Consulted four sources" is being read as "the evidence is strong", and those are not the same claim.

Both fronts will need the identical grading. Defining it three times invites drift; defining it once, in the constitution the skills already cite, prevents it. Kit convention makes the home unambiguous: `WORKFLOW.md` / `WORKFLOW-FLOWS.md` are the Layer 1 Constitution and the one doc pair the installer reads at runtime so the section numbers skills cite resolve there ([ADR-0049](0049-append-only-layers-own-a-state-projection.md); `ARCHITECTURE.md`). `ad-ground` is a workflow-operational skill ([ADR-0007](0007-workflow-operational-skills.md)) implementing `WORKFLOW.md` §4 + §5, and it auto-invokes on all non-trivial work — so any change to it must be additive, or it perturbs every downstream flow.

Established methodology backs the shape: GRADE's defining move — separate the quality of evidence from the strength of the decision; the software-engineering hierarchy of evidence (reproducible measurement over primary docs over community consensus over single-source over opinion); and EBSE's Appraise step, the one `ad-ground`'s checkpoint currently skips.

## Decision

We will define the grade-of-evidence primitive once, as a new `WORKFLOW.md` section, and make `ad-ground` its first consumer — additively, with the current lightweight path preserved as the default.

1. **A new `WORKFLOW.md` section defines the primitive canonically** (section number assigned at implementation; it is a new top-level section, not folded into the existing §3 "Format by Evidence", which is about prompt format and only collides by name). The section is the single definition `ad-research` and `ad-derisk` will also cite:
   - **Axis 1 — evidence strength, per claim.** The E1–E5 source hierarchy (E1 reproducible measurement on the real target; E2 primary official docs for the version in use plus a validated implementation reference, convergent; E3 community consensus, three or more reputable independent sources; E4 single reputable source or majority-with-dissent; E5 isolated opinion / anecdote / undated / weak), modified by agreement, applicability (directness), and recency (staleness). Each claim is sealed High / Medium / Low / Very-low and carries provenance — citation, date, access method. Genuine disagreement is surfaced as a side-by-side contested block, never collapsed into false consensus.
   - **Axis 2 — confidence to proceed, per conclusion.** Aggregates Axis 1 with the upside/downside balance and reversibility/blast-radius into Strong (proceed), Conditional (proceed with a named mitigation), or Insufficient / spike-first (do not proceed; the gap is retirable by experiment). The bar for Strong scales with stakes times irreversibility.

2. **`ad-ground` consumes it, additively.** (a) The output's cited sources and happy-path assertions may carry an Axis-1 seal plus provenance; (b) Step 4's checkpoint gains an Axis-2 verdict (Strong / Conditional / Insufficient-spike-first) *alongside*, not replacing, the existing coverage checks; (c) an Insufficient / spike-first verdict is the explicit, named seam to `ad-spike` (today that handoff is informal).

3. **Proportionality via a quick/full mode.** Quick mode is today's behavior — the coverage checklist plus a one-line proceed/pause — and stays the default for small, reversible scopes. Full grading (per-claim seals, contested blocks, the Axis-2 stakes bar) engages only when stakes times irreversibility justify it. This keeps `ad-ground` lightweight on the common path and stops the primitive from becoming ceremony on every trivial pass.

4. **Everything else in `ad-ground` is unchanged** — the four-source pass (Steps 0–3), `allowed-tools`, and the "writes no code" contract.

## Consequences

Positive:

- "Consulted four sources" stops being mistaken for "the evidence is strong": the checkpoint reports reliability, not just coverage, which is the whole point of the owner's "evidence adequate to proceed".
- One definition, three consumers — `ad-research` and `ad-derisk` inherit the grading instead of re-specifying it, so drift between them is impossible by construction.
- The Insufficient / spike-first verdict gives `ad-ground` a principled, named handoff to `ad-spike`, tightening a seam that is informal today.

Negative / trade-offs:

- `ad-ground` auto-invokes on all non-trivial work, so any non-additive change would perturb every downstream flow. The quick-mode default is the load-bearing mitigation; full grading must stay opt-in by stakes, never on by default.
- Grading quality depends on the appraiser's read — the same discipline-dependency [ADR-0054](0054-ad-question-me-value-first-questioner.md) notes for `ad-question-me`. Requiring provenance per seal is the mitigation: a claim you cannot source cannot be graded High.
- One more `WORKFLOW.md` section for skills to cite and for `ad-drift` to cover.

## Alternatives Considered

* **Define the primitive inside `ad-ground` and have the other skills reference the skill body** — rejected. Skills cite `WORKFLOW.md` section numbers, not each other's bodies (`ARCHITECTURE.md`; ADR-0049). A skill-local definition would force `ad-research` / `ad-derisk` to duplicate or cross-reference a skill body, which is exactly the drift this decision avoids. The constitution is the correct home for a cross-skill primitive.
* **A standalone reference file outside `WORKFLOW.md`** — rejected. The installer reads `WORKFLOW.md` / `WORKFLOW-FLOWS.md` at runtime so cited section numbers resolve (`ARCHITECTURE.md`; ADR-0049); a new top-level file would need its own install plumbing for no benefit over a section.
* **Replace `ad-ground`'s coverage checklist outright with the grade** — rejected. `ad-ground` auto-invokes everywhere; a hard replacement makes every research pass pay full grading cost. The additive quick/full split is the proportional path ADR-0058 mandates.
* **Put the grade in the machine rule-set** — rejected for placement, on the same reasoning as ADR-0058 and [ADR-0052](0052-ad-audit-empirical-falsification-lane.md): the appraisal happens inside the skill, so a rule would double-report.
