# ADR-0050: Handle the conformance/design-intent gap by sharpening rule-anchored reviewers, not by adding a lens

**Status:** accepted
**Date:** 2026-08-06
**Deciders:** Alexandre Alvaro

## Context

`ad-audit` (ADR-0036) fans out **one isolated reviewer per rule-group**; every reviewer walks its group's rules as a checklist and every finding must cite the exact rule. This makes coverage a matrix and is the skill's defining strength. It also makes every lens a **conformance** lens — each answers "does this change obey rule X?".

An audit of a real change surfaced a defect no conformance lens could reach: a mechanism that **obeyed every applicable rule, was described truthfully in its own prose, and passed the audit — yet was structurally unable to produce the data that justified its existence.** The failure is not a broken rule and not a prose-vs-code discrepancy: the code did what it said, and no rule was violated. The gap is between the mechanism and its **stated purpose**. A pure rule-conformance matrix passes this by construction, because no rule expresses "the mechanism must deliver its promise", and the reviewer that would notice has no rule to file it under and no cell in the coverage matrix to hold it.

This is a genuine, generalising blind spot: any flagged, observability, rollout, caching, or migration mechanism can satisfy every rule and still not deliver its stated purpose. The forces pulling on how to close it:

- **The kit already measured the obvious fix and rejected its shape.** ADR-0045 ran a three-arm experiment and concluded that **handoff fidelity is the calibration lever, not added adversarial pressure** — "more reviewers amplify a confident error rather than correcting it". ADR-0046 then listed "extra lenses" among the properties **"deliberately NOT absorbed — rejected per ADR-0045"**. Adding a standalone design-intent reviewer is, verbatim, adding an extra lens. Any decision here must confront ADR-0045 head-on, exactly as ADR-0046 did for the prose-vs-code posture.
- **A design-adequacy lens is structurally exposed to that failure mode.** "Does this mechanism deliver its purpose?" is a judgement with no rule text to cite and no execution to settle it — an un-anchored reviewer, structurally closest to ADR-0045's Control arm, whose 50% inflation ADR-0045 diagnoses as "a reviewer without the spec reviews against an imagined spec". This is an inference from ADR-0045's mechanism, not a result it measured: ADR-0045 varied handoff fidelity, not lens shape, and deliberately left "correlated error across topically-partitioned lenses" un-legislated.
- **The audit's ethos is to distrust prose.** ADR-0046 directs every reviewer to treat the target's own description "as claims to check against the code, never as context to trust". A lens that reads the PR body's stated purpose *as its spec* would have to trust the one artifact every other reviewer is ordered to distrust — incoherent inside a single run, and degenerate when the prose states no purpose or a vague one (a case the decision must handle, not assume away).
- **The evidence is n=1.** One comparison against one external reviewer. ADR-0045 declined a reviewer change on *stronger* (three-arm) evidence; a standing dispatch-contract change on a single observation is weaker still.
- **Binding design intent is already in scope.** Design intent that is real and binding lives in a spec / PRD / ADR / task — and `ad-audit` already carries accepted ADRs (and each binding doc) as groups. The only residual gap is design intent that exists **nowhere but the PR body**.
- **The kit prefers sharpening to adding.** ADR-0007 §6 (anti-category-bloat) and `ad-level-up`'s curation gates both bias toward extending an existing contract over introducing a new unit.

## Decision

We will close the reachable part of the gap by **sharpening the existing rule-anchored reviewers**, and we will **not** add a design-intent lens.

1. **Reject the standalone design-intent reviewer.** No new reviewer is added to `ad-audit`'s fan-out. That shape is the "extra lens" ADR-0046 already recorded as rejected per ADR-0045; it contradicts the coverage-matrix contract (a non-rule, non-file finding has no group and no cell — and per ADR-0036 "groups are defined by the rule-set, not by the skill"); and, being an un-anchored judgement with no rule or spec to cite, it is the shape most exposed to the inflation ADR-0045 diagnosed (a reviewer without a spec reviewing against an imagined one) — an inference from ADR-0045's mechanism, since ADR-0045 measured handoff fidelity, not lens shape.

2. **Add a purpose-not-letter line to the reviewer brief.** In `audit-group-reviewer` (and its dual-host mirror), each reviewer already checking a rule / binding doc against the code will also check whether the code **serves the purpose of that rule or binding doc, not merely its letter** — anchored to that binding artifact. This adds no dispatch unit, no matrix row, and no trusted-prose dependency; it stays entirely inside the rules-anchored responsibility, mirroring how ADR-0046 landed the prose-vs-code posture as a contract line rather than a new voice.

3. **Anchor to binding artifacts only; never to the PR body.** The purpose a reviewer checks against comes from the rule / spec / PRD / ADR / task it is already auditing — never from the target's own description. This preserves the ADR-0046 posture — prose is treated "as claims to check against the code, never as context to trust" — intact.

4. **Record the residual blind spot as explicitly out of scope, not closed.** Design intent that exists *only* in un-binding PR prose — the exact shape of the motivating example — is **not** caught by this decision, because closing it would require the prose-trusting reviewer we reject in (1). We name it here so a formally complete audit does not read as covering it. Its honest remedy is upstream: when a mechanism's purpose matters, it belongs in a spec / ADR (where the sharpened reviewers already reach it), not left in the PR body.

