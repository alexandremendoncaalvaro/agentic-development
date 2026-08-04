# ADR-0045: Adversarial review is calibrated by handoff fidelity, not by adversarial framing

**Status:** accepted
**Date:** 2026-08-03
**Deciders:** Alexandre Alvaro

## Context

A pre-publish review of the `0.18.0-beta.1` range was run as an ad-hoc adversarial fan-out: six hand-written subagent prompts partitioned by domain, dispatched straight at `fresh-context-reviewer` without going through `/ad-review`. Manual revalidation of all sixteen findings against the design intent showed **eight were inflated** — behaviours the binding ADRs explicitly accept as trade-offs, reported as `Blocker`.

That raised a question the kit could not answer from posture alone: is the existing handoff rule sufficient, or does an adversarial reviewer also need an explicit instruction on what to do when the spec already sanctions the behaviour it is about to flag? The question mattered beyond one release — the kit ships adversarial review as its §10 gate, and a gate whose findings are half noise trains its users to ignore it.

### External grounding

A four-source research pass (`/ad-ground`) established what the literature supports:

* **[LLM Critics Help Catch LLM Bugs](https://arxiv.org/abs/2407.00215)** (OpenAI, arXiv:2407.00215) — model critiques are preferred to human ones in 63% of cases and catch more bugs than paid reviewers, but the paper names the cost directly: *"hallucinated bugs that could mislead humans into making mistakes they might have otherwise avoided"*. The finding that matters here is that **human-machine teams catch a similar number of bugs while hallucinating less than the critic alone** — precision comes from a verification step, not from a more aggressive critic.
* **[Are LLMs Reliable Code Reviewers? Systematic Overcorrection](https://arxiv.org/html/2603.00539v1)** (arXiv:2603.00539) — false-negative rate rises with prompt elaboration: GPT-4o on MBPP goes 35.9% (judgment only) → 74.1% (+explanation) → 87.9% (+explanation and proposed fix); Claude-4.5-sonnet reaches 62.3% at the elaborate end. The validated mitigation is a differential **execution** filter, not a prompt instruction.
* **[Bias in the Loop](https://arxiv.org/html/2604.16790v1)** (arXiv:2604.16790) — twelve biases measured for LLM judging on software-engineering tasks. Cited for the problem only: the paper explicitly does not validate mitigations.
* **[The Confident Liar](https://arxiv.org/pdf/2606.10296)** (arXiv:2606.10296) — multi-agent debate converges on wrong answers when one participant is confidently wrong, so adding reviewers does not itself correct the failure.

Preprints carry the usual caveat: four of these are 2026 arXiv submissions without peer review, and the overcorrection paper carries the most weight in this decision.

### Local measurement

Rather than adopt a rule on the literature alone, three arms were run over the same fixed range (`v0.17.9-beta.1..v0.18.0-beta.1`, 24 commits) against a human-labelled golden set built by manually revalidating every finding of the ad-hoc pass:

| Arm | Handoff | Findings | Inflated | Rate |
|-----|---------|----------|----------|------|
| Control — ad-hoc, six domain lenses | no ADRs | 16 | 8 | **50%** |
| Arm 1 — canonical `/ad-review` | accepted ADRs in the handoff | 7 | 0 | **0%** |
| Arm 2 — Arm 1 plus an accepted-trade-off gate | ADRs + gate | 13 | 1 | **8%** |

## Decision

**Handoff fidelity is the calibration lever. No new reviewer rule is adopted.**

Arm 1 reached zero inflation *without* any additional instruction, using only what [`ad-review`](../../src/skills/claude-code/ad-review/SKILL.md) already mandates: every accepted ADR whose subject the diff touches, carried in the handoff. Arm 2 added an explicit accepted-trade-off gate and did not improve on it — it produced one inflated finding Arm 1 did not have. The candidate rule is **rejected**: the failure it was written for was process non-compliance, not a rule gap.

Three consequences follow and are binding:

1. **Adversarial review runs through `/ad-review`, not through hand-written subagent prompts.** The handoff contract is the calibration; bypassing it removes it.
2. **Adding adversarial pressure is not a remedy for noisy findings.** Both the measurement and *The Confident Liar* point the same way — more reviewers amplify a confident error rather than correcting it.
3. **A reviewer's finding is re-verified before it is acted on.** The literature's validated mitigation is a differential execution check, and in practice reproduction is what separated real findings from inflated ones throughout this work.

## Consequences

Positive:

* The kit's §10 gate has a measured calibration rather than an assumed one, on this repo's own corpus.
* Two rules that *did* clear the evidence bar landed through `/ad-level-up` and are recorded separately: the enumeration-evidence bar in `ad-philosophy`, and `WORKFLOW.md` §2 rule 13 on citing ranges by tag.
* A reviewer proposing a fix is now expected to have its own proposal tested — a `git cherry` heuristic for detecting squash-merged branches was proposed during this work, tested, and rejected because it does not work.

Negative / trade-offs:

* **Single-repo, single-range measurement.** Three arms over one 24-commit range on one codebase. The direction is clear and the effect large, but the numbers are not a benchmark and should not be quoted as one.
* **The golden set was labelled by the same agent that produced the control arm.** Independent reviewers later overturned one label (the `rules/` case-sensitivity finding moved from inflated to real) and surfaced four defects the control missed entirely, so the labelling was demonstrably imperfect in both directions.
* **The rejected gate was not worthless.** Its `Gated:` count made a reviewer's suppression reasoning auditable, citing the accepting line per suppressed candidate. It did not reduce inflation, so it is not adopted, but the audit-trail property is recorded here in case a future pass wants it for a different reason.
* Observations that did not clear the evidence bar are deliberately not legislated: cross-axis severity inconsistency within a single arm, correlated error across topically-partitioned lenses, and the untested hypothesis that a two-stage verdict-then-explain reviewer would beat the current shape.

## Alternatives Considered

* **Adopt the accepted-trade-off gate** (instruct the reviewer to downgrade a finding to `Note` when a binding doc already names the behaviour) — rejected by measurement. It did not beat handoff fidelity alone and introduced an inflated finding of its own.
* **Restructure review lenses as structurally distinct cognitive frames** rather than domain partitions, per [ReDNA](https://arxiv.org/html/2605.28465) and the ADHD parallel-ideation method — rejected as unsupported for this task. The evidence is a self-published six-problem evaluation and a benchmark on interactive tool-use, neither on code review; the control's correlated errors are consistent with the hypothesis but do not test it.
* **Split the reviewer into verdict-first, explain-only-survivors stages**, extrapolating from arXiv:2603.00539's elaboration curve — rejected as unsupported. That paper compared output *formats*, not a staged pipeline; adopting it would have been inference presented as evidence.
* **Do nothing and treat the inflation as reviewer temperament** — rejected. The 50%-to-0% gap between arms is too large to attribute to variance, and the mechanism (a reviewer without the spec reviews against an imagined spec) is directly observable in the control's findings.
