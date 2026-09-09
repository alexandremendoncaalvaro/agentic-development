# Task `0067`: Close the skill routing chain

**Status:** proposed
**Created:** 2026-09-09
**Scope ref:** src/skills/claude-code/ad-philosophy/SKILL.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Each skill's `## Next` section hands off to the next stage. The late chain (commit, pr, merge) is consistent, but the middle is disconnected: `ad-ground` and `ad-task` never name `/ad-tdd` or `/ad-tdg`; `ad-tdd` and `ad-tdg` say "commit the change" without naming `/ad-commit`; `ad-review` and `ad-audit` never name `/ad-commit`, `/ad-audit`, or `/ad-merge`; `ad-philosophy`, the always-on posture skill, never names `/ad-tdd`, `/ad-tdg`, `/ad-diagnose`, or `/ad-commit`. `ad-tdd` has two inbound routes in the whole kit. `ad-domain` claims that `ad-spec`, `ad-architecture`, and `ad-drift` route to it; none do. Several routes are asymmetric (tdd to tdg but not back; diagnose to tdg; roadmap to next; question-me acknowledged by nobody).

## Acceptance Criteria

- [ ] `ad-ground` Next names `/ad-tdd` (and `/ad-tdg` for strategy choice) as the implementation step.
- [ ] `ad-task` Next names `/ad-ground` before implementation and `/ad-tdd` for it.
- [ ] `ad-tdd` and `ad-tdg` Next name `/ad-commit` for landing; `ad-tdg` names `/ad-tdd` as its outer loop.
- [ ] `ad-review` Next names `/ad-audit` (team-bound work), `/ad-commit`, and `/ad-merge`; `ad-audit` Next names `/ad-commit` and `/ad-pr`.
- [ ] `ad-philosophy` names `/ad-tdd`, `/ad-tdg`, `/ad-diagnose`, and `/ad-commit` in Goal-Driven Execution or Next.
- [ ] `ad-spec`, `ad-architecture`, and `ad-drift` route to `/ad-domain` where vocabulary is resolved, or `ad-domain` drops the claim.
- [ ] `ad-next` names `/ad-roadmap`; `ad-grill-me` and `ad-review` acknowledge `/ad-question-me`; `ad-tdg` acknowledges `ad-diagnose`'s hand-off.
- [ ] A new test in `test/skills.test.js` asserts each pipeline edge above by reading the source `SKILL.md` files on both hosts, so a future edit that breaks the chain fails the suite.
- [ ] Codex variants carry the same edges; dogfood copies refreshed; `CHANGELOG.md` updated.

## Plan

- [ ] Ground (in-repo + git history): read `WORKFLOW-FLOWS.md` for the intended chain and the existing Next sections for house wording.
- [ ] Red: write the edge test as a table of (skill, must-mention) pairs.
- [ ] Green: edit the Next sections and `ad-philosophy` on both hosts.
- [ ] Refresh dogfood; full suite; `CHANGELOG.md`.
- [ ] `/ad-review`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`), section 2.4.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
