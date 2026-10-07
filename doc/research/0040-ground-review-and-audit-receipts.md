# GROUND-0040: Key review and audit receipts to the reviewed tree and check them in shadow before PR actions

**Status:** recorded
**Decision:** `ad-review` writes a `Target-SHA:` line at the top of its verdicts file and `ad-audit` writes one `<ISO>-audit-<scope>-summary.json` per audit (target SHA, each finding's severity and disposition), both under `.agentic/reviews/`; `sequence-gate.mjs` resolves each receipt's SHA to its tree and reuses Task 0107's tree freshness rule to log one evidence line per check before `gh pr create`, `gh pr ready` and `gh pr merge`, with `.agentic/gates.json` turning a check off or replacing the review receipt by a bounded local command.
**Decision ref:** doc/tasks/0108-check-review-and-audit-receipts-in-shadow.md
**Confidence:** Strong

## Decision and confidence

ADR-0089 decision 1 already fixes where each receipt lives: the reviewed SHA inside the existing verdicts file, and one summary file per audit. The skills record the SHA because a reviewer and an auditor read a commit range; the gate compares trees, because a commit SHA changes on a reword, an amend or a rebase that leaves the code identical, and Task 0107 already compares trees with a receipt-neutral allowance. `git rev-parse <sha>^{tree}` turns the recorded SHA into the tree, so the gate's freshness rule, path globs and evidence routine are reused unchanged, and only the receipt readers and the action table are new. GitHub and Gerrit both key an approval to the reviewed code state and carry it across changes that leave that state intact, which is the same rule. Each check writes its own evidence line, so Task 0110 counts would-block events per check as ADR-0089 decision 6 requires. Axis-2: Strong. The host contract is official documentation on both hosts, the tree identity under a reword was measured, and the change only logs.

## Evidence

### E1 — The hook contract Task 0107 relies on still holds on both hosts, with a 600-second default timeout

**Strength:** High
**Provenance:** A1, A2

A Bash `PreToolUse` event carries `session_id`, `cwd`, `tool_name: "Bash"` and `tool_input.command` on both hosts, and exit 0 with no output lets the call continue (A1, A2). Both hosts default a command hook's timeout to 600 seconds and accept a per-hook `timeout` in seconds (A1, A2). A bot-review command run inside the gate therefore needs its own, shorter bound so a slow network read cannot hold the shell call; the bound is a design choice, not a measurement.

### E2 — A commit SHA resolves to its tree, and a rewrite that keeps the code keeps the tree

**Strength:** High
**Provenance:** A3, D2

`<rev>^{tree}` dereferences a commit to its tree object (A3). Measured: a commit reworded with `git commit --amend -m` got a new SHA and the same tree, `3be22be7` (D2). A receipt keyed by tree therefore survives the history rewrites that invalidated a cited review SHA twice during Task 0107, while any code change still makes it stale.

### E3 — Prior art keys approval to the reviewed code state and carries it across changes that keep that state

**Strength:** Medium
**Provenance:** B1, B2

GitHub dismisses an approval as stale when pushes change the pull request's diff or its merge base, so an approval belongs to a code state, not to the act of reviewing (B1). Gerrit copies votes to a new patch set when only the commit message changed (`NO_CODE_CHANGE`) or when the diff is unchanged after a rebase (`TRIVIAL_REBASE`) (B2). Comparing trees with a receipt-neutral path list is the local equivalent: a reword is clear, a code change is stale. Neither is a hook; both are server-side review systems.

### E4 — The gate, the receipt layout and the review outputs already exist and can be extended rather than duplicated

**Strength:** High
**Provenance:** C1, C2, C3, C4, D1, D3

`sequence-gate.mjs` matches landing actions in a table, computes freshness with `freshReceipt` over tree-keyed receipts, and writes one evidence line per checked action (C1). `gate-run.mjs` exports `git`, `headTree` and `repositoryRoot`, which the new readers reuse (C2). `ad-review` on both hosts writes `.agentic/reviews/<ISO>-<scope>-verdicts.md` at review time, a gitignored local artifact, since 561258f (C3, D1). `ad-audit` already names the SHA under audit and writes `target=<SHA>` into every group handoff and its `Gate:` line, but no file summarizes an audit's findings (C4, D3). `.agentic/reviews/` and `.agentic/receipts/` are both gitignored in this repository, so a receipt never changes the tree it describes (C1).

### E5 — The gate checks existence and freshness only, never the review's verdict

**Strength:** High
**Provenance:** C5

ADR-0089 decision 5 forbids judging whether a review was good. An audit summary with open blockers is still a receipt: the gate reports that the step ran for this state, and the findings remain the owner's to weigh (C5).

## Source register

- **A1:** Claude Code hooks reference, sections "Common input fields", "PreToolUse", "Exit code 0" and hook `timeout`, https://code.claude.com/docs/en/hooks (accessed 2026-10-07 via WebFetch)
- **A2:** Codex hooks documentation, sections "Common input fields", "PreToolUse", "Config shape" (`timeout`, default 600 seconds), https://learn.chatgpt.com/docs/hooks (accessed 2026-10-07 via WebFetch)
- **A3:** git documentation, gitrevisions, `<rev>^{<type>}`, https://git-scm.com/docs/gitrevisions (accessed 2026-10-07 via WebFetch)
- **B1:** GitHub Docs, "About protected branches", dismissal of stale pull request approvals and approval of the most recent reviewable push, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches (accessed 2026-10-07 via WebFetch)
- **B2:** Gerrit Code Review documentation, "Review Labels", `copyCondition` change kinds `NO_CODE_CHANGE`, `TRIVIAL_REBASE` and `NO_CHANGE`, https://gerrit-review.googlesource.com/Documentation/config-labels.html (accessed 2026-10-07 via WebFetch)
- **C1:** `src/skills/claude-code/ad-hooks/scripts/sequence-gate.mjs`, `ACTIONS`, `freshReceipt`, `checkGateRun` and `main`; `.gitignore` lines for `.agentic/reviews/` and `.agentic/receipts/` (accessed 2026-10-07 via Read)
- **C2:** `src/skills/claude-code/ad-hooks/scripts/gate-run.mjs`, exports `git`, `repositoryRoot`, `headTree`, `readReceipts` (accessed 2026-10-07 via Read)
- **C3:** `src/skills/claude-code/ad-review/SKILL.md:138` and `src/skills/codex/ad-review/SKILL.md:172`, "Persist the verdicts before presenting them" (accessed 2026-10-07 via Read)
- **C4:** `src/skills/claude-code/ad-audit/SKILL.md:19` (name the SHA under audit), `:80` and `:102` (`Gate:` line with `target=<SHA>`), `:131-143` (verdict and output contract, no summary file); the same steps in `src/skills/codex/ad-audit/SKILL.md:52`, `:69` and `:79` (accessed 2026-10-07 via Read)
- **C5:** `doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md`, decisions 1, 2, 5 and 7 (accessed 2026-10-07 via Read)
- **D1:** `git log --all --oneline -i --grep=verdicts` returned 561258f, "persist review verdicts and date research-layer records", the commit that added the verdicts file on both hosts (accessed 2026-10-07 via Bash)
- **D2:** scratch-repository measurement with git 2.54.0 (Apple Git-157): `git commit -qm one; t1=$(git rev-parse HEAD^{tree}); git commit -q --amend -m reworded; git rev-parse HEAD^{tree}` gave a new SHA and the same tree `3be22be77da4887e869c981806d8452f034dd014` (accessed 2026-10-07 via Bash; reproducible with any git on Linux, macOS or Git Bash on Windows)
- **D3:** `git log --all --oneline -S'target=<SHA>' -- src/skills` returned 4f8d7be, "anchor reviewer verdicts to rules sha256", which added the target SHA to audit handoffs; no prior attempt at a review or audit receipt read by a hook was found (`git log --all --oneline -S'review receipt'` returned only the study commits aa1a56c and 971a4d9) (accessed 2026-10-07 via Bash)

## Limitations and reversal

A review of uncommitted work has no commit SHA; its verdicts file records `Target-SHA: none (working tree)`, which never clears a check, so a pull request opened right after such a review logs would-block until a review of the committed range runs. The shadow run measures how often that happens; if it dominates the false blocks, the review receipt gains a working-tree tree computed as `gate-run.mjs` does. The verdicts file and the summary are written by the agent following skill text, not by a script, so a skipped or malformed line reads as a missing receipt, the outcome the gate exists to surface. A bot-review command comes from the repository's own `.agentic/gates.json` and runs with the hook's privileges, the same trust the repository's hook configuration already has. A host that starts showing `PreToolUse` stdout or blocking on exit 0 would reverse the shape, as in GROUND-0038.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs <this-path>`, then reopen every source in the register. Structural validity proves the map, not the source content.
