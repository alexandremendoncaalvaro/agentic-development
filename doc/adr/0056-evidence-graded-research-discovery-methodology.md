# ADR-0056: An evidence-graded methodology for research and pre-construction discovery

**Status:** accepted
**Date:** 2026-08-10
**Deciders:** Alexandre Alvaro

## Context

The kit serves two recurring activities unevenly, and the owner feels the gap most when driving agents through them.

The first is **research that must reach a defensible conclusion** — an open question whose output is knowledge, not code: "should we adopt X?", "is approach A better than B?", "what is the state of the art on Y?". Today the owner does this by hand (HTML notes in Obsidian) with no methodological discipline, no grading of how strong the evidence is, and no reproducible trail — so "I have enough evidence to proceed" is a gut call.

The second is **pre-construction technical grounding** — de-risking a defined build before writing code: knowing the best technique, running experiments, so the build is solid from the first line. The output here is a build-ready design, not a standalone study.

A map of the kit against both activities found it asymmetric:

- **Research-to-conclusion is essentially a gap.** `ad-ground` runs a four-source pre-implementation pass with citations, but its output is a *happy-path-to-implement*, and its confidence checkpoint is a *coverage* checklist ("consulted A/B/C/D? yes/no"), never a *reliability* grade. There is no `doc/research/` layer, no study/report template, and no source-appraisal discipline anywhere in the kit. (This is distinct from existing evidence vocabulary: ADR-0042's evidence discipline governs claims about the agent's *own* work; ADR-0036's consensus is a *reviewer false-positive* filter. Neither appraises external research sources.)
- **De-risking exists as scattered pieces, not one methodology.** `ad-ground`, `ad-spike`, `ad-tdg`, and `ad-grill-me` are the de-risking tools, selected by the `WORKFLOW-FLOWS` router — but the router is a branch-selector, not a governing loop. There is no risk register and no risk-based stopping criterion; each skill has its own local stop (coverage checklist, eval pass-rate, green tests), and nothing says "enumerate the unknowns, drive each below threshold, then build".

The unlocking insight is that these are **not two methodologies** — they are the *same evidence engine* with different stopping criteria and different output artifacts. That lets a shared primitive serve both instead of building two parallel research stacks.

Established methodology backs each part and is cited here (kept light in the eventual skill bodies): Evidence-Based Software Engineering (Kitchenham & Dybå, 2004) and its Ask-Acquire-Appraise-Apply-Assess loop; the GRADE approach, whose defining move is to *separate the quality of evidence from the strength of the decision*; the software-engineering hierarchy of evidence (reproducible measurement over primary docs over community consensus over single-source over opinion); Fairbanks' risk-driven architecture (identify and prioritize risk, apply a technique to reduce it, re-evaluate; stop when technical risk falls below the non-technical risks); the XP spike and the Pragmatic Programmer tracer bullet / walking skeleton; and set-based design (evaluate options, eliminate by evidence, decide at the last responsible moment).

Kit convention (ADR-0007 §6 skill-surface scrutiny) is that no skill ships without an accepted ADR. This record therefore fixes the *methodology architecture* only; the two skills and the `ad-ground` increment each land under their own implementing ADR.

## Decision

We will adopt a single evidence-graded methodology for research and discovery, structured as one shared evidence engine plus two fronts, and lock its architecture here. The implementing skills and the `ad-ground` increment are follow-up ADRs per ADR-0007 §6; this ADR stays at architecture altitude and does not pre-decide their skill contracts.

1. **The shared engine — a grade-of-evidence primitive on two axes.** Adapting GRADE's separation of evidence quality from decision strength:
   - **Axis 1 — evidence strength (per claim).** A software-engineering source hierarchy from strongest to weakest — E1 reproducible measurement/experiment on the real target; E2 primary official docs for the version in use plus a validated implementation reference, convergent; E3 community consensus (three or more reputable independent sources agree); E4 single reputable source, or a majority with relevant dissent; E5 isolated opinion / anecdote / undated / weak source — modified up or down by agreement across sources, applicability to the real context (directness), and recency (staleness). Each claim is sealed High / Medium / Low / Very-low and carries its provenance (citation, date, access method). Genuine disagreement is surfaced as a side-by-side "contested" positions block, never collapsed into false consensus.
   - **Axis 2 — confidence to proceed (per conclusion).** Aggregates Axis 1 with the upside/downside balance and reversibility/blast-radius into an actionable verdict: **Strong** (proceed), **Conditional** (proceed with a named mitigation — flag, post-deploy measurement, ready rollback), or **Insufficient / spike-first** (do not proceed; the gap is retirable by experiment). The bar for "Strong" scales with stakes times irreversibility. This axis is the proportional depth regulator and is the same stop condition as Fairbanks' risk-driven model, expressed as "how adequate must the evidence be for *this* decision".

2. **The engine increments `ad-ground`, it does not duplicate it.** `ad-ground`'s coverage checkpoint becomes a graded appraisal, and the same primitive is reused by both fronts. A quick mode (hierarchy plus a one-line verdict) preserves the current lightweight behavior for callers who only need coverage; full grading engages only when stakes justify it.

3. **Front A — a research-to-conclusion skill (working name `ad-research`), which complements the kit.** It runs the EBSE loop, adding the scientific method (falsifiable hypothesis, prediction, experiment) when the question is measurable; it reuses `ad-ground`'s four-source pass and the grade-of-evidence engine; and it produces the artifact the kit lacks — a persistent, provenance-carrying study at `doc/research/NNNN-<slug>.md` (a new artifact directory — evidence that precedes decisions and feeds the Plan/Decisions layer — conclusion-first per `ad-philosophy`'s "report for a decision-maker"). A binding conclusion graduates into an ADR that references the study. The versioned markdown is the source of truth; any HTML/Obsidian rendering is a view of it.

