# ADR-0017: Workflow-operational skill `agentic-spike` for staged spikes with golden fixtures

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`WORKFLOW.md` §14](../../WORKFLOW.md) names *Staged Spikes With Golden Fixtures* as the technique for cases where the *spec is clear but the technique is uncertain* — library choice, CV approach, multi-stage transformation. The section ships full operational guidance (four-part flow: discovery → golden fixture → pipeline with gates → two-layer evaluation) but no implementing skill. [ADR-0007](0007-workflow-operational-skills.md) §6 listed `agentic-spike` (mapped to §14) as a deferred v0.3 candidate.

The kit covers nearby practices but none replaces §14:

- [`agentic-ground`](0010-agentic-ground-skill.md) handles WORKFLOW §4 + §5 (research before code) — assumes the *how* is knowable from sources A–D and the agent picks a happy path. When the *how* is genuinely uncertain across multiple plausible techniques, ground's deviation gate has nothing to lock against.
- [`agentic-philosophy`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) Goal-Driven Execution covers §9 (Outcome-Based Prompting / TDG) — assumes the path is known and validation is end-to-end. §14 explicitly contrasts itself against §9: *"§9 (TDG) assumes the path is known. When you don't know it, end-to-end evaluation tells you that it failed, not where."*
- [`agentic-task`](../../src/skills/claude-code/agentic-task/SKILL.md) tracks work units but does not enforce the staged-pipeline + per-stage debug artifact discipline §14 names.

The user's [Phase 2 holistic review](../../doc/tasks/0010-v0.3-review-followups.md) and the more recent `/agentic-next` survey both flagged §14 as a documented-but-unautomated WORKFLOW practice — the same failure mode [ADR-0007](0007-workflow-operational-skills.md) §1 names ("documenting a practice without delivering automation produces inconsistency").

§14 is concrete enough to lift directly: four named stages, explicit "when to use" framing (technique uncertain, not just non-trivial), explicit anti-recommendation against §9 for unknown-path work, established prior art (XP spike, golden datasets, trajectory evaluation, stage-segmented error analysis, visual CV debugging — all cited in WORKFLOW.md Sources).

## Decision

We will introduce a workflow-operational skill, **`agentic-spike`**, that scaffolds the four-stage flow §14 describes. Universal install across every profile (the technique is broadly applicable when the *how* is uncertain; profile catalog does not gate it). Each new workflow-operational skill needs its own ADR per [ADR-0007](0007-workflow-operational-skills.md) §6 — this ADR satisfies that scrutiny rule.

1. **Skill name `agentic-spike`.** Workflow-operational. Universal in `poc`, `solo`, `team`, `mature` profiles. Description triggers cover the unknown-*how* keywords: "spike", "uncertain technique", "which library", "CV pipeline", "evaluate approaches", "ground truth", "golden fixture", "staged pipeline", "debug artifacts per stage". Auto-trigger fires when the conversation surfaces technique uncertainty, not just non-trivial work — disambiguates from `agentic-ground` (research a known-knowable path).

2. **Four-step body, mirrors WORKFLOW §14:**
   - **Step 0: Confirm uncertainty.** The skill is for cases where the *technique* is unknown across multiple plausible approaches. If the `how` is routine, route to `agentic-ground` (canonical-path research) and stop. If a single happy path is obvious, do not start a spike.
   - **Step 1: Discovery.** List canonical approaches grounded in official docs and real examples. Pick one (or a small set) by an explicit criterion. Output is information, not code. This step shares mechanics with `agentic-ground` Source A and Source B but the *output* is candidate techniques to spike, not a single happy path.
   - **Step 2: Golden fixture.** Curate inputs with rich expected outputs — bounding boxes, sizes, lighting, difficulty tags, edge cases for CV; intermediate states for multi-stage transformations. JSON keyed by input path. Stored under `spikes/<NNNN>-<slug>/fixtures/` so downstream stages reference a stable path.
   - **Step 3: Pipeline with gates.** One technique per stage; each gate emits a debug artifact (image to `debug/<NN>-<stage>/`, intermediate JSON, log row). Output is inspectable per stage, not only at the end.
   - **Step 4: Two-layer evaluation.** End-to-end against the fixture, *plus* per-stage debug to locate divergence when it fails. Fail explicitly at the stage that diverges, not at the final output.

3. **Output path: `spikes/NNNN-<short-slug>/`.** Plural directory, mirrors `doc/specs/`, `doc/adr/`, `doc/tasks/` numbering convention. NNNN is the next available 4-digit number after the highest existing spike. Layout:
   ```
   spikes/NNNN-<slug>/
     README.md              # spike framing: hypothesis, criterion, candidate techniques
     fixtures/              # golden inputs + expected outputs (JSON keyed by input path)
     debug/01-<stage>/      # per-stage debug artifacts
     debug/02-<stage>/
     ...
     eval/                  # end-to-end + per-stage evaluation results
   ```
   Spikes live outside `doc/` because they are code-and-artifact, not narrative documentation. Spike code is throwaway by design — the artifact lifecycle is "exploratory, then either promoted to production or deleted." `doc/adr/NNNN-...` records the decision after the spike concludes.

