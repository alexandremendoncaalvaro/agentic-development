# Task `0031`: Close the `++ ` diff-header bypass in the leak-guard content scan

**Status:** done
**Created:** 2026-07-31
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[`src/leak-guard.js`](../../src/leak-guard.js) `extractAddedLines` walks `git diff --cached` output and treats any line starting with `+++ ` as a file header, binding `currentPath` for the added lines that follow. A **content** line whose own text begins with `++ ` acquires the diff's leading `+` and therefore arrives as `+++ …`, matching that branch. The parser then rebinds or nulls `currentPath` and every subsequent `+` line in that file is dropped from the scan.

Reproduced against a real git repo with a real denylist:

```
plain.md  = "INTERNAL-PROJECT-CODENAME"                 → exit 1  (blocked)
poison.md = "++ /dev/null\nINTERNAL-PROJECT-CODENAME"   → exit 0  (committed clean)
```

This is **not** one of [ADR-0033](../adr/0033-house-ip-leak-guard.md)'s accepted limitations. That ADR's Consequences section enumerates its gaps — `--no-verify` / unset hooks, denylist false positives, per-line literal substring matching, commit latency — and a parser branch that disables scanning for a whole file is none of them. The ADR does accept "a marker split across lines or living in a binary blob"; this is a different failure, because it silently disables the scan for *unsplit, plaintext* markers too.

The trigger is realistic in this repo specifically: any document containing a pasted diff hunk header inside a fenced block (`+++ b/foo` renders as `++++ b/foo` in the diff of that document) hits the same branch. Skill bodies, ADRs and review artefacts here quote diffs routinely.

Surfaced by the Standards axis of the `/ad-review` pass on `v0.18.0-beta.1..HEAD` and deliberately deferred from that range to avoid scope creep — see [task 0030](0030-measure-review-handoff-vs-sanction-gate.md) Notes.

## Acceptance Criteria

- [x] `extractAddedLines` distinguishes a real diff file header from a content line that merely looks like one, and no longer silently drops the remainder of a file's added lines.
- [x] Pure-function regression test: input containing a content line beginning with `++ ` still yields the following added lines with the correct `path` binding.
- [x] Pure-function regression test for the re-attribution variant (`++ b/other.md` as content must not reassign following lines to `other.md`).
- [x] End-to-end repro from the Context section is re-run and now exits 1.
- [x] The fix does not regress the existing `parseRawDiff` / `extractAddedLines` cases — non-ASCII paths, deletions, `/dev/null` headers, multi-file diffs.
- [x] `npm test` passes.
- [x] `main()` has integration coverage against a real git repository — added retroactively, see the 2026-08-03 scope note.
- [x] Reviewed via `/ad-review` before merge, per WORKFLOW §10.

## Plan

- [x] Decide the parser approach. `git diff --cached --numstat` or `--raw -z` (already parsed by `parseRawDiff`) gives an authoritative file list; reconciling the content scan against that list is likely more robust than tightening the textual `+++ ` match, since hunk structure — not line prefix — is what actually delimits a file.
- [x] Implement in [`src/leak-guard.js`](../../src/leak-guard.js). Keep the pure/wrapper split: parsing stays a pure exported function, `main()` stays the only git-invoking surface.
- [x] Add the regression tests above to [`test/leak-guard.test.js`](../../test/leak-guard.test.js).
- [x] Re-run the end-to-end repro in a scratch git repo.
- [x] `/ad-review` the range.

## Notes

**2026-07-31 — Opened.** Two sibling gaps in the same file are tracked but explicitly *not* in this task's scope, so each keeps its own evidence trail:

- `main()` has no integration test against a real git repo — the git-plumbing wrapper (`rev-parse`, `--raw -z` parsing, `cat-file blob`, exit codes, the fail-closed catch) that `lefthook.yml` actually invokes is untested. Flagged by several independent reviewers across the task-0030 measurement and the `v0.18.0-beta.1..HEAD` review. Note that those reviewer verdicts live only in session transcripts — `.agentic/reviews/` is gitignored and holds review *inputs*, not outputs — so this attribution is not reproducible from the repo. The defect itself is, via the Context repro above; treat that as the evidence, not the count. Fixing it would likely subsume the end-to-end criterion here, so sequence it after this task rather than merging the two.
- The guard has never actually executed on this machine: no `lefthook` binary, `lefthook` absent from `devDependencies`, and no local `.agentic/leak-denylist.txt`. ADR-0033 names unset hooks as an accepted bypass, so this is setup debt rather than a defect — but it means every fix to this file has shipped unscanned, including this one when it lands.

