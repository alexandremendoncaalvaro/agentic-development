# Task 0034: Give append-only layers a state projection and the agent a read contract

**Status:** done
**Created:** 2026-08-06
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

Learning which decisions still bind cost a full pass over `doc/adr/`. Measured here: all 25 ADRs read `Status: accepted`, three of them have one named part retired, and only one of those three declares it in a place a header scan can see. The status field is whole-document; supersession in practice has been per stanza.

The mechanism was our own rule. `WORKFLOW.md` §2 rule 10 gave each layer its directory as the index and forbade any other document from digesting it, and the corollary in `ad-philosophy` read "filesystem listing is the index" — which carries names, not state. The projection had no legal home, so it appeared in four illegal or invisible ones: three ad-hoc per-record notations, and a hand-maintained `(all accepted)` claim in `AGENTS.md`.

Two assumptions were under test and one was refuted. Refuted: that the kit needed a *new* declaration of artifact nature — rule 9 already names definition / decision-record / tracking, which is the same distinction. What was missing was the obligation the nature implies. Held: that a written read contract can bound how much an agent loads before acting, and that the pair-of-fields shape makes the amendment relation checkable without semantic judgement.

Decision record: [ADR-0049](../adr/0049-append-only-layers-own-a-state-projection.md).

## Acceptance Criteria

- [x] `WORKFLOW.md` §1 states a three-rung read contract, and `ad-philosophy` delivers it on both hosts
- [x] Rule 10 permits one state projection per append-only layer, inside that layer's own directory, and still forbids a projection that only lists records
- [x] The ADR template and `ad-adr` carry both amendment fields on both hosts, and `ad-adr` records the bounded exception that lets it write the second side
- [x] `doc/adr/PROJECTION.md` exists and names the three partial retirements; `AGENTS.md` no longer digests the ADR index
- [x] `ad-drift` gains the amendment-pair check and the projection-contradiction check on both hosts, and treats a missing projection as not-a-finding
- [x] Consumers receive the constitution they are told to read: `init` and `update` write `WORKFLOW.md` and `WORKFLOW-FLOWS.md` to the target root
- [x] `ad-philosophy` delivers all thirteen Documentation Discipline rules the constitution declares
- [x] Suite green, and every new test demonstrated red on the failure it claims to catch
- [x] Fresh-context review, two axes, over the whole change — 6 blockers and 10 concerns, all accepted, 15 fixed and 1 deferred
- [x] Landed with DCO sign-off — one commit, not the four originally planned; see Notes

## Plan

- [x] Reproduce the ADR finding before trusting it; correct the count and the diagnosis
- [x] Read contract first — cheapest, and it needs no other change to be useful
- [x] Close the dangling-citation gap the read contract exposed (`WORKFLOW.md` absent from every consumer root)
- [x] Rule 10 carve-out, template fields, `ad-adr` behaviour, first projection, `AGENTS.md` cleanup
- [x] Drift checks, measured against every repository on the machine that has an ADR layer
- [x] Deliver the orphan Documentation Discipline rule and pin the count parity by test
- [ ] `/ad-review`, then `/ad-commit`

## Notes

### 2026-08-06

The handoff's version of the finding was wrong in a way that made the case stronger. It reported seven ADRs contradicting the `all accepted` claim; three of the seven are keyword false positives — one supersedes a pre-ADR implementation, one discusses the vocabulary, one states it augments rather than supersedes. The real count is three relations across four records, and `Status: accepted` is correct in all three. The disease is not a lying status field; it is a rule that left the projection homeless.

Applying the projection found what nobody had written, for the fourth time in this investigation: `WORKFLOW.md` declared thirteen Documentation Discipline rules authoritative while `ad-philosophy` claimed eleven and listed eleven, and one of the two missing rules had no delivery anywhere in the kit. Nothing read both sides. Now a test does.

Measured the amendment-pair check across the three repositories on this machine that carry an ADR layer (2, 39, and 25 records). It returned zero false positives and zero findings in the two that have not adopted the fields, against one to ten hits per layer for a keyword sweep. Honest reading: the check guards the new convention, it does not retro-detect the old disease. `ad-drift` now states that limit and suggests adoption once instead of enumerating a noisy sweep.

Caught the projection going stale inside the same session that created it — it claimed 24 records while the directory held 25, because the ADR introducing the projection was missing from its own total. The count is now pinned by test; the rest of the page needs a human.

Deliberately not done: making a projection mandatory past a record threshold. The threshold would be a guess. ADR-0049 Decision 4 carries the revisit trigger.

Two-axis fresh-context review found six blockers and ten concerns. Every one held up; none was rejected. Three mattered:

The installer destroyed data. `installKitDocs` copied unconditionally, so a target that had edited its `WORKFLOW.md` lost the edit on the next `update`, reported as a benign `~`. "Kit-owned" settles who authors the content and was treated as if it settled whether an installer may delete a user's work — it does not, and AGENTS.md already stated the opposite as a contract. Divergence is now reported and skipped, `--force` replaces, both reproduced end to end.

ADR-0049 amends ADR-0030 and did not declare the pair the same ADR was introducing. Both reviewers found it independently. The convention failed on the first change that created it, and neither new gate could see it, because both only fire once one side declares a field. Fixed in both records and added to the projection as a fourth row.

The `ad-drift` pair check, as written in prose, compared *file lists* — which are disjoint by design, since the halves of a relation live in different records. It would have reported the one correct pair in this repo as broken: the exact false-positive class the check claims to remove. The test did it right; the skill text did not.

The review's one deferred item is closed: the two tests guarding defects fixed here now carry the `regression: <ref> <description>` naming GUIDELINES §9.5 requires.

Landed as one commit rather than the four planned. Three files carry more than one concern inside a single hunk, and the environment has no interactive hunk staging, so a per-concern split needed sub-hunk surgery in each. The split was also weaker than it looked: the read contract, the projection, and the constitution install are one decision (ADR-0049 Decision 5 records why), so the intermediate commits would not have stood alone.

Cost this task nearly paid: for most of the session, git in this repository resolved to a different worktree, because `core.worktree` was set in the *shared* config pointing at a sibling worktree another session had created. Every `git diff` and `git status` returned that session's changes while the files on disk held this one's. It was caught only because a file list did not match what had been edited — the review handoff was one step from being built from the wrong diff entirely. The stray key was removed after confirming each linked worktree resolves through its own `.git` file and per-worktree config, so none depended on it. Worth knowing: in a repo with several agent worktrees, `git rev-parse --show-toplevel` is the cheap check that the tree you are reading is the tree git is writing.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass — 376, from a 367 baseline
- [x] Code review completed — two-axis fresh-context, both axes
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
