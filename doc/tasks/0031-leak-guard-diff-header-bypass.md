# Task `0031`: Close the `++ ` diff-header bypass in the leak-guard content scan

**Status:** proposed
**Created:** 2026-07-31
**Owner:** Alexandre Alvaro
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

Surfaced by the Standards axis of the `/ad-review` pass on `1e25d9a..HEAD` and deliberately deferred from that range to avoid scope creep — see [task 0030](0030-measure-review-handoff-vs-sanction-gate.md) Notes.

## Acceptance Criteria

- [ ] `extractAddedLines` distinguishes a real diff file header from a content line that merely looks like one, and no longer silently drops the remainder of a file's added lines.
- [ ] Pure-function regression test: input containing a content line beginning with `++ ` still yields the following added lines with the correct `path` binding.
- [ ] Pure-function regression test for the re-attribution variant (`++ b/other.md` as content must not reassign following lines to `other.md`).
- [ ] End-to-end repro from the Context section is re-run and now exits 1.
- [ ] The fix does not regress the existing `parseRawDiff` / `extractAddedLines` cases — non-ASCII paths, deletions, `/dev/null` headers, multi-file diffs.
- [ ] `npm test` passes.
- [ ] Reviewed via `/ad-review` before merge, per WORKFLOW §10.

## Plan

- [ ] Decide the parser approach. `git diff --cached --numstat` or `--raw -z` (already parsed by `parseRawDiff`) gives an authoritative file list; reconciling the content scan against that list is likely more robust than tightening the textual `+++ ` match, since hunk structure — not line prefix — is what actually delimits a file.
- [ ] Implement in [`src/leak-guard.js`](../../src/leak-guard.js). Keep the pure/wrapper split: parsing stays a pure exported function, `main()` stays the only git-invoking surface.
- [ ] Add the regression tests above to [`test/leak-guard.test.js`](../../test/leak-guard.test.js).
- [ ] Re-run the end-to-end repro in a scratch git repo.
- [ ] `/ad-review` the range.

## Notes

**2026-07-31 — Opened.** Two sibling gaps in the same file are tracked but explicitly *not* in this task's scope, so each keeps its own evidence trail:

- `main()` has no integration test against a real git repo — the git-plumbing wrapper (`rev-parse`, `--raw -z` parsing, `cat-file blob`, exit codes, the fail-closed catch) that `lefthook.yml` actually invokes is untested. Flagged independently by three of the four review arms in task 0030 and by both axes of the `1e25d9a..HEAD` review. Fixing it would likely subsume the end-to-end criterion here, so sequence it after this task rather than merging the two.
- The guard has never actually executed on this machine: no `lefthook` binary, `lefthook` absent from `devDependencies`, and no local `.agentic/leak-denylist.txt`. ADR-0033 names unset hooks as an accepted bypass, so this is setup debt rather than a defect — but it means every fix to this file has shipped unscanned, including this one when it lands.
