# Task `0090`: Draft spike-outcome ADRs from the canonical template

**Status:** done
**Created:** 2026-09-29
**Scope ref:** src/skills/claude-code/ad-spike/SKILL.md (Step 5, conclude)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`/ad-spike` on Claude Code links a second ADR skeleton,
`references/spike-adr-template.md`, while `/ad-adr` owns the canonical one.
The two disagree: the spike copy has no `Status`, `Date`, or `Deciders` lines
and no `Alternatives Considered` section, and it places rejected techniques
inside `Decision`, which `/ad-adr` forbids ("rejected paths go in
`Alternatives Considered`, not the body"). ADR-0086, drafted from the Laya
spike, needed two correction commits to reach the canonical shape (ea19e41
moved the rejected alternatives into their own section; 2a51c40 grouped the
consequences). The Codex variant ships no second template and already routes
the outcome through `/ad-adr`, listing what the ADR captures.

## Acceptance Criteria

- [x] No skill other than `/ad-adr` ships an ADR skeleton on either host, locked by a test.
- [x] The Claude Code `/ad-spike` conclude step drafts the outcome ADR through `/ad-adr` and names what it captures, matching the Codex variant: technique picked, alternatives held in reserve, end-to-end pass rate, failures and root causes, mitigation, and that inconclusive spikes get ADRs too.
- [x] The Claude Code `/ad-spike` places rejected techniques under the canonical `Alternatives Considered` section.
- [x] The dogfood installs are refreshed and `npm run verify` passes through the hook runner.
- [x] `CHANGELOG.md` records the change under `[Unreleased]`.

## Plan

- [x] Red: a test in `test/skills.test.js` that fails while any skill other than `ad-adr` ships a file with an `# ADR-NNNN` title line.
- [x] Green: delete `src/skills/claude-code/ad-spike/references/spike-adr-template.md`; rewrite the Step 5 link as the capture list.
- [x] Refresh the dogfood install; `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-29

Opened from the `/ad-level-up` pass over five queued candidates (item C5);
the owner approved it as the first follow-up. Not a rule-set line: the defect
is two kit templates disagreeing. No ground record: the canonical template and
the rule it enforces are in-repo (`ad-adr/references/adr-template.md`,
`ad-adr/SKILL.md`), and the Codex variant already shows the target shape.

### 2026-09-29 — Built, reviewed, landed

TDD: the tracer test first matched `*adr-template*` filenames under
`references/` and went red on `claude-code/ad-spike` for that reason; green
after deleting the template, rewriting Step 5 as the capture list, and
removing the dogfood copy by hand (the installer prunes whole orphan skills,
not a single file dropped from a kit skill, so a consumer's existing install
keeps the unlinked file). Fresh two-axis review (handoffs and verdicts at
`.agentic/reviews/2026-09-29T19-51-08Z-working-tree-*.md`, machine-local):
no Blocker on either axis; both raised one Concern, applied: the filename
check was narrower than the criterion, so the test now walks every file of
every non-`ad-adr` skill for an `# ADR-NNNN` title line. Mutation check: the
old template copied back under another name and directory
(`scripts/outcome-notes.md`) turns the test red; removing it restores green.
Standards Note applied: the added "inconclusive spikes" sentence duplicated
the step's existing paragraph and was dropped. Notes left as is: task 0089 is
taken on the unmerged `feat/stateful-tdd-and-measure-source` branch, hence
0090. `npm run verify` through `scripts/hook-npm-test.js` passes.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
