# ADR-0052: ad-audit gains a serial empirical-falsification lane

**Status:** proposed
**Date:** 2026-08-07
**Deciders:** Alexandre Alvaro

## Context

`ad-audit` reasons; it does not run the code it reasons about. Steps 4–6 fan out reviewers, harden the CRITICAL groups with a second cross-model pass, and aggregate — all of it argument. The reviewers are permitted read-only execution ("run or inspect the actual output where you can"), but nothing in the contract makes the audit *execute a change* to settle a claim.

One class of finding cannot be settled by argument: a claim that a test or suite **cannot fail** on a given production change — negative-coverage, mirrored-declaration, "this smoke does not actually guard that wiring." Three independent reviewers can agree such a claim is true and all three be wrong, because the only proof is to make the change and watch the suite stay green.

This is not hypothetical, but its evidence is recorded testimony rather than a reference checkable from this public repo — the source is an employer-internal audit trail (an external PR review, deliberately unnamed here for the same reason ADR-0046 and ADR-0047 record employer-internal sources as testimony). As reported there: the audit produced exactly one such finding — that deleting a single production asset-inclusion line would empty the deployed container while the test suite stayed green — and it became irrefutable only when the orchestrator improvised the mutation and watched the suite stay green through a build that no longer shipped the asset. That execution was ad-hoc: no step contracted it, no constraint bounded it, and running a heavy suite concurrently with the parallel reviewers overloaded the machine badly enough to be killed and restarted before it was made serial. The specific numbers are not reproducible from here and are not restated as fact; what the incident establishes for this decision is the *shape* — a "cannot fail" claim that only execution could settle, run without a contract or a safety bound.

The literature the kit already grounds on names execution as the fix, not more argument. [ADR-0045](0045-review-calibration-by-handoff-fidelity.md) cites arXiv:2603.00539 — reviewer false-negative rates *rise* with prompt elaboration, and "the validated mitigation is a differential **execution** filter, not a prompt instruction" — and records that "reproduction is what separated real findings from inflated ones." An execution lane is that mitigation made contractual. It is determinism (the category [ADR-0047](0047-absorb-team-practices-determinism-reaudit.md) favors), not added adversarial pressure, so it is compatible with ADR-0045's finding that more reviewers amplify a confident error rather than correcting it.

## Decision

We will add a **serial empirical-falsification lane** to `ad-audit`, as a bounded step between Step 5 (harden the CRITICAL groups) and Step 6 (aggregate), mirrored on both hosts and named in the reviewer briefs.

1. **Narrow trigger.** The lane fires only when a reviewer finding asserts that a specific test or suite **cannot fail** on a specific production change — a negative-coverage / mirrored-declaration claim. It is a decision procedure, not a mood: "test T does not guard production wiring W" → break W, run T. It does not fire for a finding that merely wants reproduction of the author's own numbers — the evidence gate already covers that.

2. **Orchestrator-only.** The reviewers never mutate the tree. A reviewer that reaches a "cannot fail" inference hands it up as a trigger; the orchestrator runs the lane. The briefs carry a one-line guard to that effect (Codex's reviewer is already `read-only`; the guard makes it explicit).

3. **The procedure.** First confirm the working tree is already clean — a dirty tree means stop, never risk someone's uncommitted work. Then apply the minimal mutation that the finding says the test should catch; run the CI-exact filter; observe the triple `{build result, effect/asset presence, pass-fail count}`; then restore the tree by reverting exactly the paths the mutation touched (`git checkout -- <path>`, never a blanket `reset --hard` or `checkout -- .`) and confirm `git status` clean. Green confirms the finding (the test did not catch the change); red refutes it.

   **Repo isolation.** When the target's repo shares its `.git` with other worktrees, or is the kind of shared checkout `AGENTS.md` warns to run diagnostics against only in a disposable clone, run the mutation in a scratch worktree / disposable clone, not in place — an interrupted in-place run must never be able to strand a dirty tree on a branch someone else is using. This is repo isolation, distinct from the temporal isolation in Decision 4.

4. **Serial and isolated (temporally).** The lane runs only *after* the parallel reviewers finish — never concurrent with them — because running a heavy suite alongside the fan-out is what overloaded the machine in the reported incident. One mutation at a time.

5. **A run is trusted only if it demonstrably happened.** A green count counts only when the mutation is shown to have taken effect (e.g. the asset is actually absent) and the run actually completed. A killed run or a zero exit code over a skipped/`--no-build` run is not a pass — the machine-store CV.6 discipline, applied to the lane's own output.

Ships with an ADR-0045-shaped revisit trigger: it is unmeasured on the current frontier model like ADR-0046's prose posture, so if the lane starts producing spurious refutations or its trigger misfires, measure it over a labelled range or retire it.

## Consequences

Positive:

- The one finding class that argument cannot settle gets a mechanical verdict; the audit's single highest-leverage finding type stops resting on three reviewers agreeing.
- Execution is contracted and bounded, not improvised — the serial-and-isolated constraint that had to be learned by melting a machine is written down.
- Aligns the audit with the literature's validated mitigation (differential execution) that ADR-0045 already cites but no step enacted.

Negative / trade-offs:

- The audit now mutates the working tree in one bounded step. The restore-and-verify-clean requirement is load-bearing; a lane that leaves a dirty tree is a defect, not a finding.
- Serial execution adds wall-clock after the fan-out. Proportionate: it fires rarely (only on a "cannot fail" claim) and the alternative is a shipped false verdict.
- It ships unmeasured on the current model; the revisit trigger is the mitigation, not a measurement.

## Alternatives Considered

- **Leave execution improvised** — rejected. The one time it mattered, it was ad-hoc, unbounded, and melted the machine twice before someone made it serial. A contract is cheaper than relearning that.
- **Let reviewers mutate and run in-lane** — rejected. The reviewers are parallel and isolated by design (ADR-0036); concurrent heavy suites are exactly the load-113 failure, and parallel mutation destroys reproducibility. The lane is orchestrator-only and serial for those two reasons.
- **A standing "reproduce every finding" step** — rejected as scope creep. Reproduction of the author's own claims is already the evidence gate's job; this lane is scoped to the narrow "cannot fail" class the gate cannot settle.
- **A new differential-execution rule in the machine store** — rejected for placement. ADR-0045 located calibration at the reviewer/orchestrator contract, not in the rule-set; a rule would double-report. The lane lives in the skill contract where the execution actually happens.
