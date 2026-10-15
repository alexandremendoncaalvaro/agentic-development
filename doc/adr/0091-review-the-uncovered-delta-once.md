# ADR-0091: Review the uncovered delta once, and audit by risk

**Status:** accepted
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0036 — decision 4's second-pass realization and its twice-run swap-and-agree; every other decision binds unchanged.
**Amends:** ADR-0074 — the checkpoint's review and audit line; every other decision binds unchanged.
**Amends:** ADR-0089 — decision 2's audit receipt before every pull request action, and decision 3's freshness rule for review receipts; every other decision binds unchanged.
**Evidence ref:** doc/research/0044-ground-review-economy-and-context-budget.md

## Context

The owner's binding rule classes redundant review as a critical failure: read what is already covered, review the remainder once per code state, review only the delta after a fix, run an audit only for high-risk or uncovered work, and run cross-model hardening once per critical group. The kit's realization does the opposite. `ad-review` closes with "re-run on the fix", `ad-audit` rebuilds every group on a re-audit and runs its critical second pass twice, the checkpoint tells the agent to audit before every pull request, and the shadow receipt gate expects an audit receipt before `gh pr create`, `ready` and `merge`. The audit of 2026-10-15 measured 23 and 25 reviewer dispatches on two pull requests and found that the "different model" second pass ran on the same model as the first in 133 of 133 group reviews, because the reviewer is pinned to `sonnet` and the override named `sonnet`.

## Decision

1. **Ledger first.** Before dispatching, `ad-review` and `ad-audit` read the coverage ledger: the verdicts and audit summaries under `.agentic/reviews/`, the task Notes and the pull request's reviews, a harness's review record included. They state what is covered and review only the remainder. A record counts as coverage when it names the code state, the rules or criteria applied, the findings and their dispositions.
2. **Delta after a fix.** When a covered review exists for an ancestor of the range end, `ad-review` reviews `<covered commit>..<range end>`, checks each prior finding's disposition, and writes a second receipt line `Base-SHA: <covered commit>`. A changed design or integration boundary reopens the coverage it touches.
3. **Chained freshness for review receipts.** The receipt gate counts a review receipt that carries a `Base-SHA:` only when that base is an ancestor of the receipt's target and an earlier review receipt covers it under the same freshness rule; a chain ends at a receipt without a `Base-SHA:`. A receipt without the line keeps its meaning.
4. **Audit by risk.** The gate checks an audit receipt only when the branch, against its merge base with the default branch, changes a path that matches `auditPaths` in `.agentic/gates.json`. With no `auditPaths`, no audit receipt is expected. Audits outside those paths stay a judgment the skill text describes: a concrete uncovered risk, a material reviewer disagreement, or the owner's request.
5. **Re-audit dispatches only what changed.** A re-audit dispatches the groups whose files or rule text changed since the prior trail's target and carries every other group's verdicts forward with that reason.
6. **One real second model.** The critical-group second pass names a model other than the first pass's (another tier through the per-invocation `model`, or the other host), records it in the trail, reorders rules and hunks, and runs once; a `pass` holds only when the first and second passes agree. A re-audit repeats it only for a critical group whose files changed.
7. **Shadow window restarts.** The receipt-gate shadow window of task 0110 restarts when this change lands, under the criterion of ADR-0089 decision 6, because the events recorded so far measure the old checks.

## Consequences

Positive:

- Review and audit cost follows uncovered change and risk, not the number of rounds.
- The second pass decorrelates blind spots instead of repeating the first.
- The gate stops recording would-block events for audits the owner's rule never asked for.

Negative:

- A delta review is only as good as the boundary judgment that says the design did not change.
- Each repository must name its high-risk paths; until it does, the gate asks for no audit.
- A higher-tier second model costs more per call; it now runs once instead of twice.

## Alternatives Considered

- **Keep the audit check on every pull request and rely on the skill text.** Rejected: the gate is the measuring instrument of task 0110, and it would keep labelling the owner's correct behaviour as a missing step.
- **Accept any review receipt for the head commit, delta or not.** Rejected: a delta from an unreviewed base would read as full coverage.
- **Drop the second pass.** Rejected: the owner's rule keeps cross-model hardening for critical groups, once.
