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

### 2026-10-07 — audit and re-review at 0894759

`/ad-audit` of origin/main..0894759 (CV with two cross-model passes in two
orders, GH, HK, AGENTS.md, GUIDELINES.md, ARCHITECTURE and CONTEXT, ADRs; NET
not applicable; every changed file read by at least one reviewer, installed
copies checked by `cmp`; anchors matched; gate at 0894759: `npm run verify`
exit 0 on Node v24.16.0, 1320 tests) and a two-axis re-review of
534102f..0894759. No blocker. Every finding, with severity and disposition:

1. CV Major/Minor (all three CV passes): the implementation entry's "438
   lines before, 378 after" matches no commit. Corrected here: measured with
   `git cat-file -p <commit>:<path>` and Python, `sequence-gate.mjs` was 399
   lines at the base, 382 at 714b458 and 406 at 0894759; the earlier figures
   were uncommitted states. It is 360 after 9d4d7f8.
2. GUIDELINES Major (3.2, 3.4): `tokenize` exceeded the complexity and
   nesting limits. Fixed in 9d4d7f8: three readers, two levels deep,
   behaviour unchanged.
3. GUIDELINES Minor (3.3): `sequence-gate.mjs` passed 400 lines. Fixed: the
   bot-review command check moved to `review-receipts.mjs`.
4. GUIDELINES Minor (9.5): two fixed-bug tests lacked the regression name.
   Fixed. The latency fix has no test: its effect is a time, measured in the
   review entry and not deterministic enough to pin; accepted.
5. GUIDELINES Minor (12.x): the hook could read `.env` or `.npmrc` named as
   a body file. Fixed test-first: never read, `runtime-unavailable`.
6. GUIDELINES Minor (2.2): the `githubCommands` fallback was silent. Accepted
   with a comment: a broken `gates.json` surfaces as the runtime-unavailable
   line of every check that reads it.
7. GUIDELINES Minor (2.2): `checkPublish`'s comment said "or null". Fixed.
8. GUIDELINES Minor: `bash -c "..."` and global-flag forms are invisible.
   Accepted: listed for Task 0110.
9. GUIDELINES Nit: short callback names. Accepted: the house lint passes;
   the renamed `tokenize` uses full names.
10. CV Minor (passes A, B): timings, the real-path run and the mutation
    checks have no retained artifact. Accepted as a label: author-reported,
    observed in the authoring session. Pass B reproduced the real-path
    behaviour and the latency direction (about 0.03 s per unrelated call) in
    a temporary repository.
11. CV Minor (pass A): GROUND-0041 D2's approved file is a local copy.
    Fixed: D2 says so; the published half is reopenable at pull request 162.
12. CV Major (pass A): CHANGELOG and ADR-0089 stated the Slack hook as fact
    without a live send. Fixed: both say it rests on both hosts'
    documentation and simulated events, not yet observed live (the Slack
    connector is not authenticated in this session).
13. CV Minor (pass B): the review entry grouped one Spec Note (task state).
    Accepted: it was consistent with a review in progress, as the reviewer
    said.
14. CV Minor (primary pass): the delta re-review was not recorded. Recorded
    in this entry.
15. ARCH/CONTEXT Minor: ARCHITECTURE said the gate runs on Bash only. Fixed.
16. ARCH/CONTEXT Minor: **Gate evidence line** listed head and tree for every
    receipt-gate line. Fixed: it names the publish line's hash and the
    runtime-unavailable shape.
17. ARCH/CONTEXT Nit: Observability omitted `publish.jsonl`. Fixed.
18. ADRs Minor: the fourth addendum narrowed "chat send" without saying
    whether it retires anything. Fixed: a coverage limit, decision 2 binds
    unchanged; no PROJECTION change.
19. ADRs Nit: the line counts (item 1).
20. Re-review Standards Note: a `cd` inside `( ... )` or `{ ...; }` was
    missed. Fixed test-first.
21. Re-review Standards and Spec Note: an error line was written even with
    the publish check off. Fixed: the switch is read first.
22. Re-review Spec Note: quoted verbs (`"gh" "pr" "comment"`) skip the
    pre-filter. Accepted: listed for Task 0110.
23. Re-review Spec Note: "Code review completed" was ticked before this
    re-review. Accepted: this entry records it.

