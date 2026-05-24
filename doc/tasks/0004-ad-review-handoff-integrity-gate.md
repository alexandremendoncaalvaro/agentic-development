# Task `0004`: `ad-review handoff-integrity gate — assert commit count`

**Status:** `proposed`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`
**Spec ref:** `doc/specs/0002-two-axis-fresh-context-review.md`
**Board ref:** ``

## Context

Task 0002 (N=3 axis-bleed audit) surfaced a real handoff-generator integrity bug during the Range C measurement. The assembling agent (me, during Range C handoff construction) misstated the commit count: handoff header said `"Three commits"` for the range `v0.17.3-beta.1..v0.17.4-beta.1`, but `git rev-list --count v0.17.3-beta.1..v0.17.4-beta.1` returns 7. The actual range spans `f4edd2a → c8fe893 → ee60a59 → ad90397 → 02fb82b → 7b476ce → 7ffcc90`; I had eyeballed only the three most recent.

Consequence: the Spec-axis subagent received the full diff (which DID span all 7 commits' file changes) but only 3 of 7 commit bodies as "spec slice". 4 commits' claims went unverified under axis-bounded discipline. The Spec-axis subagent caught this and flagged it correctly, but only after wasted review cycles. The audit's signal is bounded above by handoff fidelity; a quiet count mismatch produces silently-incomplete reviews.

What breaks without this task: handoff-generator drift recurs on the next ad-review invocation against any range the agent miscounts. Symptoms range from "Spec axis under-reviews recent commits" to "Standards axis cites stale binding-doc text" depending on what got mis-bounded.

## Acceptance Criteria

- [ ] `src/skills/claude-code/ad-review/SKILL.md` and `src/skills/codex/ad-review/SKILL.md` Step 1 (scope / capture diff command) extended to require: the assembling agent must compute `git rev-list --count <range>` and bind that value to a variable that gets embedded in the handoff header (`## Range — <range> — <N> commits`).
- [ ] Handoff template `## Spec slice` section requires one `### <sha> <subject>` entry per commit; the count of these entries must equal the rev-list count from Step 1, or the assembling agent must stop and surface the mismatch.
- [ ] Anti-pattern block (both variants) updated to forbid handoff write when the rev-list count and the body's commit-message count disagree.
- [ ] An optional but recommended assertion at the bottom of Step 4 (persist handoff): `wc -l <handoff>` printed alongside the path, so the user has a sanity check value.
- [ ] Mirror via `node bin/agentic.js update --agent both --yes`. `npm test` passes.

## Plan

- [ ] Re-read Step 1 of both SKILL.md variants. Identify the smallest insertion that adds the commit-count assertion without bloating the step.
- [ ] Draft the assertion text. Example: `"Compute the commit count: \`git rev-list --count <range>\`. Bind to N. The handoff header must include the literal line \`Range: <range> (N commits)\`. The \`## Spec slice — commit messages\` section must contain exactly N \`### <sha>\` entries. If your body has fewer, you mis-bounded the range — stop and re-scope."`
- [ ] Edit both Claude Code + Codex variant SKILL.md files.
- [ ] Add anti-pattern entry: `"Do NOT write the handoff if rev-list count and commit-section count disagree. The audit downstream depends on this invariant."`
- [ ] Mirror + test + commit per `/ad-commit`. Suggested subject: `fix(ad-review): handoff-generator integrity — assert commit count matches range (task 0002 finding)`.
- [ ] Self-verify by reviewing this commit with the fixed skill: the handoff for the diff should now carry the correct count.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
