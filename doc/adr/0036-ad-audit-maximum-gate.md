# ADR-0036: `ad-audit` — the maximum-gate rules-anchored audit

**Status:** accepted
**Date:** 2026-07-27
**Deciders:** Alexandre Alvaro

## Context

[ADR-0034](0034-audit-tier-skills-over-fold.md) decided to build a maximum-gate, rules-anchored adversarial audit as a new skill (`ad-audit`) rather than fold it into the light `ad-review`. This ADR specifies how it works. Two review qualities that `ad-review` does not provide are the target:

- **Auditable coverage.** A review that reports findings only cannot prove every binding rule was actually checked — a silent gap looks identical to "all clear". The maximum gate must emit an explicit verdict for *every* rule in scope.
- **Second-model hardening where it matters most.** A single model's blind spot is most costly on the rules a project marks critical. Those deserve an independent second opinion from a different model.

The skill must hardcode **no rule content** (the kit is public and generic) and must be **dual-host** (Claude Code + Codex). It reads its rule-set from the location convention in [ADR-0035](0035-rules-location-convention.md).

The mechanism generalizes established inspection research, cited generically (not as house practice): perspective-based reading decomposes-then-unions and a mechanical partition beats persona assignment ([Basili et al., PBR](https://www.cs.umd.edu/~mvz/handouts/emp_pbr.pdf); [Regnell, Runeson, Thelin](https://ieeexplore.ieee.org/document/1166934/)); isolate-then-meta-judge beats debate among reviewers ([Judging with Many Minds](https://arxiv.org/pdf/2505.19477)); consensus is a false-positive filter, not a defect finder ([Johnson, Tjahjono](https://link.springer.com/article/10.1023/A:1009787822215)); order effects need swap-and-agree ([Zheng et al., MT-Bench](https://arxiv.org/abs/2306.05685)).

## Decision

We will ship `ad-audit` as a workflow-operational skill. It introduces no new numbered `WORKFLOW.md` practice: it realizes the existing §10 practice (reviewer with fresh, adversarial context) at maximum rigor — exhaustive, rules-anchored, evidence-gated — the same §10 lineage `ad-review` implements lightly, extended with the grounding of §5 and the gate posture of §11. Its contract:

1. **Target + tree.** State what is under review (a diff / branch / PR, or drafted claims and artifacts about to be posted) and which tree/SHA it rests on. The tree is part of every claim.
2. **Enumerate all rule-groups; dispatch or record N/A.** Read the rule-set (repo binding docs plus the optional curated store, per ADR-0035). Its groups are defined by the rule-set, not by the skill. Enumerate every group: **dispatch** an isolated fresh-context reviewer for each group the target touches; **record an explicit N/A with a one-line reason** for every group it does not — none silently omitted. Coverage is the point.
3. **Reviewer contract (per group, isolated, parallel).** Each reviewer receives the target, the tree/SHA, the rule-set, and its one group — with no shared history. It must: take a refuting posture (assume wrong until the code/output proves otherwise); ground on the actual code and observed output, never assume; walk its group's rules as a checklist and give **every** rule an explicit verdict — `pass` / `violation` / `judgement-call` / `n-a`; cite the exact rule for any flag; state, per finding, the concrete failure scenario and the specific evidence artifact missing or contradicting the claim; and re-read its group before finalizing (the single upfront read decays as output grows). Hard gate: any teammate-visible claim backed only by code-reading or inference — no run or observed artifact — is a BLOCKER.
4. **Harden CRITICAL groups.** Groups the rule-set marks critical (a tag the consuming rule-set declares — never hardcoded) get a second pass under a **different model**, realized natively via the kit's **dual-host split** (Claude flavor ⇄ Codex flavor). The honest ceiling is noted: within one harness the model override is intra-family and only partially decorrelates blind spots; true cross-vendor diversity is stronger and is adopted the moment the host can route it. Add swap-and-agree (reorder the rules and the presentation order between runs; a `pass` counts only if it holds both ways) and a refute pass over surviving findings.
5. **Aggregate — union, then filter.** Coverage lives in the union of the independent reviewers: never drop a lone finding for lack of a second voice. Adjudicate as an independent meta-judge (reviewers never debate or see each other's reasoning); confirm real findings against the code/output, reject wrong ones with evidence. Then the coverage check: every group is accounted for by verdicts or an explicit N/A, or the audit is incomplete.
6. **Verdict.** Never emit "approve". List each blocker with the artifact it needs; state everything unverified as an open question.
7. **Close the loop.** A defect pattern no rule covers, or a rule that misled, is handed to `ad-level-up` as a candidate.

Output: one line per rule verdict, a coverage matrix accounting for every group, blockers grouped on top, the open-question list, and any proposed rule delta.

**Dual-host realization.** Claude Code fans out parallel `Task` sub-agents (one per group) and runs the CRITICAL second pass under a different model via the `Task` model override or the Codex flavor. Codex has no skill-spawned subagent primitive (per ADR-0007 Addendum 2026-05-24): its variant runs the groups in a single session with structural per-group separation, persists the audit trail, and offers the isolated-reviewer and cross-model passes as **user-initiated** subagent escalations against that trail. Both variants keep the union-then-filter aggregation and the never-approve verdict.

**Profile scope.** `team` and `mature` only — the maximum gate is premature for `poc` and `solo` (mirrors `ad-deepen`, [ADR-0020](0020-deep-modules-vocabulary.md) §4).

## Consequences

Positive:

- Reviews become auditable: a coverage matrix proves every rule was checked, not just the ones that failed.
- The rules a project marks critical get second-model hardening, where a single model's blind spot is most costly.
- Generic and reusable: any project pointing `ad-audit` at its own rule-set (ADR-0035) gets the maximum gate; the skill hardcodes nothing.
- Feeds its own improvement loop: gaps route to `ad-level-up`.

Negative / trade-offs:

- Slower and more expensive than `ad-review` — it is the maximum gate, invoked deliberately, not the routine path.
- The cross-model pass is intra-family within one harness; the stronger cross-vendor guarantee waits on host routing. Disclosed, not hidden.
- The critical-tag and group taxonomy must be defined by the consuming rule-set; a repo with only base-layer docs and no critical tags gets coverage without the second-model hardening.
- The Codex variant's isolation and cross-model passes are user-initiated, not automatic — a fidelity gap inherited from the host, same as `ad-review`.

## Alternatives Considered

* **Fold into `ad-review`** — rejected in [ADR-0034](0034-audit-tier-skills-over-fold.md); it would overload a light routine review with a heavier mode and a different input.
* **No exhaustive coverage (report findings only)** — rejected. A silent coverage gap is indistinguishable from "all clear"; the coverage matrix is the point of the maximum gate.
* **No cross-model pass** — rejected. Single-model consensus does not cancel correlated blind spots, most costly on the critical rules.
* **Persona-based reviewers (one reviewer, many hats)** — rejected. A mechanical partition (one isolated reviewer per group) beats persona assignment and prevents cross-contamination.
* **Let reviewers debate to consensus** — rejected. Shared-history debate amplifies bias; isolate-then-meta-judge, with consensus used only as a false-positive filter, is the grounded design.
