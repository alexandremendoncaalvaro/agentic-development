# ADR-0100: Cite a green gate run instead of repeating it

**Status:** accepted
**Date:** 2026-11-25
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0032 — decision 3's explicit rerun in `/ad-pr` Phase 1, which is skipped when a passing gate-run receipt already covers the tree; every other decision binds unchanged.
**Related:** ADR-0089 (the gate-run receipt), ADR-0091 (audit by risk, the delta review and the one real second model, all kept), ADR-0036 (the cross-model pass, kept)

## Context

On one commit the flow the skills prescribe ran the full gate three times. `ad-audit` Step 4 runs the full gate before dispatch; `git push` runs it again through the pre-push hook; `/ad-pr` Phase 1 step 2 runs the pre-push commands a third time. ADR-0032 decision 3 added the third run because a skipped or miswired hook let PRs open on red, and ADR-0089 added gate-run receipts so a later step could see an earlier green run.

The receipts never matched on Windows. `gate-run.mjs` wrote the tree through an empty temporary index, and with `core.filemode=false` `git add -A` records every executable as `100644`, a tree no commit has. Measured in a scratch clone of this repository, at `3be3ae5`, a one-line docs commit on top of `e515bfe` (`origin/main`): the three runs took 84 s, 62 s and 72 s, all exit 0, and none of the three receipts named the commit's tree (`12b8c82` against `5a69e6f`; `git diff --summary` showed nine `100755 => 100644` changes).

## Decision

1. **Receipts name the commit's tree.** `gate-run.mjs` seeds its temporary index from `HEAD` with `read-tree` before `add -A`. The seed carries each entry's mode and no stat data, so git still hashes every file (no racy-git risk) and an executable keeps `100755` where `core.filemode` is false.
2. **A green run is cited, not repeated.** `gate-run.mjs check` takes the newest receipt that covers `HEAD^{tree}` under the receipt gate's own freshness rule and exits 0 only when that run passed; with no covering receipt, or a newer failed run of the same tree, it exits 1. It compares real paths before running, so a script reached through a junction or symlink still runs instead of exiting 0 silently. `/ad-pr` Phase 1 step 2 and `ad-audit` Step 4 run it first; when it exits 0 and names the whole gate command, that line is the gate result and the gate is not run again. With no receipt gate, exit 1, or a receipt for a narrower command, they run the gate as before, and a run that passes is recorded.
3. **The pre-push hook still runs on every push.** A receipt is a local file anyone can write; the hook is the rail ADR-0032 rests on, so it is not skipped by a receipt.

## Consequences

- Per pull request on a repository with the receipt gate wired to its gate command: one full gate run when the push comes first (the push records, `/ad-pr` and the audit cite it); two when the audit runs before the push (the audit records, the push still runs the hook, `/ad-pr` cites). Before: three.
- Kept on purpose: the merge gate on the integrated tree, the cross-model second pass (ADR-0036, ADR-0091 decision 6) and the delta review after a fix (ADR-0091 decision 2). They judge a different tree, a different model or a different range, so none repeats another.
- A consumer repository whose hooks do not record a receipt sees no change: `check` exits 1 and `/ad-pr` runs the gate as before. Wiring the record into a consumer's hook is `ad-hooks`' job and is not part of this decision.
- A forged or stale receipt can at most save a rerun before `gh pr create`; the pre-push hook and the merge gate still run the gate on the pushed and the integrated trees.
- Limits, left to the citing skill's judgement: `check` does not verify that the command it names is the full gate (the skill compares it with the detected command), nor how old the run is; receipts live per worktree; a submodule's content is not part of the tree, so a submodule-only change can read as covered (as in the receipt gate before this ADR).

## Alternatives Considered

- **Skip the pre-push hook when a receipt covers the tree.** Rejected: it would make a local file the only thing between a red tree and the remote.
- **Drop the explicit rerun in `/ad-pr` outright.** Rejected: ADR-0032 added it for skipped or miswired hooks, which a receipt check still detects (exit 1) and a blanket removal would not.
- **Let the audit replace the review on a high-risk branch.** Proposed in the same change and rejected by its refutation pass, because the two are not the same check. An audit group reviewer judges against cited rules only and drops a finding that cites no rule (`audit-group-reviewer.md`), while the review reports bugs and edge cases regardless of a rule (`fresh-context-reviewer.md`). A re-audit carries unchanged groups forward (`ad-audit` Step 0, "Re-audit"), so a spec-axis group added to it would not re-read the spec after a fix. And the audit has no spec handoff, no persisted per-axis verdicts and no severity mapping for spec findings. Both passes stay.
