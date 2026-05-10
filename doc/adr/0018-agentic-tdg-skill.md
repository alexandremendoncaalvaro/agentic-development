# ADR-0018: Workflow-operational skill `agentic-tdg` for outcome-based prompting with Test Dependency Map

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`WORKFLOW.md` §9](../../WORKFLOW.md) names *Outcome-Based Prompting (TDG)* — give the agent the finish line first, not the path. Four sub-practices:

1. **Ground truth** — raw input plus exact expected output stated before any code is written.
2. **Command the implementation** — the algorithm connecting input to output.
3. **Iterate by criterion** — ask for three approaches; pick by *one* explicit criterion (readability, performance, *or* testability — not all three at once).
4. **Test Dependency Map, not procedural TDD** — tell the agent *which* tests cover the file ("before modifying X.ts, list which tests cover it. Run. Modify. Run. If none, write one first.")

[ADR-0007](0007-workflow-operational-skills.md) §6 listed `agentic-tdg` as a deferred v0.3 candidate. The kit covers nearby practices but none replaces §9:

- [`agentic-ground`](0010-agentic-ground-skill.md) handles the *research before implementation* phase — four-source levantamento + happy-path synthesis. Stops at "what is the canonical approach?". §9 starts where ground stops: given the canonical approach is known, *how* do we implement it cleanly?
- [`agentic-philosophy`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) Goal-Driven Execution covers the §9.4 TDM clause inline ("Before modifying a file, list which tests cover it. Run. Modify. Run. If none, write one first."). The other three §9 sub-practices (ground truth pair, three-approach iteration, criterion selection) are not implemented.
- [`agentic-spike`](0017-agentic-spike-skill.md) ships staged spikes for the *unknown technique* regime; §9 is for the known-technique regime where multiple implementation strategies exist.

The user's [Phase 2 holistic review](../../doc/tasks/0010-v0.3-review-followups.md) and the recent `/agentic-next` survey both flagged §9 as a documented-but-unautomated WORKFLOW practice.

§9 differs from §14 (spike) in *what is uncertain*:

- **§14 (`agentic-spike`):** *technique* uncertain across multiple plausible approaches. Output: staged pipeline + golden fixture + per-stage debug. Promote-or-delete lifecycle.
- **§9 (`agentic-tdg`):** technique known, *implementation strategy* uncertain — multiple algorithms could produce the expected output. Output: ground truth pair + TDM + three-candidate selection + verified implementation. No throwaway directory; the implementation is the artifact.

The two are complementary, not overlapping. A typical flow on a hard non-trivial change: `agentic-ground` (research the canonical approach) → if ≥2 plausible techniques: `agentic-spike` to discriminate → if technique is settled but ≥2 implementation strategies: `agentic-tdg` to pick by criterion → implement + verify.

## Decision

We will introduce a workflow-operational skill, **`agentic-tdg`**, that scaffolds the four §9 sub-practices end-to-end. Universal install across every profile per [ADR-0013](0013-project-maturity-profiles.md).

1. **Skill name `agentic-tdg`.** Workflow-operational. Universal in `poc`, `solo`, `team`, `mature`. Description triggers on the §9 keywords: "outcome-based", "TDG", "ground truth", "expected output", "three approaches", "pick by criterion", "test dependency map", "TDM", "before modifying", "tests covering this file", "give the finish line".

2. **Five-step body, mirrors WORKFLOW §9:**
   - **Step 0: Confirm regime.** TDG is for the implementation phase when the canonical technique is known and multiple implementation strategies are plausible. If the technique itself is uncertain, route to `agentic-spike` and stop. If the path is fully obvious (one-line fix, mechanical refactor), TDG is overkill — proceed directly without the skill.
   - **Step 1: Ground truth pair.** State raw input + exact expected output before any code. JSON / fixture / inline example — whatever lets the agent verify the algorithm against a concrete target.
   - **Step 2: Test Dependency Map (TDM).** List the tests covering the file(s) the change will touch. Run them to establish the green baseline. If no tests cover the surface, write one first that exercises the current behavior before any modification.
   - **Step 3: Three approaches.** Generate three implementation candidates that produce the ground-truth output. Each candidate names trade-offs along the three §9 axes (readability, performance, testability). No premature optimization across all three.
   - **Step 4: Pick by one criterion.** User picks the criterion explicitly — readability *or* performance *or* testability, not all three. The skill commits to the selected candidate; alternatives get one-line rejection notes for the commit message or task `Notes`.
   - **Step 5: Implement + verify.** Modify. Run the TDM tests. If green, the change is done. If red, iterate against the same ground-truth pair until green. The TDM tests are the verification surface; success is "ground truth pair passes + TDM tests stay green."

3. **No file written.** TDG is a process scaffold, not an artifact generator. The output of the skill is the verified implementation that lands in the repo through normal commits. The ground-truth pair, candidate set, selection criterion, and TDM list go into the commit message body or the task's `Notes` log when one exists — not into a separate `doc/` file.

