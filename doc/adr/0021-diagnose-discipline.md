# ADR-0021: Diagnose with discipline (`WORKFLOW.md` §15) and the planned `agentic-diagnose` skill

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

`WORKFLOW.md` covered three regimes that touch implementation:

- **§9 (TDG / Outcome-Based Prompting)** — the technique is known, multiple implementation strategies are plausible, ground-truth pair drives the work.
- **§14 (Staged Spikes With Golden Fixtures)** — the technique itself is uncertain across multiple plausible approaches, staged pipeline + per-stage debug discriminates.
- **§10 (Reviewer With Fresh Context)** + **§11 (Quality Gates)** — post-implementation discrimination.

There was **no regime for hard bugs and performance regressions**. The cross-pollination pass against [`mattpocock/skills`](https://github.com/mattpocock/skills) on 2026-05-10 surfaced his [`/diagnose`](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnose/SKILL.md) skill, which treats debugging as its own discipline with a five-phase shape:

1. Build a feedback loop (Pocock's framing: *"this is the skill — everything else is mechanical"*).
2. Reproduce — confirm the captured failure matches the user's description.
3. Hypothesise — generate three to five **ranked, falsifiable** hypotheses; show the ranked list to the user before testing.
4. Instrument — change one variable at a time; each probe maps to one prediction.
5. Fix and regression-test — promote the loop's check into a permanent test.

The shape is not Pocock's invention — it codifies standard debugging practice (Kernighan & Pike, *The Practice of Programming*, 1999, ch. 5–6) and Karl Popper's falsifiability framing (*The Logic of Scientific Discovery*, 1959) for hypothesis discipline. Pocock's framing of Phase 1 ("the loop *is* the skill") is sharp enough that the kit borrows the wording with attribution.

The kit's gap is not theoretical. Without a named diagnose discipline, the agent's default behavior on a hard bug is:

- Skip Phase 1 (no loop) — read code, form a single hypothesis based on the first plausible cause, propose a fix without ever reproducing the bug.
- Skip Phase 3 (no ranked alternatives) — anchor on the first hypothesis, propose a fix to it, fail to falsify, propose a different fix.
- Skip Phase 4 discipline — change three things at once, confuse correlation with cause, declare victory because the symptom changed.
- Skip Phase 5 — the fix lands without a regression test that locks the failure mode out.

These are exactly the failure modes Pocock's framing counters, and they are visible in the wild often enough that adding the regime to the kit is high-leverage.

## Decision

Add a new section **`WORKFLOW.md` §15: Diagnose With Discipline** (renumbering nothing — §16 and §17 are the new TL;DR-introduced bullets, the prior §15 / §16 prose sections did not exist). Plan the operational implementation as a deferred skill **`agentic-diagnose`** to be shipped in a subsequent v0.15.x minor release.

1. **WORKFLOW §15 ships in v0.14.0-beta.1.** Prose section defining the five phases verbatim, with the Pocock framing of Phase 1 attributed inline ("the loop is the skill — everything else is mechanical") and the Kernighan/Pike + Popper sources cited under Sources.

2. **`agentic-diagnose` skill is deferred to v0.15.x.** Rationale: v0.14 is a *principles* release (WORKFLOW + ADRs + the Domain layer), not a *skills* release. Bundling the implementation skill into v0.14 would inflate the diff and conflate two release purposes. The skill is tracked under [task-0020](../tasks/0020-mattpocock-absorptions.md) along with the other deferred skills surfaced by the cross-pollination pass.

3. **Skill shape (when shipped).** Workflow-operational. Universal across **all four profiles** — debugging discipline applies equally to a `poc` experiment and a `mature` regulated product; the regime does not scale with project maturity. Description triggers on §15 keywords: "diagnose this", "debug this", "this is broken", "this is throwing", "performance regression", "find the bug", "build a repro", "feedback loop". Auto-trigger asymmetry per [ADR-0007](0007-workflow-operational-skills.md) (Claude Code auto-invokes; Codex requires explicit invocation).

4. **Skill body mirrors §15 phases.**
   - **Step 0: Confirm regime.** Diagnose is for hard bugs / performance regressions where the cause is unclear. If the bug is one-line obvious (typo, off-by-one), the skill is overkill. If the technique itself is uncertain across multiple plausible approaches, route to `agentic-spike`. If the spec or expected behavior is unclear, route to the planned `agentic-grill`.
   - **Step 1: Build a feedback loop.** Walk the user through the ten loop-construction techniques in §15. Refuse to proceed to hypotheses until a loop exists or the user explicitly accepts the no-loop risk.
   - **Step 2: Reproduce.** Run the loop. Confirm symptom matches user description. Capture the exact failure for later phases to verify against.
   - **Step 3: Hypothesise.** Generate 3-5 ranked falsifiable hypotheses. Each must state its prediction. Show the ranked list to the user before testing.
   - **Step 4: Instrument.** One probe per prediction. One variable at a time.
   - **Step 5: Fix and regression-test.** Promote the loop's check into a permanent test next to the code.

5. **Cross-references with adjacent skills.**
   - From `agentic-tdg`'s Step 0 — when the bug is clearly a ground-truth-pair regression (test was passing, now failing, expected output unchanged), TDG handles it. Anything more involved routes to `agentic-diagnose`.
   - From `agentic-review`'s findings — Blockers tagged "needs reproduction" route to `agentic-diagnose`.
   - From `agentic-spike` — when the spike's per-stage debug surfaces a bug *inside* a stage rather than between stages, the bug becomes a `agentic-diagnose` problem with the stage's input as the loop seed.

6. **Output of the skill.** Like `agentic-tdg` (per [ADR-0018](0018-agentic-tdg-skill.md) §3), `agentic-diagnose` writes no separate artifact. The output is the verified fix + the regression test that lands through normal commits. Loop construction notes, ranked hypotheses, and the falsified ones go into the commit message body or the task's `Notes` log when one exists.

## Consequences

**Positive.**
- Closes the largest behavioral gap in the kit — debugging was uncovered by any prior regime.
- The regime is grounded in established practice (Kernighan/Pike) and a well-known epistemological principle (Popper falsifiability), not novel kit invention.
- The Pocock framing of "the feedback loop is the skill" is unusually sharp and counters the most common agent failure mode (vibes-debugging without a repro).
- The five phases produce mechanical checkpoints — Phase 3 demands a *count* of hypotheses (3-5) and *prediction wording* per hypothesis; both are checkable by reviewers.
- Splitting WORKFLOW prose (v0.14) from the skill implementation (v0.15.x) keeps each release coherent in scope.

**Negative.**
- WORKFLOW §15 ships ahead of the skill that operationalizes it, so for one minor cycle the principle is documented but unautomated. Mitigation: the prose is detailed enough that an agent can apply the discipline manually following §15; v0.15.x ships the skill that enforces it.
- One more workflow-operational skill to maintain alongside `agentic-ground`, `agentic-tdg`, `agentic-spike`, `agentic-review`. Mitigation: each skill addresses a distinct regime (research / outcome-based / technique-uncertain / fresh-context review / debugging) — the count reflects the diversity of regimes, not duplication.

**Neutral.**
- The five-phase shape leans heavily on Pocock's structure. The kit follows the shape with attribution rather than inventing a different decomposition, because his shape mirrors the canonical sources cleanly and divergence would gain nothing.

## Alternatives considered

- **Fold debugging guidance into existing sections.** Rejected: §10 (Reviewer) is post-implementation discrimination; §11 (Quality Gates) is deterministic prevention; §9 (TDG) and §14 (Spike) are implementation regimes. Debugging is a different regime with its own shape; folding it diluted the host sections without giving debugging the structure it needs.

- **Ship the prose and the skill together in v0.14.** Rejected: v0.14 already ships three new ADRs, a new layer in the artifact stack, and substantial WORKFLOW deltas. Adding a full skill implementation would push the release to a coherence-review-required size.

- **Borrow Pocock's prose verbatim.** Rejected: even though the shape is borrowed with attribution, the prose is rewritten in this kit's voice (matching the rest of WORKFLOW's tone) and trimmed for kit-relevance. Verbatim copy would create a maintenance dependency on his repo's wording.

- **Cite only Kernighan/Pike, skip Popper.** Rejected: Popper's falsifiability framing is what makes Phase 3 ("each hypothesis must state its prediction") non-vague. Without the falsifiability anchor, "ranked hypotheses" collapses to "list some guesses."

## References

- Brian W. Kernighan & Rob Pike, *The Practice of Programming* (1999), chapters on debugging and testing.
- Karl Popper, *The Logic of Scientific Discovery* (1959) — falsifiability as a hypothesis-quality test.
- [`mattpocock/skills` `diagnose/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnose/SKILL.md) — five-phase shape and the Phase-1 framing borrowed with attribution.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill pattern + auto-trigger asymmetry.
- [ADR-0010](0010-agentic-ground-skill.md) — adjacent regime (research before implementation).
- [ADR-0017](0017-agentic-spike-skill.md) — adjacent regime (technique uncertain).
- [ADR-0018](0018-agentic-tdg-skill.md) — adjacent regime (implementation strategy uncertain); skill output discipline this ADR mirrors.
- [`WORKFLOW.md`](../../WORKFLOW.md) §15 — the section this ADR ships into.
- [task-0020](../tasks/0020-mattpocock-absorptions.md) — implementation rollout tracking the deferred skill.