4. **Front B — a de-risking orchestrator (working name `ad-derisk`), which orchestrates existing skills rather than adding tools.** It enumerates the unknowns into a risk register, prioritizes by impact times uncertainty, dispatches each unknown to the skill that already retires it (`ad-ground` for happy-path facts, `ad-spike` for technique choice, `ad-tdg` for strategy, `ad-grill-me`/`ad-question-me` for scope), re-scores each via Axis 2, and stops when every critical risk is Strong or Conditional-with-mitigation and residual technical risk is below the non-technical risks. Output is a de-risked design bundle handed to `ad-spec` / `ad-adr` / `ad-tdd`. The running register stays lightweight (task Notes); the heavy evidence persists in the spikes and ADRs it spawns, keeping the kit's "process is ephemeral, decisions persist" discipline.

5. **The two fronts chain.** A study (A) that concludes "spike-first" hands to B; a de-risking pass (B) that hits a knowledge gap spawns a focused study (A). Same engine, different entry and exit.

6. **It lands the kit-native way.** A `WORKFLOW.md` section carries the philosophy; the two skills plus the `ad-ground` increment carry the operation (each under its own ADR); a study template carries the report shape. Dual-host (Claude Code + Codex), words-only per the emoji ban (ADR-0008); profile-scoping is deferred to the per-skill ADRs.

## Consequences

Positive:

- Fills the kit's largest methodological gap (research-to-conclusion) and closes the missing governing loop for de-risking, without rewriting `ad-ground`, `ad-spike`, or `ad-tdg` — the strong pieces are reused, not repeated.
- "Evidence adequate to proceed" becomes an explicit, graded, proportional judgment instead of a gut call, and the owner's manual Obsidian study becomes a rendered view of a versioned, auditable, provenance-carrying artifact.
- One primitive regulates depth across both fronts, so rigor scales with stakes rather than being fixed ceremony; the same knob prevents both building-in-the-dark and over-engineering.

Negative / trade-offs:

- Incrementing `ad-ground`'s checkpoint touches a widely-used skill; the change must preserve current behavior for coverage-only callers. The quick-mode/full-mode split is the mitigation, and it is load-bearing.
- Two new skills on the surface (`ad-research` net-new; `ad-derisk` adjacent to `ad-ground`/`ad-spike`). The ADR-0007 §6 scrutiny is deferred to each skill's own ADR; the anti-duplication boundary — orchestrate, do not reimplement — is stated here and must be enforced there.
- The grading is only as good as the appraisal behind it; a shallow source read can mis-grade a claim. This is a discipline dependency, not a mechanical guarantee — the same class of risk ADR-0054 notes for `ad-question-me`'s grounding filter.
- `doc/research/` adds a new artifact directory to maintain: supersession/archive discipline and drift audits now have one more surface to cover.

## Alternatives Considered

* **One skill with two modes (`research` | `preflight`)** — rejected. It fuses two stopping criteria and two output artifacts under one roof, collides with the kit's one-skill-one-purpose granularity, and complicates routing — the same reasoning ADR-0054 used to reject folding `ad-question-me` into `ad-grill-me`.
* **Extend existing skills only (grow `ad-ground` into Front A; add a risk section to `ad-spike` for Front B)** — rejected. `ad-ground` is deliberately "does not write code / happy-path"; overloading it to emit a study muddies its purpose, and Front B's governing loop exceeds `ad-spike`'s scope. It under-serves both.
* **Put the grade-of-evidence rubric in the machine rule-set** — rejected for placement. The appraisal happens inside the research and de-risking skills; a rule would double-report — the placement reasoning ADR-0052 used to keep the execution lane in the skill contract.
* **Do nothing (keep research by hand in Obsidian)** — rejected. The manual method has no evidence grading, no provenance, no reproducibility, and no proportional stop; that gap is precisely what this decision records.