4. **Spike concludes by promoting or deleting.** A spike that succeeds produces an ADR ("we will use technique X because the spike showed Y") and the production code is written from scratch using the spike's findings (cited in commit messages or task `Notes`). The spike directory itself is deleted after the ADR lands. A spike that fails produces an ADR ("we considered technique X, rejected because Z") and the spike directory is deleted. Either way, the ADR is the persistent artifact; the spike directory is ephemeral.

5. **Codex parity is symmetric.** Spikes are agent-agnostic. Both variants of the skill ship; the auto-trigger asymmetry per [ADR-0007](0007-workflow-operational-skills.md) applies.

6. **Cross-references in skill bodies.** `agentic-spike`'s `## Next` section points at `agentic-adr` (record the decision) and `agentic-task` (work units to apply the spike's findings to production code). `agentic-ground` and `agentic-philosophy` skill bodies stay unchanged; the disambiguation lives in `agentic-spike`'s Step 0 ("if the *how* is routine, route to `agentic-ground` and stop").

## Consequences

Positive:

- Closes the WORKFLOW §14 documented-but-unautomated gap. Same shape as `agentic-review` closing §10 ([ADR-0007](0007-workflow-operational-skills.md)) and `agentic-hooks` closing §11 ([ADR-0012](0012-agentic-hooks-skill.md)).
- The `Step 0 — confirm uncertainty` gate disambiguates spike (unknown technique) from ground (knowable canonical path). Without the gate, agents would conflate the two and either over-spike (running staged pipelines for routine work) or under-spike (treating genuinely unknown techniques with single-source ground).
- The four-step body lifts directly from §14 — no novel structure, established prior art (XP / golden datasets / stage-segmented error analysis / trajectory evaluation / visual CV debugging) cited in WORKFLOW.md Sources.
- The promote-or-delete lifecycle keeps `spikes/` from becoming a graveyard. ADRs persist; spike directories do not.
- Universal install across every profile matches the principle from [ADR-0013](0013-project-maturity-profiles.md): WORKFLOW principles bind every profile, only artifact set scales. A `poc` user may need spikes more than a `team` user, but neither has them blocked.

Negative / trade-offs:

- **Spike directory under repo root.** `spikes/` is a sibling to `doc/`, `src/`, `templates/`. Adds one more top-level directory to learn. Mitigation: directory only exists when a spike has been started; `agentic-spike` creates it on first invocation, the user deletes it after the spike concludes.
- **Promote-or-delete discipline is advisory.** A user who runs spikes and never deletes them accumulates dead exploration code in the repo. Mitigation: `agentic-audit` could gain a spike-drift category in a follow-up ADR — flag spike directories older than 30 days without a referencing ADR. Deferred.
- **Step 0 gate relies on the agent's judgment.** "Is the technique uncertain or routine?" is itself a judgment call. The agent could over-trigger spike for any non-trivial work. Mitigation: skill body explicitly says *"if a single happy path is obvious, do not start a spike"* and *"route to `agentic-ground`"* — wording matches §14's "skip it when the *how* is routine."
- **No new `agentic-tdg` ADR yet.** ADR-0007 §6 also listed `agentic-tdg` (§9) as deferred. This ADR ships only `agentic-spike`. `agentic-tdg` and the remaining §6 candidates (`agentic-plan-mode`, `agentic-eval`) get their own ADRs when proposed; no implicit bundling.

## Alternatives Considered

- **Fold spike scaffolding into `agentic-ground`.** Rejected. `agentic-ground` produces a single happy path with deviation gate; that's the wrong output shape for spike work where multiple candidate techniques need staged validation. Different answers to different questions; combining would conflate two failure modes (deviation from canonical vs uncertainty across canonicals) per the same logic ADR-0015 used for `agentic-next` vs `agentic-audit`.
- **Spike directory under `doc/spikes/`.** Rejected. `doc/` is for narrative + decision-record documentation. Spike directories are code-and-artifact (fixtures, debug images, eval scripts) — different content type, different lifecycle. Rooting at `spikes/` matches the pattern used for `src/` (code) versus `doc/` (narrative).
- **Persist the spike directory after the spike concludes.** Rejected. Failed spikes accumulate as dead code that confuses future contributors; successful spikes' findings are documented in the ADR — the spike code itself is throwaway by design (XP spike convention). The promote-or-delete discipline matches established practice.
- **Make `agentic-spike` opt-in in `team` and `mature` profiles.** Rejected. WORKFLOW principles bind every profile per [ADR-0013](0013-project-maturity-profiles.md); the universal install matches `agentic-philosophy`, `agentic-ground`, `agentic-review`, `agentic-next` — every workflow-operational skill ships universally. Profile gating skill availability would re-introduce ceremony decisions the profile system was designed to avoid.
- **Defer to v0.13 alongside `agentic-tdg`.** Rejected. The two skills address different uncertainty regimes (§9 path-known vs §14 path-unknown). Bundling would force one shared ADR to cover both, conflating the design rationale. Each ships in its own ADR per [ADR-0007](0007-workflow-operational-skills.md) §6; `agentic-spike` first since its prior art is more established and the skill body is fully derivable from §14 alone.
