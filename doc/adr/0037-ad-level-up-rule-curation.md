# ADR-0037: `ad-level-up` — human-gated rule-set curation

**Status:** proposed
**Date:** 2026-07-27
**Deciders:** Alexandre Alvaro

## Context

`ad-audit` ([ADR-0036](0036-ad-audit-maximum-gate.md)) closes its loop by handing a surfaced rule gap — a defect pattern no rule covers, or a rule that misled — to a curation skill. Nothing yet owns that. And the rule-set ([ADR-0035](0035-rules-location-convention.md)) must evolve, but evolve **without bloating**: every extra rule lowers adherence to all the others (instruction-following decay), so a rule that re-prevents one rare, cheaply-caught slip is a net negative.

Two forces make unsupervised curation dangerous:

- **Overfitting.** A single accidental slip is not a rule; a rule earns its place only if it recurs (or is a deliberate standardisation), generalises to a class of future work, targets a load-bearing root cause, and is worth its cost against every reader carrying it forever.
- **Bad writes under a full or drifting context.** The moment most likely to produce a bad edit to the rules is exactly when the agent's context is full or off. Writing to the rule-set unsupervised at that moment is the failure mode to prevent.

## Decision

We will ship `ad-level-up` as a workflow-operational skill — the companion that evolves the rule-set `ad-audit` audits against. It holds the `Edit` capability but is bound by a **hard human-approval gate**: it never writes without explicit approval, one item at a time. The approval gate is enforced by this contract, not by tool permissions.

Its contract:

1. **State candidate + evidence.** One sentence plus the citation (finding / PR / transcript / `file:line`). If it cannot be cited, stop — not grounded.
2. **Trace to root cause.** Attach the rule to where the defect was seeded (an investigation / grounding / verification gap), not the surface symptom.
3. **Four anti-overfitting gates** — all must pass, or reject out loud: (a) **recurrence or deliberate decision**; (b) **generalisation** (helps a class of future work, not just this scenario); (c) **load-bearing root cause** (an upstream cause that cascaded, not a leaf symptom); (d) **proportionate cost** (earns its keep against every reader forever and against adherence decay).
4. **Effectiveness pass.** Classify the change — improvement / correction / increment / **merge into an existing rule** / **extend an existing rule** / **reject** (prefer sharpening/merging/extending over adding). Check redundancy (does an existing rule already watch this?), check real-behaviour (a defect actually observed, cited — not hypothetical), and run a dead-rule sweep (flag a subsumed rule for retirement).
5. **Deterministic placement.** Assign the rule to the group whose grounding-target it matches; keep the group set minimal (a new group only when a defect class is uncovered by every existing group; split a group only when its rule count grows too large); give it the next stable id.
6. **Draft the minimal edit.** Read the rule files first (the edit needs a prior read; voice-matching needs the current text). One rule, lean.
7. **Adversarial multi-lens review of the candidate** — fan out fresh-context reviewers, each trying to refute it against the actual current rule files: (a) already-covered (cite the covering rule), (b) coherence + necessity (does it hold; is it the minimal change), (c) placement. The review filters and reclassifies (survive-as-add / merge / reject); it never writes.
8. **Report + gate.** Present the exact delta, the gate table, the adversarial-review verdicts, a plain-language rationale, and a "considered but rejected as overfitting" list. **Apply only on the user's explicit approval, one item at a time.**

Writes land in the curated rule-set at the ADR-0035 location. Generic, dual-host; hardcodes no rule content. For a decision bigger than a rule line, it routes to `ad-adr` / `ad-guidelines` instead.

## Consequences

Positive:

- The rule-set evolves under discipline: anti-overfitting gates keep it lean, and the adversarial review catches already-covered or incoherent candidates before they reach the human.
- The hard human gate makes an unsupervised bad write to the rules structurally hard — the skill presents, the human decides, one item at a time.
- Completes the audit loop: `ad-audit` surfaces gaps, `ad-level-up` curates them.

Negative / trade-offs:

- The `Edit` capability is held but gated only by the skill contract, not by tool permissions — the contract must assert the gate loudly and repeatedly, because a drifting context is exactly the risk. This is the one place the design leans on prose discipline over a hard mechanism; the mitigation is the never-write-unprompted rule stated as the prime directive.
- Requires the curated machine rule-set (ADR-0035); with only repo binding docs and no writable curated store, curation targets are limited (the skill says so rather than inventing a location).
- One more skill on the surface; ADR-0007 §6 scrutiny is met by this ADR and Task 0004.

## Alternatives Considered

* **Fold curation into `ad-audit`** — rejected. Auditing is read-only discrimination; curation is a write operation behind a human gate. Combining them puts a write capability inside the maximum-gate audit, muddying a skill whose whole value is that it changes nothing.
* **Auto-apply surfaced rule candidates without a human gate** — rejected. A full or drifting context is exactly when a bad write to the rules slips in; the human gate is the point, not an inconvenience.
* **No anti-overfitting gates (accept every candidate)** — rejected. Rule-set bloat lowers adherence to every rule; ungated growth makes the rule-set worse, not better.
* **Do nothing (leave `ad-audit`'s loop open)** — rejected. `ad-audit` would surface gaps with nowhere disciplined to route them, and the rule-set would drift by ad-hoc edits.
