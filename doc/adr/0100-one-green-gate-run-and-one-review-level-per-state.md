# ADR-0100: One green gate run and one review level per state

**Status:** accepted
**Date:** 2026-11-25
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0032 — decision 3's explicit rerun in `/ad-pr` Phase 1, which is skipped when a passing gate-run receipt already covers the tree; every other decision binds unchanged.
**Amends:** ADR-0089 — decision 2's review receipt, which an `ad-audit` summary with a `specAxis` field also satisfies; every other decision binds unchanged.
**Related:** ADR-0091 (audit by risk, the delta review and the one real second model, all kept), ADR-0036 (the cross-model pass, kept)

## Context

On one commit the flow the skills prescribe ran the full gate three times and, on a high-risk branch, reviewed it twice.

**The gate.** `ad-audit` Step 4 runs the full gate before dispatch; `git push` runs it again through the pre-push hook; `/ad-pr` Phase 1 step 2 runs the pre-push commands a third time. ADR-0032 decision 3 added the third run because a skipped or miswired hook let PRs open on red, and ADR-0089 added gate-run receipts so a later step could see an earlier green run. The receipts never matched on Windows: `gate-run.mjs` wrote the tree through an empty temporary index, and with `core.filemode=false` `git add -A` records every executable as `100644`, a tree no commit has. Measured on this repository at commit `3be3ae5`: the three runs took 84 s, 62 s and 72 s, all exit 0, and none of the three receipts named the commit's tree (`12b8c82` against `5a69e6f`; `git diff --summary` showed nine `100755 => 100644` changes).

**The review.** `ad-tdd` and `ad-tdg` always send to `/ad-review`; ADR-0091 decision 4 then asks for `/ad-audit` on a branch that touches `auditPaths`. The audit already walks every Standards source the review reads, but it never read the spec, so its summary could not stand for the review and the receipt gate asked for both: in a fixture with `auditPaths: ["**"]` and only an audit summary, the review check logged `would-block` before and after this change, and with a `specAxis` summary it logged `would-block` before and `clear` after.

## Decision

1. **Receipts name the commit's tree.** `gate-run.mjs` seeds its temporary index from `HEAD` with `read-tree` before `add -A`. The seed carries each entry's mode and no stat data, so git still hashes every file (no racy-git risk) and an executable keeps `100755` where `core.filemode` is false.
2. **A green run is cited, not repeated.** `gate-run.mjs check` exits 0 when a passing receipt covers `HEAD^{tree}` under the receipt gate's own freshness rule, and 1 otherwise. `/ad-pr` Phase 1 step 2 and `ad-audit` Step 4 run it first; when it exits 0 and names the whole gate command, that line is the gate result and the gate is not run again. With no receipt gate, exit 1, or a receipt for a narrower command, they run the gate as before, and a run that passes is recorded.
3. **The pre-push hook still runs on every push.** A receipt is a local file anyone can write; the hook is the rail ADR-0032 rests on, so it is not skipped by a receipt.
4. **The audit carries the review's Spec axis.** `ad-audit` reads `CONTRIBUTING.md` with the Standards sources and adds a `spec` group, resolved and reviewed on `ad-review`'s Spec-axis terms (N/A when no spec source resolves). Its summary then writes `specAxis`, and the receipt gate counts such a summary as the review receipt of its target, listed before the verdicts files so a delta review may chain to it. A summary without `specAxis`, every one written before this ADR, covers the Standards axis only.
5. **One level per state.** `ad-tdd` and `ad-tdg` send a high-risk change (`auditPaths`) to `/ad-audit` instead of `/ad-review`, never both on one state.

## Consequences

- Per pull request on a repository with the receipt gate wired to its gate command: one full gate run when the push comes first (the push records, `/ad-pr` and the audit cite it); two when the audit runs before the push (the audit records, the push still runs the hook, `/ad-pr` cites). Before: three.
- High-risk branches get one review pass, the audit, instead of a review plus an audit of the same state.
- Kept on purpose: the merge gate on the integrated tree, the cross-model second pass (ADR-0036, ADR-0091 decision 6) and the delta review after a fix (ADR-0091 decision 2). They judge a different tree, a different model or a different range, so none repeats another.
- A consumer repository whose hooks do not record a receipt sees no change: `check` exits 1 and `/ad-pr` runs the gate as before. Wiring the record into a consumer's hook is `ad-hooks`' job and is not part of this decision.
- A forged or stale receipt can at most save a rerun before `gh pr create`; the pre-push hook and the merge gate still run the gate on the pushed and the integrated trees.

## Alternatives Considered

- **Skip the pre-push hook when a receipt covers the tree.** Rejected: it would make a local file the only thing between a red tree and the remote.
- **Drop the explicit rerun in `/ad-pr` outright.** Rejected: ADR-0032 added it for skipped or miswired hooks, which a receipt check still detects (exit 1) and a blanket removal would not.
- **Let any audit summary count as a review.** Rejected: without the spec group an audit never checks the change against what was asked, which is the half of the review it does not do.
