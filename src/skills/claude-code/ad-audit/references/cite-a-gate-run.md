# Cite a passing gate run instead of running it again (ADR-0100)

When the target is HEAD and `ad-hooks`' receipt gate is installed (`<ad-hooks-dir>/scripts/gate-run.mjs` exists), first run `node <ad-hooks-dir>/scripts/gate-run.mjs check`.

- It exits 0 and prints `gate-run: covered tree <tree> by "<command>" ...` when the newest receipt for HEAD's tree (or a tree differing from it only in receipt-neutral paths) passed. When that line names the repository's full gate command, it is the gate result: `Gate: <command> → exit 0, passing run on record (<the check line>); log: none; target=<SHA>`, and the gate is not run again.
- Any other outcome means run the gate: exit 1, no output line, or a line naming a narrower command than the full gate.

When the target is HEAD, a run that passed here is recorded with `node <ad-hooks-dir>/scripts/gate-run.mjs record --command "<command>" --exit 0` when the receipt gate is installed; never for another SHA or worktree, since `record` keys the receipt to the checked-out tree. The push and `/ad-pr` that follow cite it instead of running it again.
