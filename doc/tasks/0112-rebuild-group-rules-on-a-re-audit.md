# Task `0112`: Rebuild each group's rule text on a re-audit

**Status:** done
**Created:** 2026-10-08
**Scope ref:** doc/adr/0047-absorb-team-practices-determinism-reaudit.md (re-audit), doc/adr/0036-ad-audit-maximum-gate.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`/ad-audit` Step 0 makes a run with a prior trail a re-audit (ADR-0047), and
Step 3 builds each group handoff with the group's full rule text. Nothing says
a re-audit must rebuild that text from the files at the re-audit target. In
Task 0111's branch re-audit the orchestrator reused the first pass's handoffs,
so the inline GROUP RULES for ARCHITECTURE.md and ADR-0090 predated the fixes
under review; two reviewers caught it and audited the files on disk instead
(Task 0111 Notes, "branch re-audit"). A reviewer that trusts the inline text
would audit stale rules and could clear a fix against the wrong version.
Binding docs and ADRs carry no anchor, because the tree SHA pins them, so the
anchor check cannot catch this.

Routed here by `/ad-level-up` on 2026-10-08: a step of the skill, not a
rule-set line.

## Acceptance Criteria

- [x] `/ad-audit` on both hosts states that a re-audit rebuilds every group handoff's GROUP RULES text from the files at the re-audit target SHA, never from a prior handoff.
- [x] The re-audit handoff names the target SHA its rule text was read at, so a reviewer can compare it with the files on disk.
- [x] A static test in `test/skills.test.js` pins the instruction on both hosts.

## Plan

- [x] Amend Step 0's re-audit paragraph and Step 3 in `src/skills/claude-code/ad-audit/SKILL.md` and the Codex twin; run `/ad-tdd` with the static test first.
- [x] `node bin/agentic.js update --scope project --agent both --yes`; `npm run verify`; `/ad-review`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-08

Proposed from Task 0111's branch re-audit; the owner approved opening it.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"); this task follows Task 0113
in it.

### 2026-10-08 — built

Step 0's re-audit paragraph on both hosts states that a re-audit rebuilds every group handoff's rule text from the files at the re-audit target SHA, never from a prior handoff, and names that SHA; a static test in `test/skills.test.js` pins it on both hosts (red first).

### 2026-10-09 — batch review

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes, verdicts at `.agentic/reviews/20261008T231440Z-commit-range-batch-verdicts.md`), no Blocker. Fixed: the second criterion was met only in Step 0's prose; the handoff template now carries a `Rule text read at: <SHA>` line on both hosts, and the static test pins it (red first).

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Concern: the task record never said the change was built. Fixed (built note, boxes).
- Review Concern: the handoff template had no rule-text SHA field. Fixed in 0f2948b.
- Audit minor: CONTEXT.md's audit handoff entry omitted it. Fixed.

Falsification lane on `23252ae` (scratch worktree, one mutation at a time, restored after each; log `.agentic/reviews/20261009T065600Z-audit-falsification.log`): removing the template line turned 1 of 1 test red.

### 2026-10-09 — re-audit corrections

Re-audit of six groups at `ae477da` (architecture, guidelines, glossary, ADR-0074, ADR-0049, and the claims group twice across two models): no Blocker. The earlier note's pointer to a batch-wide table "in the pull request body" named a body that does not exist yet; the batch-wide facts are: the first audit ran 19 rule groups at `23252ae` with the critical claims group three times across two models, neither audit found a Blocker, and the pull request body will repeat this once opened.

### 2026-10-09 — closed

Done. Fresh-context two-axis review at `16e6aba`; `/ad-audit` of 19 rule groups at `23252ae`; re-audit of six groups at `ae477da`; delta re-audit of the guidelines and claims groups at `548b44f`. None found a Blocker. The delta re-audit's last findings: ADR-0074 still said the line is omitted when no state file names a version (minor, fixed: omitted only when no state file exists); red-first claims lacked retained output (minor, fixed: the runner lines are quoted below where this task claims red first); the batch-wide findings table is in the pull request body. Gate `npm run verify` exit 0, 1396 of 1396.

Red first, before 0f2948b: the template-field assertion failed (`# pass 0`, `# fail 1`).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
