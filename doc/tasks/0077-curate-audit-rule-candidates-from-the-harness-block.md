# Task `0077`: Curate the rule candidates surfaced by the harness audits

**Status:** proposed
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

- [ ] An `ad-level-up` session has run over the four candidates below, each accepted into a rule layer, rejected with a stated reason, or reshaped, and the owner has approved every written rule.
- [ ] Candidate: the changelog gate watches `package.json`, which npm always publishes, so a shipped script change cannot land without a changelog entry.
- [ ] Candidate: `ad-review` persists reviewer verdicts beside the handoffs it already writes, at review time, so a "review found X" claim has a contemporaneous artifact instead of a reconstruction.
- [ ] Candidate: a design that exceeds the governing spec lands in its own commit before the commit that implements it, checkable in git history; the advisory form of this rule was stated after slice 2 of Task 0048, honored by slice 4, and missed by slice 5.
- [ ] Candidate: every record under `doc/research/`, whatever its genre, carries the layer header and dated sources; the `ad-prism` plan template lacks them today.

## Plan

- [ ] Run `/ad-level-up` with the Task 0048 audit trail (`.agentic/reviews/*audit-verdict*.md` and the two Notes entries named in the Scope ref) as the evidence packet.
- [ ] For each accepted candidate, record where it lands: the machine store, the project rules layer, a binding document, or a deterministic gate (`lefthook.yml`, `scripts/changelog-gate.js`, a test).
- [ ] For the commit-ordering candidate, decide whether it stays a rule for `ad-audit` to check or becomes a deterministic check, and record the reason.
- [ ] Close with the fresh-context review and the local gate if any gate or script changed.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-17

Registered from the re-audit of Task 0048 at commit `7a79db7`. The ADR-0070
reviewer asked that the commit-ordering rule, which failed once immediately
after being stated, move from an unwritten candidate to a tracked follow-up so
a third occurrence is not handled as prose again. The four candidates are
listed as acceptance criteria so the owner can see the whole set in one place;
none is written into any rule layer until the curation session approves it.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
