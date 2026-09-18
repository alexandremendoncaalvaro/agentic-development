# Task `0077`: Curate the rule candidates surfaced by the harness audits

**Status:** done
**Created:** 2026-09-17
**Scope ref:** doc/tasks/0048-build-skill-evaluation-harness.md — Notes entries "Maximum-gate audit of the block" and "Re-audit of the block after slices 4 and 5"; doc/adr/0037-ad-level-up-rule-curation.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

Two maximum-gate audits of the skill evaluation harness block (Task 0048)
found defect patterns that no current rule prevents, and one advisory rule that
failed on its first application after being stated. `ad-audit` hands such gaps
to `ad-level-up`, which is human-gated and writes nothing without the owner's
approval. Leaving the candidates as bullets inside a task's Notes is the
indefinite deferral Documentation Discipline forbids; this task is the tracked
work item that carries them to a curation session.

## Acceptance Criteria

- [x] An `ad-level-up` session has run over the four candidates below, each accepted into a rule layer, rejected with a stated reason, or reshaped, and the owner has approved every written rule.
- [x] Candidate: the changelog gate watches `package.json`, which npm always publishes, so a shipped script change cannot land without a changelog entry.
- [x] Candidate: `ad-review` persists reviewer verdicts beside the handoffs it already writes, at review time, so a "review found X" claim has a contemporaneous artifact instead of a reconstruction.
- [x] Candidate: a design that exceeds the governing spec lands in its own commit before the commit that implements it, checkable in git history; the advisory form of this rule was stated after slice 2 of Task 0048, honored by slice 4, and missed by slice 5.
- [x] Candidate: every record under `doc/research/`, whatever its genre, carries the layer header and dated sources; the `ad-prism` plan template lacks them today.
- [x] Candidate: a ground record that cites a measurement on a locally installed artifact names the artifact's public release identity and version and gives a reproduction command that runs on the CI platforms' shells, so the evidence does not live only on the author's machine.

## Plan

- [x] Run `/ad-level-up` with the Task 0048 audit trail (`.agentic/reviews/*audit-verdict*.md` and the two Notes entries named in the Scope ref) as the evidence packet.
- [x] For each accepted candidate, record where it lands: the machine store, the project rules layer, a binding document, or a deterministic gate (`lefthook.yml`, `scripts/changelog-gate.js`, a test).
- [x] For the commit-ordering candidate, decide whether it stays a rule for `ad-audit` to check or becomes a deterministic check, and record the reason.
- [x] Close with the fresh-context review and the local gate if any gate or script changed.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-17

Registered from the re-audit of Task 0048 at commit `7a79db7`. The ADR-0070
reviewer asked that the commit-ordering rule, which failed once immediately
after being stated, move from an unwritten candidate to a tracked follow-up so
a third occurrence is not handled as prose again. The four candidates are
listed as acceptance criteria so the owner can see the whole set in one place;
none is written into any rule layer until the curation session approves it.

### 2026-09-18

The re-audit of Task 0048 after slice 6 reinforced the second candidate: slice
6 had no verdict file at all, only the review handoffs, and its Notes stated
the rounds as fact; the six outputs were persisted after the fact from the
session transcript. A fifth candidate joins from the same audit: GROUND-0025
A7 cited a measurement reachable only through a machine-local path and a
`grep` count that BSD `grep` rejects.

### 2026-09-18 — Curation session and closure

The `ad-level-up` session ran over the five candidates with three adversarial
lenses (already-covered, coherence and necessity, placement), one fresh
reviewer each, verdicts persisted at review time in
`.agentic/reviews/20260918T151616Z-levelup-task0077-verdicts.md`. Dispositions,
each approved by the owner on 2026-09-18:

- Design in its own commit before the code: accepted into the machine store
  as rule `CV.7` of the claims-verification group, the only rule written. The
  lenses agreed on the group (the claim "recorded before the work" is
  verifiable only through commit ancestry) and corrected the recurrence count
  to two misses (slices 2 and 5) and two holds (slices 4 and 6); the rule was
  stated twice as prose before it held. It stays a rule for `ad-audit` to
  check rather than a deterministic gate, because the ordering is a property
  of history that a hook cannot see at commit time.
- Changelog gate watching `package.json`: routed to a deterministic gate with
  an amendment to ADR-0048, not a rule line; the lenses noted the recurrence
  was overstated (the alias was refuted as a consumer-visible defect) and the
  change stands on the deliberate-decision horn alone.
- `ad-review` persisting verdicts: routed to a skill-contract change on both
  hosts; CV.5 already states the principle, and a rule line would restate it
  without closing the gap.
- `doc/research/` header and dated sources: rejected as a rule, already
  bound by WORKFLOW.md §2 rule 2 and ADR-0008; routed to an `ad-prism`
  template.
- Measurement on a locally installed artifact: rejected as a rule. The
  lenses split two to one for merging into CV.5; the meta-judgment took the
  rejection because CV.5 unamended is what caught GROUND-0025 A7 and the cost
  gate weighs against lengthening the longest rule for a case it already
  covers. The remedy shape becomes template guidance in `ad-ground`.

The three routed items and the template note are tracked as
`doc/tasks/0078-land-the-routed-candidates-from-the-harness-audits.md`, to
land after the harness pull request merges. No gate or script changed in this
task, so the closing review and gate item is met by the fresh-context lenses
themselves and by the unchanged local gate. The task closes.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
