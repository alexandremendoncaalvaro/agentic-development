# ADR-0046: ad-audit gains a file-coverage axis, a severity scale, and the prose-vs-code posture

**Status:** proposed
**Date:** 2026-08-05
**Deciders:** Alexandre Alvaro

## Context

An evaluation of an external pre-merge review system (a colleague's PR-review agent prompt, assessed during a review-tooling consolidation on a work repo — deliberately not identified or excerpted here, employer-private source, so its characterization is recorded testimony rather than a checkable reference) surfaced three properties `ad-audit` lacked:

1. **Per-file coverage accounting.** `ad-audit` proves every *rule* was checked (the coverage matrix, ADR-0036) but nothing proves every *changed file* was read. On a large PR a file no reviewer opened can sail through a formally "complete" audit.
2. **A severity scale.** Findings surface as blockers vs everything else; a reader cannot triage `major logic error` from `nit` without re-reading each finding. The external system's Critical/Major/Minor/Nit scale is the industry-standard shape.
3. **An explicit prose-vs-code posture.** PR descriptions, commit messages, and comments describe *intent*, not *reality* — increasingly likely to be well-written and wrong now that most PR prose is generated. The kit's contracts said "ground on the actual code/output; never assume" (and the machine-store CV group's rules make a code comment non-evidence), but no line directed the reviewer at the *target's own metadata* as claims to verify. On a PR whose body argues its own case at length, that gap is where an audit fails first.

The same evaluation proposed absorbing more of the external system — additional review lenses, a sequential file-by-file walk with human stops, and a posted-verdict endpoint. **ADR-0045 rules those out:** its three-arm measurement showed reviewer-handoff fidelity, not added adversarial pressure, is the calibration lever, and more reviewers amplify a confident error rather than correcting it. `ad-audit`'s parallel-isolated shape and never-approve verdict are deliberate; a severity scale and coverage axes change what is *reported*, not how much pressure is applied.

## Decision

Three additions to `ad-audit`, mirrored on both hosts (`src/skills/claude-code/`, `src/skills/codex/`) and in the `audit-group-reviewer` briefs:

1. **File-coverage axis.** Diff/branch/PR targets enumerate their changed files at target resolution (Step 0 on Claude Code; Step 1 on Codex, whose Step 0 is the announce banner). Bulk assets are bucketable as a named class, but a bucket clears N/A only after a spot-check of representative samples — never on the class label alone. Each group reviewer reports a `Files grounded:` line — the files it actually opened. Aggregation checks two axes: every group accounted for, AND every changed file grounded by at least one reviewer or explicitly N/A-with-reason. A gap on either axis makes the audit INCOMPLETE.
2. **Severity scale.** Violations and judgement-calls carry `critical | major | minor | nit` (critical = correctness/security/data-loss or an evidence-gate blocker; major = logic error / broken contract / real coverage gap; minor = suboptimal, low risk; nit = style). Severity ranks confirmed findings for triage; it never relaxes the evidence bar.
3. **Prose-vs-code posture ("the diff is what ships").** The audit-handoff instruction block and the reviewer briefs direct the reviewer to treat the target's prose — PR description, commit messages, comments, doc claims — as claims to check against the code, never as context to trust; a prose-vs-code discrepancy is itself a finding. This generalises the CV group's "a code comment is not evidence" to the whole metadata surface, applied at the reviewer contract level where ADR-0045 showed calibration actually lives.

**Shape check against ADR-0045, confronted explicitly:** as a standing addition to every reviewer's contract, this posture has the same *surface shape* as the accepted-trade-off gate ADR-0045 measured and rejected. It differs in function — it directs verification at an artifact class (the target's metadata); it does not modify verdicts or suppress findings — but it ships unmeasured, and ADR-0045's lesson binds regardless of how reasonable an instruction sounds. Revisit trigger: if audits start producing inflated prose-discrepancy findings (a discrepancy reported where the binding docs or the code sanction the prose), run an arms-style measurement over a labelled range or retire the line.

## Consequences

Positive:

- Coverage becomes two-dimensional: a formally complete rule matrix can no longer hide an unread file.
- Reports triage themselves; the reader starts at `critical` instead of wading.
- The reviewer's skepticism now explicitly covers the one artifact every PR carries and every author writes to persuade: its own description.

Negative / trade-offs:

- `Files grounded` lines add tokens per reviewer and an aggregation step; on many-file targets the >50-file narrow-scope guard (now present on both hosts — the Codex flavor lacked it before this change) remains the pressure valve.
- Severity judgements are the aggregator's; mis-ranking is possible. Mitigated: severity never gates evidence — a mis-ranked finding is still a finding.
- The external system's remaining properties (sequential walk, human stops per file, posted verdict, extra lenses) are deliberately NOT absorbed — rejected per ADR-0045; a postable-review delivery step, if ever wanted, is a separate thin skill consuming audit findings, not a change to the audit.

## Alternatives Considered

- **Absorb the external system wholesale as a new skill** — rejected. Its execution model (sequential, stop-per-file, emits Approve/Request-Changes) contradicts `ad-audit`'s parallel-isolated, never-approve design; running both as gates doubles cost for correlated coverage.
- **Per-file reviewer dispatch (one reviewer per file, not per group)** — rejected. Groups are the rule-set's own partition (ADR-0036); file-partitioned review loses the rule-checklist guarantee that makes coverage a matrix.
- **Severity as a gate (e.g. "minor findings don't block")** — rejected. The evidence bar is the gate; severity is presentation. Coupling them invites negotiating findings down instead of resolving them.
- **Prose-vs-code as a new machine-store rule instead of a contract line** — rejected for placement, not content. The CV rules already carry the principle for claims; the reviewer contract is where ADR-0045 located calibration, and duplicating it as a rule would double-report every discrepancy.
