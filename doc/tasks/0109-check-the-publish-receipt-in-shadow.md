# Task `0109`: Check the publish receipt before outward posts, in shadow

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 and 2, publish check)
**Evidence ref:** doc/research/0041-ground-publish-receipt-check.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Outward text must be the text the owner approved. `ad-publish` shows an
exact-text approval receipt in chat and says any change invalidates it, but
persists nothing, so no tool can check that a posted comment was approved or
unchanged.

## Acceptance Criteria

- [x] On the owner's approval, `ad-publish` records the destination, the SHA-256 of the normalized approved body and the approval time under `.agentic/receipts/`, on both hosts.
- [x] `sequence-gate.mjs` logs "would block" before `gh pr comment`, `gh issue comment`, a comments API call and a chat send tool when no receipt matches the outgoing body's hash; it reads the body from `--body`, `--body-file` and the tool input.
- [x] Normalization is stated and tested (line endings, trailing whitespace), so a reformatted but identical body matches and any other change does not.
- [x] Tests cover a matching body, an edited body, no receipt, each body source, and an unrelated command.

## Plan

- [x] `/ad-ground` how each outward command carries its body; red, then green (`/ad-tdd`).
- [x] `ad-publish` text; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — plan approved

The owner accepted ADR-0089 and approved this plan.

### 2026-10-07 — implementation

GROUND-0041 was committed (3479fbd) before the first implementing commit
(4088923). Built one behaviour per cycle through the scripts' command lines;
each new behaviour failed first for the expected reason (author-reported:
observed in the authoring session, not retained): the recorder missing, a
quoted `--body` unread, a heredoc read as an expansion, `gh issue comment`
and `gh api` calls unseen, the chat tool unseen, a missing body file logged
against an `unknown` action, `ghp` unseen, and no `PreToolUse` entry for the
chat tool. The edited-body and normalization tests passed on first run,
through code the tracer step had already written; replacing the hash
comparison with "any receipt", and removing each normalization rule in turn,
turned them red.

Beyond the ask, both grounded in this task's measurement needs:

- `githubCommands` in `.agentic/gates.json` (default `["gh"]`) names the
  wrappers a repository runs `gh` under, for the pull request checks of Task
  0108 too. This repository commits `["gh", "ghp"]`: the owner runs `gh`
  through `ghp` here, so without it Task 0110's shadow run would see none of
  the owner's pull request or comment commands.
- The review and audit receipt readers moved to `review-receipts.mjs`, so
  `sequence-gate.mjs` stays under GUIDELINES 3.3's size review threshold
  (438 lines before, 378 after).

Real path, on this repository with the command wired in `.claude/settings.json`
and simulated events, nothing posted: after recording a receipt for a test
text, `ghp pr comment 162 --body-file <that file>` logged publish `clear`, a
different `--body` logged `would-block`, and a
`mcp__<server>__slack_send_message` event with the same text logged `clear`;
the test receipt was then deleted from the local receipts file.

Local gate at 714b458: `npm run verify` exit 0 on Node 24.16.0, 1315 tests,
0 vulnerabilities; `npm pack --dry-run` lists both new modules for both
hosts.

### 2026-10-07 — review at 534102f

Fresh-context two-axis review of origin/main..534102f, every finding with
severity and disposition:

- Standards Concern: `{"githubCommands": [5]}` crashed the hook with exit 1
  (reproduced by the reviewer). Fixed test-first in 3462668: entries must be
  strings, and `main` is wrapped so shadow mode never fails a call.
- Standards Concern: a backslash line continuation became the body. Fixed
  test-first, inside and outside double quotes; removing the in-quotes fix
  turned its assertion red.
- Standards Concern: a relative body file after a `cd` was read from the
  event's directory. Fixed test-first: it, a path under `~`, a non-regular
  file and a file over 1 MiB (a design cap) are `runtime-unavailable`.
- Standards Concern: every shell call now spawned git. Measured first: an
  unrelated `ls -la` event took a minimum of 0.070 s against 0.027 s for the
  gate at 3479fbd (7 runs each). Fixed: a text pre-filter returns before any
  git call; 0.031 s median against 0.028 s (9 runs each, load above 11).
- Standards Concern: a FIFO or huge file could block the hook. Fixed with the
  regular-file check and size cap above; the FIFO case is covered by the
  regular-file check, not by its own test.
- Standards Note: only the first publication in a chained command was
  checked. Fixed test-first: each gets its own line.
- Standards Note: flag forms such as `-fbody=x` are not parsed. Accepted:
  stated in GROUND-0041 and Task 0110's Notes.
- Standards Note: the recorder printed a stack trace. Fixed test-first: one
  line, exit 1.
- Standards Note: `publish.jsonl` is read whole. Accepted: stated in
  GROUND-0041.
- Spec Concern: `githubCommands` changes Task 0108's pull request checks.
  Fixed: ADR-0089's fourth addendum records it, and Task 0110's window
  starts after this slice merges.
- Spec Concern: `.agentic/gates.json` is a repository-specific change.
  Fixed with the same addendum.
- Spec Concern: chat coverage is Slack only. Accepted for this slice and
  recorded in the addendum and Task 0110's Notes.
- Spec Notes: the module move, the `gh api` body sources and the
  trailing-newline normalization are disclosed and accepted; an explicit
  unrelated-command test was added; byte parity is checked by the suite.

Local gate at b55e6b6's tree: `npm run verify` exit 0, 1320 tests,
0 vulnerabilities.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