**2026-07-31 — The setup-debt bullet above is closed.** `lefthook` is now a `devDependency`, `.git/hooks/pre-commit` and `pre-push` are wired, and staging a denylisted marker exits 1. What remains open is only the per-contributor step: the denylist is machine-local by design (ADR-0033), so a fresh clone still needs `cp .agentic/leak-denylist.example.txt .agentic/leak-denylist.txt` before the content scan does anything. The bullet is left as written — Notes are append-only.

**2026-07-31 — Implemented.** `extractAddedLines` now consumes hunk bodies by the line counts the hunk header declares, instead of deciding what is a header by line prefix. Inside a counted body no line can be re-read as a file header, which closes the class rather than the instance — the `++ /dev/null` variant and the `++ b/other.md` re-attribution variant are the same bug, and both die to the same change.

Verified end-to-end against a real git repo with a real denylist, the three cases from Context:

```
plain.md   exit=1  blocked
poison.md  exit=1  blocked   (was exit=0)
reattr.md  exit=1  blocked   (was exit=0)
```

Four regression tests added: the two variants above, a counted-body test proving a following file header still registers (including the `@@ -0,0 +1 @@` omitted-count form, which defaults to 1), and one pinning that `\ No newline at end of file` consumes no hunk line. Suite 298/298.

The parser approach is the one this task's Plan preferred — hunk structure delimits a file, not line prefix — reached without needing `parseRawDiff`'s file list, so the pure/wrapper split is untouched and `main()` remains the only git-invoking surface.

Still open, unchanged by this task: `main()` has no integration test against a real git repo. The end-to-end verification above was run by hand, not by the suite.

**2026-08-03 — Review gate un-ticked; it was ticked on the wrong basis.** The Spec axis of the review covering this commit raised it as a Blocker and was right. The box cited the pre-publish pass, which reviewed the `extractAddedLines` fix as it shipped in `0.18.0-beta.2` — real, and it did verify these Acceptance Criteria by reproduction. But it predates the `main()` integration tests added here, so it cannot clear them. Citing a review of an earlier, narrower diff as clearance for later content is the self-attestation WORKFLOW §10 exists to prevent, and doing it in the same commit as the work is the worst version of it.

The `main()` coverage also landed with no Acceptance Criterion naming it — appended as prose after every box was already ticked. Recorded as the scope-creep it is: the work is sound, but the checklist never tracked it. Disclosing that in prose is not the same as fixing it — a reader who trusts the checkboxes would still miss it — so an Acceptance Criterion naming the `main()` coverage is added above, retroactively and marked as such. The alternative this task's own earlier Notes promised (sequence it into a follow-on task) was not taken; the work had already landed by the time the drift was noticed, and opening a task for completed work would be theatre.

**2026-08-03 — Gate closed.** A two-axis fresh-context pass ran against this diff and returned **0 Blockers** on both axes. It verified by mutation, not by reading: both reviewers reverted the case-fold in `src/leak-guard.js`, confirmed exactly the two named case-fold tests fail, restored, and re-ran clean. The Standards axis additionally added a throwaway brief to confirm the parity test catches an unclassified one. Concerns raised were applied before closing.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task

**2026-08-03 — Implementation complete; gate still open.** The pre-publish two-axis pass reviewed this range and the Spec axis verified every Acceptance Criterion by reproduction rather than by reading the claim — it rebuilt the scratch repo, ran `poison.md` against the pre-fix parser to confirm the original exit 0, then against the fixed one for exit 1. Zero Blockers, zero Concerns. The fix shipped in `0.18.0-beta.2`.

The sibling gap this task deliberately deferred — `main()` having no integration test — is now closed too, in the same range as task 0032. `test/leak-guard.test.js` gained seven tests that drive `main()` against real scratch repositories and real `git diff` output: clean pass, denylist hit, the `++` bypass end-to-end, case-variant `rules/` paths, a deletion under `rules/`, the fail-closed path outside a repository, and the documented fail-open when no denylist exists. That last one pins a behaviour ADR-0033 accepts on purpose, so a future change cannot quietly turn the accepted no-op into an unnoticed one.
