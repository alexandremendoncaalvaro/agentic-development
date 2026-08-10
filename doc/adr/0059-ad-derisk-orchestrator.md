# ADR-0059: `ad-derisk` — a pre-construction de-risking orchestrator

**Status:** accepted
**Date:** 2026-08-10
**Deciders:** Alexandre Alvaro

## Context

[ADR-0056](0056-evidence-graded-research-discovery-methodology.md) found that Front B — pre-construction de-risking — already has all the tools (`ad-ground`, `ad-spike`, `ad-tdg`, `ad-grill-me`) but lacks the governing loop: there is no risk register and no risk-based stopping criterion, so the pieces are selected by the `WORKFLOW-FLOWS` router (a branch-selector) rather than sequenced by a methodology. ADR-0056 §4 scoped a thin orchestrator and deferred the contract here (ADR-0007 §6). [ADR-0057](0057-grade-of-evidence-primitive.md) landed `WORKFLOW.md` §17 (the per-risk grade and the proportional stop bar); [ADR-0058](0058-ad-research-evidence-graded-studies.md) landed `ad-research`, with which this skill chains.

The gap is the loop and its stop condition, not the tools. Today the stop criteria are local per skill (`ad-ground`'s coverage checkpoint, `ad-spike`'s eval pass-rate, `ad-tdg`'s green tests); nothing says "enumerate the unknowns, drive each below an acceptable threshold, then build." The result is the two failure modes Fairbanks names: too much up-front work, or building in the dark.

Grounding: Fairbanks' risk-driven architecture — identify and prioritize risk, apply a technique to reduce it, re-evaluate, and stop when technical risk falls below the non-technical risks (time-to-market, building the wrong thing); set-based design's "last responsible moment"; and `WORKFLOW.md` §17 Axis 2 as the per-unknown verdict and the proportional bar.

## Decision

We will ship `ad-derisk`, a workflow-operational orchestrator that reduces a defined task's unknowns below an acceptable risk threshold before implementation by sequencing existing skills. It adds no new research tools.

1. **Contract (the loop).** Enumerate the unknowns into a lightweight risk register (technique / integration / performance / scope; each with impact-if-wrong and current uncertainty) → prioritize by impact times uncertainty, attacking the most dangerous first (last responsible moment, but high-risk unknowns do not wait) → dispatch each unknown to the skill that retires it (`ad-ground` for a fact / happy-path, `ad-spike` for an uncertain technique, `ad-tdg` for a strategy, `ad-grill-me` / `ad-question-me` for scope), grading each retirement per §17 Axis 1 → re-score each unknown per §17 Axis 2 → stop when every critical unknown is Strong, or Conditional with a named mitigation, and residual technical risk is below the non-technical risks → hand the de-risked design to `ad-spec` / `ad-adr` / `ad-tdd`.

2. **No artifact of its own.** The running register is lightweight and lives in the task's `Notes`; the heavy evidence persists in the spikes and ADRs the loop spawns. This keeps the kit's "process is ephemeral, decisions persist" discipline, and makes `ad-derisk` a workflow-operational skill (it runs a process, like `ad-ground`), not a spec-driven one.

3. **Reuse, do not duplicate.** It dispatches `ad-ground` / `ad-spike` / `ad-tdg` / `ad-grill-me` and grades via §17; it re-implements none of them. Its only additions are the risk register and the risk-based stop criterion — the governing loop ADR-0056 identified as missing.

4. **Proportional.** "Critical" and the stop bar scale with stakes times irreversibility (§17), so a small task runs a short loop and a high-blast-radius one runs the full loop. The stop criterion is the depth regulator, not fixed ceremony.

5. **Registration.** Workflow-operational category. Profile-scoped to `solo` / `team` / `mature` (universal), excluded from `poc` — a throwaway PoC spikes and goes rather than running a governed de-risking loop — mirroring `ad-research` and preserving the monotone-superset invariant. Dual-host (Claude Code markdown with `AskUserQuestion`; Codex XML with numbered text), words-only per the emoji ban (ADR-0008). It chains with `ad-research`: a study that concludes "spike-first" hands here, and a de-risking pass that hits an open knowledge question spawns a study.

## Consequences

Positive:

- Closes the missing governing loop for de-risking: an engineer now reduces the unknowns of a defined task to an acceptable, evidence-graded level before writing code, with a stop criterion that prevents both building-in-the-dark and over-engineering.
- Thin by construction — it orchestrates the existing skills and the §17 grade, adding only the register and the stop criterion, so it cannot drift from the tools it sequences.
- The risk register makes a build's assumptions explicit and auditable at the point they are cheapest to retire.

Negative / trade-offs:

- An orchestrator skill sits above `ad-ground` / `ad-spike` / `ad-tdg`; the boundary (it sequences, it does not re-implement) must stay crisp or it grows a shadow copy of their mechanics. The contract's "dispatch, do not duplicate" rule is the guard.
- The register lives in the task's `Notes` rather than a dedicated artifact, so a task-less de-risking pass has a weaker home for it. Acceptable: `ad-derisk` runs on a defined task, which has a task file.
- One more skill on the surface (`solo` / `team` / `mature`).

## Alternatives Considered

* **Leave de-risking to the `WORKFLOW-FLOWS` router** — rejected (ADR-0056). The router selects one skill per branch; it is not a loop and carries no risk register or stop criterion. The gap is precisely the governing loop, which a selector cannot be.
* **Add the risk loop to `ad-spike`** — rejected. `ad-spike` retires one uncertain technique; the de-risking loop spans techniques, facts, strategy, and scope, and sequences several skills. Overloading `ad-spike` exceeds its single purpose (the one-skill-one-purpose reasoning of ADR-0054).
* **A persistent de-risking artifact (`doc/derisk/NNNN`)** — rejected. The decisions and evidence already persist in the spikes and ADRs the loop spawns; a separate artifact would duplicate them and violate single-responsibility (Documentation Discipline §9). The lightweight register in the task's `Notes` is enough.
* **Do nothing (keep de-risking scattered)** — rejected (ADR-0056). Scattered tools with local stops reproduce the too-much / too-little failure the risk-driven model exists to prevent.
