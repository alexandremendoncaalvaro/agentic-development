# Task `0110`: Run the receipt gates in shadow and read out the flip criterion

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decision 6, shadow run)
**Evidence ref:** doc/research/0042-prism-receipt-gates-shadow-run.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

ADR-0089 ships shadow mode only. Enforcing any check needs a measured
false-block rate against a criterion the owner sets before the run starts,
plus a read of whether the owner's pre-approval checks were preceded by a
would-block event (the RESEARCH-0037 hypothesis).

## Acceptance Criteria

- [x] Before the run: the owner's per-check criterion (minimum labelled events, maximum false-block rate, window) is recorded in these Notes; the evaluation is frozen with `ad-prism` before the first session counts.
- [ ] The gates run in this repository and the company repository for the window; each would-block event is labelled true or false by the owner or a fresh-context reviewer.
- [ ] The read-out reports, per check: events, false-block rate against the criterion, the share of the owner's pre-approval checks that had a preceding would-block event, any session the gate stalled, and the limit that a failed evidence write loses its line (ADR-0089 second addendum), with the count of `unreadable_receipts` seen, read as a lower bound (the gate stops counting once a receipt covers the action).
- [ ] Each check is marked "propose enforcement", "keep in shadow" or "remove", with the evidence; enforcement itself is a later ADR.

## Plan

- [x] Freeze the evaluation (`/ad-prism`) with the owner's criterion.
- [ ] Run, label, read out; record the result in these Notes and in RESEARCH-0037 or its successor.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — criterion set

The owner accepted ADR-0089 and set the flip criterion before any run: per
check, at least 20 labelled would-block events, at most one false block among
them, within at most four weeks; a check short of 20 events stays in shadow.
The owner also approved the plan of Tasks 0107 to 0110.

### 2026-10-07 — labelling inputs from Task 0108

Task 0108's audit found two cases the read-out must label, not count blindly.
`gh pr ready <n>` and `gh pr merge <n>` are compared with the local `HEAD`,
which is that pull request's head only when its branch is checked out; a line
for another pull request does not describe it. A chained command logs the
checks of each landing action in it, so `git push && gh pr create` writes two
gate-run lines for one state; count it once per state.

### 2026-10-07 — labelling inputs, corrected

Corrects the entry above after Task 0108's re-review: a chained command now
runs each check once, against the first landing action that needs it, so
`git push && gh pr create` writes one gate-run line, not two. A third input:
each check reads only the newest 20 receipt files, so a covering receipt with
more than 20 newer ones reads as missing; label such a line false.

### 2026-10-07 — chained pull request actions

From Task 0108's final review: in `gh pr ready && gh pr merge` both checks
are logged once, against `gh pr ready`; no `gh pr merge` line appears. Read a
missing later-action line in a chained command as covered by the first, not
as a gate that did not fire.

### 2026-10-07 — inputs from Task 0109

The shadow window starts after Task 0109 merges: from then on this
repository's `.agentic/gates.json` names `ghp`, so the owner's pull request
and comment commands are seen; before it, they were not. The publish check
covers `gh pr comment`, `gh issue comment`, `gh api` comment calls and the
Slack connector's `slack_send_message` only; a post through another chat
tool, or a `gh` flag form the gate does not parse (`-fbody=...`), leaves no
line, so the read-out cannot count it either way. A `runtime-unavailable`
publish line means the body was not readable before the command ran; label
it separately from would-block.

### 2026-10-07 — more forms the gate does not see

From Task 0109's audit: a publication wrapped in `bash -c "..."`, a command
whose verbs are quoted (`"gh" "pr" "comment"`), and a flag glued to its value
(`-bhi`, `-fbody=x`) leave no line or an unreadable one. Count them neither
way; list them with the other unparsed forms in the read-out.

### 2026-10-07 — evaluation frozen, window open

PRISM-0042 is frozen: SHA-256 `be6aca8e5c4d61a184cf7a8517dbd9b7d71d7459a984c6319efbdb6003fbdcee`
(13,770 bytes; `freeze-artifact.mjs`; `validate-plan.mjs` valid), at
2026-10-07T22:21:42Z. The window runs four weeks from then, to
2026-11-04T22:21:42Z; earlier events are excluded and listed.

Set-up, recorded here because it lives outside the repository: the owner's
`~/.claude/settings.json` sets `AD_SEQUENCE_GATE_EVIDENCE_DIR` to
`~/.agentic/evidence/sequence-gate/` and adds a `PreToolUse` entry (Bash and
the Slack send tool) running `~/.agentic/gates/bl-platform-shadow.mjs`, which
calls the gate pinned at 3671059 (`~/.agentic/gates/3671059/`) for bl-platform
sessions only; nothing is committed to bl-platform. Weekly and at the end,
`~/.agentic/gates/copy-out-0110.sh` copies the evidence, receipts and
transcripts to `~/.agentic/evidence/0110-copies/<time>/` with a SHA256SUMS
file; a baseline copy ran at 2026-10-07T22:21:31Z (1013 files). bl-platform
events enter the decision only once a kit that records receipts is installed
at user scope there; until then the installed published release records none.

Assurance (ad-prism, material evaluation):

- Candidate 1 (`cfc9d82a…`): a fresh-context skeptical review raised three
  Blockers and twelve other findings. Confirmed and corrected: the evidence
  directory, the company repository, the remove rule, the early stop, the
  independent unit, labelling reproducibility, the question codebook, the
  stall source, the claim-rule alignment, the window start, the next gate,
  the design-choice labels and the population limits.
- Candidate 3 (`928f8389…`): a fresh-context verification found twelve of the
  fourteen assessable findings resolved and raised new ones. Confirmed and
  corrected: bl-platform's checks are true by construction until its kit
  records receipts; the decision reads the combined in-decision count; ADR-0089
  decision 6 governs removal below 20 events; weekly copy-out of receipts and
  transcripts; mixed groups labelled false; question-to-state matching; file
  hashes of the wrapper and pinned gate; Codex evidence not collected.
  Rejected with evidence: "the test event did not go through the wrapper" (it
  ran from a bl-platform worktree, head 5ecb134, and the same event from this
  repository wrote nothing).
- Verification verdict: conditional. The final plan validates and is frozen,
  and the corrections trace to the findings; it was not re-reviewed after the
  last corrections.
- Fit-for-purpose verdict: conditional. Fit for this repository's decision;
  bl-platform contributes only after its kit records receipts, and the Slack
  check has no live observation.

Reviewer-run results above are reviewer-reported.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
