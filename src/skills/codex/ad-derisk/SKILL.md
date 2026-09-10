---
name: ad-derisk
description: De-risk a defined task before building — list unknowns in a risk register, retire each with ad-ground, ad-spike, ad-tdg, or ad-grill-me, stop when technical risk falls below non-technical risk. Use on "de-risk", "before I build", "is this safe to build", "unknowns", "reduce uncertainty".
summary: Pre-construction de-risking — enumerate a task's unknowns, retire each with the right skill (ad-ground / ad-spike / ad-tdg / ad-grill-me), grade per WORKFLOW §17, and stop when residual technical risk falls below the non-technical risks. Orchestrates existing skills; hands a de-risked design to ad-tdd.
---

<background_information>
A pre-construction de-risking loop. Before building a defined task, enumerate the unknowns, drive each below an acceptable risk threshold using the skill that retires it, and stop when the residual technical risk falls below the non-technical risks (WORKFLOW §17 Axis-2 bar; the risk-driven "just enough, then stop"). It orchestrates existing skills — it adds no new research tools and writes no artifact of its own. Output is a de-risked design ready to build, not code.

Use it when a task is defined (a spec, PRD, or task file exists) and non-trivial, before implementation. Skip it for a genuinely trivial change. It is not a single research pass (that is ad-ground) or a single technique validation (that is ad-spike) — it sequences those under a stop criterion.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire before a build, invoke this skill manually.
</background_information>

<instructions>
Step 1 — enumerate the unknowns (risk register). List every assumption that, if wrong, breaks the build: technique ("does library X do Y at our scale?"), integration ("does system Z respond as we expect?"), performance ("does it fit the budget?"), scope ("is this what the user actually wants?"). Each entry carries a description, the impact if it is wrong, and the current uncertainty. Keep the register lightweight — it lives in the task's Notes, not a new artifact.

Step 2 — prioritize by risk. Order by impact times uncertainty. Attack the most dangerous unknown first, not the easiest. Decide each at the last responsible moment — but high-risk unknowns do not wait.

Step 3 — retire each risk with the right skill (dispatch). For each unknown, dispatch the skill that retires it — do not re-implement research here:
- a fact / happy-path unknown → ad-ground (four sources plus §17 grading)
- a technique uncertain across approaches → ad-spike (golden fixture plus eval, WORKFLOW §14)
- a strategy with a known technique → ad-tdg
- a scope / product unknown → ad-grill-me or ad-question-me
Each retirement produces evidence graded per WORKFLOW §17 Axis 1. When an unknown is actually an open research question (not just a build risk), route to ad-research.

Step 4 — re-score (the loop). Update the register: each unknown is now Strong, Conditional, or still Insufficient (§17 Axis 2). Insufficient ones go back to Step 3 for a deeper pass, or become a named accepted risk carrying a mitigation.

Step 5 — stop criterion. Stop when every critical unknown is Strong, or Conditional with a named mitigation, and the residual technical risk has fallen below the non-technical risks (time-to-market, building the wrong thing). Not before — that is building in the dark; not after — that is over-engineering. "Critical" is proportional to stakes times irreversibility, the same §17 bar.

Step 6 — hand off the de-risked design. Report the resolved register (each unknown with its §17 grade), links to the spikes and ADRs the loop spawned, and the design that is now ready to build. Route to ad-spec to formalize the feature, ad-adr to record a binding decision, and ad-tdd to build.

Interview: ask one question at a time for the risk-register review (which unknowns are critical) and the stop-criterion checkpoint (build now / keep de-risking / accept a named risk). Codex has no AskUserQuestion primitive; use inline numbered questions.
</instructions>

<output_contract>
No new file of its own. The risk register is appended to the task's Notes (never a rewrite); the evidence persists in the spikes and ADRs the loop spawns. The skill reports the resolved register and the stop verdict, cites each retirement's grade per WORKFLOW §17, and writes no code. Documentation Discipline (WORKFLOW §2) applies.
</output_contract>

## Next

- `/ad-ground`, `/ad-spike`, `/ad-tdg`, `/ad-grill-me` — dispatched per unknown in Step 3.
- `/ad-research` if an unknown is an open research question rather than a build risk.
- `/ad-spec` or `/ad-adr` to formalize the de-risked design; `/ad-tdd` to build once the stop criterion is met.