5. **Ship unmeasured, with a revisit/retire trigger.** This change lands on n=1 evidence, so it carries the same discipline ADR-0046 attached to its unmeasured posture: **revisit trigger** — if audits start producing inflated purpose-vs-letter findings (a mechanism flagged as purpose-defeating where the binding docs or code sanction the design), run an arms-style measurement over a labelled range or retire the line. A judgement-shaped line earns a lower inflation tolerance than a factual one.

**Shape check against ADR-0045, confronted explicitly.** Decision (2) adds an instruction line to the reviewer brief — the same surface shape as ADR-0045's Arm 2 (the accepted-trade-off gate), which is the single most relevant data point the kit has: an added reviewer instruction measured 8% inflation against Arm 1's 0%, so it did not help and slightly hurt. We adopt (2) anyway, eyes open, on three differences and one guard: it directs verification at the *purpose of a rule already carried in the handoff* — Arm 1's zero-inflation condition — rather than adding a suppression gate; it never relaxes the evidence bar; it anchors to a binding artifact, not the PR body; and it ships behind the revisit/retire trigger in (5). This is a bet that a purpose-check riding on full handoff fidelity behaves unlike Arm 2's suppression gate — not a claim ADR-0045's data supports it. If measurement later shows it behaving like Arm 2, it retires.

The route is `/ad-adr` (this record); no rule is added, so `/ad-level-up` is not involved. Authoring is dual-host (Claude Code + Codex) per ADR-0034; the brief line is mirrored in both hosts' `audit-group-reviewer` contract.

## Consequences

Positive:

- The reachable slice of the gap closes at the cheapest point: a letter-compliant-but-purpose-defeating change now trips the reviewer that already reads the relevant rule, with no new dispatch unit and no cost on routine reviews.
- The coverage matrix, the rule-set-defines-the-groups invariant (ADR-0036), the evidence bar, and the prose-distrust posture all stay intact — the change is additive to a brief, not structural.
- ADR-0045 is confronted head-on (see the shape check in the Decision), not sidestepped: the kit does not silently re-adopt the extra-lens shape it rejected, and it adopts the adjacent contract-line shape only with the guard that shape's one data point (Arm 2) demands.
- The residual blind spot is on the record, so a "complete" audit no longer implies design-intent was covered — and the remedy is pushed upstream to where intent becomes binding.

Negative / trade-offs:

- The motivating case — purpose stated only in the PR body — is **not** closed by this decision. Anyone expecting the full promise of the rejected standalone-reviewer candidate will find this deliberately narrower.
- The purpose-not-letter line ships unmeasured; it has the surface shape ADR-0045 cautions about and could inflate findings. Mitigated by the revisit/retire trigger and the binding-artifact anchor, not eliminated.
- "Serves the purpose, not just the letter" is a softer instruction than a rule citation; reviewers may apply it unevenly until calibrated. Mitigated: it never relaxes the evidence bar — a purpose finding still needs a grounded artifact or it downgrades.
- If the PR-body-only residual recurs with real frequency, this decision will need reopening — and the only shapes then available are the ones rejected here, so reopening means re-litigating ADR-0045 with new measurement, not a quick patch.

## Alternatives Considered

- **Add a standalone design-intent reviewer to `ad-audit`'s fan-out (the candidate evaluated here)** — rejected. It is the "extra lens" ADR-0046 recorded as rejected per ADR-0045; it is a rule-less, non-executable judgement — the un-anchored shape ADR-0045's mechanism predicts is most inflation-prone (though ADR-0045 measured handoff fidelity, not lens shape); it must trust the PR body while the contract says distrust it (ADR-0046); and it has no home in the coverage matrix (no group, no rule id, no file), violating ADR-0036's "groups are defined by the rule-set, not by the skill". The observation behind it is real; the shape is the one the record already declined.
- **A new rule-group (a "design-intent" group)** — rejected. Groups are the rule-set's own partition (ADR-0036); the skill may not invent or hardcode a group. "The design does not deliver its promise" is not a rule, and forcing it into rule shape is precisely what excludes it.
- **A modifier repeated on every existing group brief, framed as its own axis** — rejected as a *framing*, adopted only as the lean contract line in Decision (2). A per-group reviewer sees only its rule slice and structurally cannot judge whether the *whole* mechanism delivers its purpose; the defensible, in-scope version is "serve the purpose of the rule you already audit", not "assess the whole mechanism's teleology".
- **Make it a mode of `ad-review` (a third axis beside Standards and Spec)** — rejected for now. `ad-review` is deliberately kept light (ADR-0034); a whole-mechanism teleological pass is maximum-gate work, and adding it to the routine review makes every review pay that cost. If the PR-body residual ever justifies a standalone teleological reviewer, `ad-review`'s Spec axis is the more natural host than `ad-audit`, and that is a separate ADR.
- **Adopt the external tool's architecture mode wholesale** — rejected. It is employer-private and unavailable outside its repo; the kit ships generic, dual-host, with no hardcoded content (ADR-0034, ADR-0033). The capability must be re-expressed generically or not at all.
- **Do nothing** — rejected. The blind spot is real and generalising; leaving it wholly unaddressed lets a letter-compliant, purpose-defeating change pass the maximum gate with no friction and no record that the question was never asked.