4. **Codex parity is symmetric.** TDG is agent-agnostic; both variants ship. Auto-trigger asymmetry per [ADR-0007](0007-workflow-operational-skills.md) applies.

5. **Cross-references in skill bodies.** `agentic-tdg`'s `## Next` section points at `/agentic-review` (§10 fresh-context review of the merged change) and `/agentic-task` if the work spans multiple sessions and needs explicit decomposition. `agentic-ground` and `agentic-spike` skill bodies stay unchanged; the routing-from-tdg lives in `agentic-tdg`'s Step 0 ("if the technique itself is uncertain, route to `agentic-spike`").

6. **Not bundled with `agentic-plan-mode` or `agentic-eval`.** ADR-0007 §6 also listed those candidates. They address different practices (§6 phase-tracking, §13 evals harness) and ship in their own ADRs when proposed. No implicit bundling.

## Consequences

Positive:

- Closes the WORKFLOW §9 documented-but-unautomated gap. Same shape as `agentic-review` closing §10, `agentic-hooks` closing §11, `agentic-spike` closing §14.
- Disambiguates the implementation-phase regimes:
  - *technique unknown* → `agentic-spike` (staged spike + golden fixture)
  - *technique known, implementation strategy unsettled* → `agentic-tdg` (three candidates + criterion + TDM)
  - *path fully obvious* → no scaffold needed; proceed directly
- The Step 4 single-criterion discipline matches §9 verbatim — refuses the common failure mode of "optimize for readability AND performance AND testability" (premature trade-off entanglement).
- The TDM step (Step 2) makes the Goal-Driven Execution clause from `agentic-philosophy` operational — instead of relying on the agent to remember "list tests first," the skill body forces it as a numbered step before any modification.
- Universal install matches the WORKFLOW-principles-bind-every-profile rule from [ADR-0013](0013-project-maturity-profiles.md). A `poc` user benefits from TDG when the implementation strategy matters; a `team` / `mature` user benefits when the test surface is complex.

Negative / trade-offs:

- **No file output.** The skill produces structured conversation output, not a persistent artifact. Loses the audit trail that spec / ADR / task scaffolds provide. Mitigation: the ground-truth pair, candidate set, criterion, and TDM go into the commit message body and the task `Notes` log when one exists; persistent record lives in git history + task file, not in a TDG-specific surface.
- **Step 0 gate relies on the agent's judgment.** "Is the technique uncertain or routine?" overlaps with `agentic-spike`'s Step 0. Mitigation: skill body explicitly routes to `agentic-spike` when the regime is unknown technique; the boundary is documented but ultimately the agent decides at runtime.
- **Three-candidate generation can stall on small changes.** A one-line fix does not need three candidates. Mitigation: Step 0 explicitly says "if the path is fully obvious, TDG is overkill — proceed directly without the skill." The skill is opt-in via auto-trigger keywords; routine work skips it by not triggering.
- **TDM step depends on test infrastructure.** Projects without test runners cannot run the tests; the green-baseline step degrades to "list which tests *would* cover this file (none)." Mitigation: skill body acknowledges the case and routes to `/agentic-hooks` for projects that should wire tests; the skill does not block on missing tests.

## Alternatives Considered

- **Fold §9 into `agentic-philosophy` Goal-Driven Execution.** Rejected. The TDM clause is already in `agentic-philosophy`; folding the other three sub-practices (ground truth pair, three approaches, criterion) would inflate the philosophy skill beyond its posture role. Same line [ADR-0007](0007-workflow-operational-skills.md) drew between `agentic-philosophy` (posture) and `agentic-review` (process). TDG is process; ships as its own skill.
- **Fold §9 into `agentic-ground`.** Rejected. Ground produces the *what is the canonical approach*; TDG produces the *how to implement that approach cleanly*. Different phases of the work; different inputs; different outputs. Combining would force the four-source research pass to also run the three-candidate selection on every invocation, inflating cost on routine research turns.
- **Make `agentic-tdg` opt-in (conditional, not universal).** Rejected. TDG applies whenever an implementation strategy is uncertain — a regime that arises at every project maturity. Conditional install would re-introduce the "is this skill available here?" cognitive cost the universal-install model from [ADR-0013](0013-project-maturity-profiles.md) was designed to remove.
- **Output a `doc/tdg/NNNN-<slug>.md` artifact for each TDG run.** Rejected. The persistent record is the commit message + task `Notes` (when one exists); a separate `doc/tdg/` directory would duplicate the audit trail and add a fifth artifact-shaped surface (specs, ADRs, tasks, spikes, tdgs) that pays no clarity dividend.
- **Defer to v0.14 alongside `agentic-plan-mode`.** Rejected. §9 and §6 (Explore→Plan→Implement→Commit) address different practices — TDG is implementation-phase scaffold, plan-mode is phase-tracker. No shared design rationale; bundling would conflate two ADRs into one. `agentic-plan-mode` ships in its own ADR when proposed.
