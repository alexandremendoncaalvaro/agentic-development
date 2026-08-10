# ADR-0060: `ad-research` — a research-to-conclusion skill writing evidence-graded studies

**Status:** accepted
**Date:** 2026-08-10
**Deciders:** Alexandre Alvaro

## Context

[ADR-0058](0058-evidence-graded-research-discovery-methodology.md) adopted an evidence-graded methodology and named Front A — research-to-conclusion — as the kit's largest gap, deferring the skill contract to this implementing ADR (ADR-0007 §6). [ADR-0059](0059-grade-of-evidence-primitive.md) landed the shared grade-of-evidence primitive (`WORKFLOW.md` §17) that this skill consumes. This ADR is the Front A implementation.

The gap is concrete: `ad-ground` runs a four-source pass but its output is a *happy-path-to-implement*, not a standalone, evidence-graded conclusion to an open question — "should we adopt X?", "is approach A better than B?", "what is the state of the art on Y?". There is no `doc/research/` layer and no study artifact. The owner does this research by hand (Obsidian notes) with no evidence grading, no provenance, and no reproducible trail, so "the evidence is strong enough to conclude" is a gut call.

The reference example is `ad-spec`: a skill that writes `doc/<layer>/NNNN-<slug>.md` via an interview, an inline template, an output contract, a Next section, and a `draft` status it does not self-flip. `ad-research` adopts that shape. Its methodology is Evidence-Based Software Engineering's Ask / Acquire / Appraise / Apply / Assess loop, the scientific method (a falsifiable hypothesis) when the question is measurable, and the §17 grade-of-evidence for the Appraise step and the proportional conclusion.

## Decision

We will ship `ad-research`, a spec-driven skill that turns an open question into an evidence-graded study at `doc/research/NNNN-<slug>.md`, reusing `ad-ground`'s four-source pass and the `WORKFLOW.md` §17 grade-of-evidence, and graduating a binding conclusion into an ADR.

1. **Contract (phases).** Ask — frame the answerable question (context, candidate options, deciding criterion, outcome that matters), name stakes times irreversibility to set the §17 Axis-2 bar, determine `NNNN`, and route a fuzzy ask to `ad-grill-me` first. Hypothesis — a falsifiable hypothesis and its prediction, when the question is measurable; skipped explicitly when it is a survey question. Acquire — the four-source pass per `ad-ground` (`WORKFLOW.md` §4-5), not re-implemented here; run an experiment or spike (`ad-spike`, §14) when a load-bearing claim can only be settled by measurement (evidence level E1). Appraise — grade each load-bearing claim per §17 Axis 1 with provenance; surface genuine disagreement as a side-by-side contested block. Conclude — the §17 Axis-2 verdict (Strong / Conditional-with-named-mitigation / Insufficient-spike-first), proportional to the stakes named in Ask. Write — the study, conclusion-first. Graduate — a binding conclusion into an ADR that references the study.

2. **Output.** A persistent study at `doc/research/NNNN-<slug>.md` — a new artifact directory (knowledge that precedes decisions and feeds the Plan/Decisions layer, not a seventh entry in the six-layer stack). Conclusion-first, per `ad-philosophy`'s "report for a decision-maker". Status lifecycle `draft → concluded → superseded by RESEARCH-NNNN`; the skill writes `draft` and does not self-flip to `concluded` (mirrors `ad-spec`). The versioned markdown is the source of truth; any HTML/Obsidian rendering is a view of it.

3. **Provenance and dates.** The study is exempt from the no-dates rule (Documentation Discipline §2) for its `Status` / `Created` fields *and* for source-provenance dates — dated sources are the reproducibility primitive, the same auditability rationale that exempts ADR lifecycle fields.

4. **Reuse, do not duplicate.** Acquire defers to `ad-ground`; grading is §17; experiments are `ad-spike`; binding decisions are `ad-adr`. `ad-research` adds only the study artifact, the Evidence-Based framing, and the appraisal-to-conclusion step. The boundary that must stay crisp: `ad-research` answers an open question and concludes; `ad-ground` finds a path to implement an already-decided change.

5. **Registration.** Spec-driven (it writes an artifact) — no `ARCHITECTURE.md` workflow-operational-list edit. Profile-scoped to `solo` / `team` / `mature` (universal), excluded from `poc` — a throwaway PoC does not run standalone studies — mirroring `ad-spec` / `ad-question-me` and preserving the monotone-superset invariant. Dual-host (Claude Code markdown with `AskUserQuestion`; Codex XML with numbered text and no `AskUserQuestion`), words-only per the emoji ban (ADR-0008). Front B (`ad-derisk`) lands in the same delivery, so `ad-research`'s Next routes to it — a study whose conclusion feeds a pre-construction build hands to Front B.

## Consequences

Positive:

- Closes the kit's largest methodological gap: an open question now yields a defensible, evidence-graded conclusion with provenance instead of a gut call or a hand-made note, and the owner's Obsidian study becomes a rendered view of a versioned, auditable artifact.
- The skill is thin: it reuses `ad-ground`, §17, `ad-spike`, and `ad-adr`, adding only the study artifact, the Evidence-Based framing, and the appraisal-to-conclusion step.
- `doc/research/` makes the evidence trail behind a decision first-class and reproducible, which an ADR (a decision record, not an evidence trail) was never meant to hold.

Negative / trade-offs:

- A new artifact directory (`doc/research/`) to maintain — supersession/archive discipline and `ad-drift` now cover one more surface.
- It overlaps `ad-ground` on the Acquire mechanics; the boundary (conclude vs. find-a-path-to-implement) must stay crisp or the two blur. Mitigated by deferring Acquire to `ad-ground` rather than re-implementing it.
- Conclusion quality depends on the appraisal read — the same discipline-dependency §17 and [ADR-0054](0054-ad-question-me-value-first-questioner.md) note; requiring provenance per graded claim is the mitigation.
- One more skill on the surface (`solo` / `team` / `mature`).

## Alternatives Considered

* **Extend `ad-ground` to emit a study** — rejected (ADR-0058). `ad-ground` is deliberately happy-path-to-implement and writes no artifact; a study is a different output with a different stop criterion, and overloading `ad-ground` blurs its single purpose.
* **A mode of `ad-spec`** — rejected. `ad-spec` captures a feature contract (what to build); `ad-research` answers an open question (what is true / what to choose). Different object, different lifecycle (`draft → shipped` vs. `draft → concluded`), different output — the one-skill-one-purpose reasoning ADR-0054 used against fusing skills.
* **No `doc/research/` layer; write conclusions straight into ADRs** — rejected. An ADR records a decision, not the evidence trail and appraisal behind it (Documentation Discipline §9, single responsibility). Conflating them bloats the ADR and loses the study's reproducibility. The study grounds the ADR; they are distinct roles.
* **Do nothing (keep research by hand in Obsidian)** — rejected (ADR-0058). No grading, no provenance, no reproducibility, no proportional stop.