GH, HK and AGENTS.md: no finding; GH.3 (rules in flight) is re-run before
the push. Local gate after the fixes (8e98828's tree): `npm run verify` exit
0, 1322 tests, 0 vulnerabilities.

### 2026-10-07 — final review and re-audit at 86d9fe9

Two-axis review and CV re-audit of 0894759..86d9fe9: no blocker, no concern;
both axes "ship as-is". The Standards reviewer ran a differential fuzz of the
old and new `tokenize` over 400,000 random commands: identical except a lone
trailing backslash, which no longer yields an empty word (intended: it
carried no body). The CV reviewer reproduced the line counts and caught
mutations of the `.env` guard and the subshell `cd` fix. Findings, with
dispositions:

- CV Minor: with an unreadable `gates.json`, a comment logged `would-block`
  under `gh` and nothing under `ghp`, contradicting item 6 above. Fixed
  test-first: the publish path reads the config strictly and logs
  `runtime-unavailable` for any command that may publish.
- CV Minor: item 21's switch order has no test; reverting it leaves 54 of 54
  green. Accepted: no input reaches the error branch it guards (every body
  reader returns an unreadable reason instead of throwing); it is defensive.
- CV Nit: "54 tests green throughout" in 9d4d7f8 counted the suite after the
  commit; it held 52 during the refactor. Corrected here.
- CV Nit: the old 438 and 378 figures cannot be checked from git. Accepted:
  author-reported, superseded by item 1's measured counts.
- Standards Note: the `.env` guard matches names, not symlinks. Accepted:
  listed with the other limits.
- Spec Note: ADR-0089's fourth addendum ran sentences together. Fixed:
  re-wrapped.
- Spec Notes: CHANGELOG's wording omits "simulated events", and GH.3 is
  re-run before the push. Accepted.

Local gate after the fix: `npm run verify` exit 0, 1323 tests,
0 vulnerabilities.

### 2026-10-07 — last review and re-audit at 6a1cfd8

Combined review and CV re-audit of 86d9fe9..6a1cfd8: no blocker. The CV
reviewer reverted the gate to 86d9fe9 in a disposable clone and the new
regression test failed (54 of 55), then passed on restore, and ran `npm run
verify` at 6a1cfd8: exit 0, 1323 tests. Findings, with dispositions:

- Review Concern (both axes): a `gates.json` of `null`, a number or an array
  still hid a configured wrapper. Fixed test-first: `gatesConfig` rejects
  anything but a JSON object, for every check; a test covers comments and
  the chat send.
- Review Note: `MAY_PUBLISH` matched any word "comment", so `git push origin
  fix-comment` with a broken config added a publish line. Fixed: it matches
  only `pr`/`issue comment` and `/comments`; pinned in the same test.
- Review Note: on a broken config any non-Bash tool logs a line. Accepted:
  only the chat-send tool is wired to reach the gate.
- CV Minor: the previous entry states the reviewers' fuzz (400,000 commands)
  and mutation results as fact. Labelled: reviewer-reported, observed in
  their sessions, not retained.

Local gate after the fix: `npm run verify` exit 0, 1324 tests,
0 vulnerabilities.

### 2026-10-07 — last pass at bf40816, and evidence labels

Combined review and CV re-audit of 6a1cfd8..bf40816: no blocker; both review
axes "ship as-is". The CV reviewer restored the gate from 4163acf in a
disposable clone, saw the new regression test fail (55 of 56), and ran `npm
run verify` at bf40816: exit 0, 1324 tests, 0 vulnerabilities.

Labels, since past entries are append-only: in the entries "final review and
re-audit at 86d9fe9", "last review and re-audit at 6a1cfd8" and this one,
every result a reviewer ran (the 400,000-command fuzz, the mutation and
revert runs and their pass counts, their `npm run verify` runs) is
reviewer-reported: observed in the reviewer's session, not retained. The
author's gate runs named "after the fix" ran on the trees of 4163acf (1323
tests) and 7147a9c (1324 tests); the later commits change only task Notes.
The previous entry's "Labelled" refers to this label, which it did not yet
carry; this entry is where it lands.

### 2026-10-07 — findings of the last pass at bf40816

The entry above did not quote the CV re-audit's findings at bf40816. Both,
with severity and disposition:

- CV Minor: the entry "last review and re-audit at 6a1cfd8" stated
  reviewer-run results (a revert run's 54 of 55, a 1323-test gate) as fact.
  Fixed: the entry above labels every reviewer-run result reviewer-reported.
- CV Nit: "Local gate after the fix" did not name its tree. Fixed: the entry
  above names 4163acf (1323 tests) and 7147a9c (1324 tests); the CV reviewer
  re-ran `npm run verify` at bf40816 (reviewer-reported: 1324 of 1324).

The Standards and Spec axes raised Notes only, none needing a change: the
stricter `gatesConfig` turns non-object configs into `runtime-unavailable`
on every check, `MAY_PUBLISH` still covers every handled form, and the
non-Bash branch is bounded by the wired matchers.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
