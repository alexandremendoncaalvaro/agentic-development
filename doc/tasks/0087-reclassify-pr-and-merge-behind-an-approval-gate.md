# Task `0087`: Reclassify ad-pr and ad-merge behind an in-skill approval gate

**Status:** in-progress
**Created:** 2026-09-22
**Scope ref:** doc/adr/0073-skill-invocation-policy-and-listing-budget.md (the user-invocable-only class and its Claude Code mechanism)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

ADR-0073 put `ad-pr` and `ad-merge` in the user-invocable-only class and
chose `disable-model-invocation: true` as the Claude Code mechanism, to keep
their descriptions out of the listing budget and to keep outward verbs
human-fired. The flag does more than hide a description: the host removes
the skill from the model's reach, and its `Skill` tool refuses the call with
"cannot be invoked via the Skill tool ... reserved for explicit user
invocation", observed on 2026-09-22 when the owner had approved the merge in
the same conversation and the agent could not run `/ad-merge`.

The owner's intent for a reserved verb is an approval gate, not a
prohibition: the agent may open or merge a pull request once the owner has
said yes in the session. Both skills already carry that gate in their bodies
(`ad-pr` surfaces the draft for approval before opening and asks before
pushing; `ad-merge` asks the owner to confirm the merge), so the host-level
block is redundant with the skill's own contract and only stops the work
after the approval was given. ADR-0076 set the precedent for correcting a
class membership by amendment when it moved `ad-rules` to model-invocable.

## Acceptance Criteria

- [x] ADR-0084 amends ADR-0073: `ad-pr` and `ad-merge` are model-invocable; the outward step runs only after the owner's explicit approval in the session, stated in each skill body on both hosts; the blast-radius rule and every other class member are unchanged; `PROJECTION.md` and ADR-0073's `Amended by` line record the amendment.
- [x] `src/skills/claude-code/{ad-pr,ad-merge}/SKILL.md` carry no `disable-model-invocation` flag and a description of at most 350 characters that opens with the use case and names the approval; `src/skills/codex/{ad-pr,ad-merge}/agents/openai.yaml` set `allow_implicit_invocation: true`.
- [x] The sum of model-invocable descriptions stays at or below 8,000 characters on both hosts, held by the existing tests, with `USER_INVOCABLE_SKILLS` in `test/skills.test.js` no longer naming the two skills.
- [x] Any other description shortened to hold the Codex budget is named in ADR-0084 and the changelog (the Codex `ad-audit` and `ad-review` clauses).
- [x] `ad-merge` asks the owner to confirm the merge on every path that is not covered by a valid release-plan receipt, including CI green without warnings; `ad-pr` keeps its draft approval and push confirmation.
- [x] `AGENTS.md`'s invocation-class gotcha and `ARCHITECTURE.md`'s pattern name the two skills as model-invocable behind the approval gate; `CHANGELOG.md` records the change under `[Unreleased]`.
- [x] The dogfood installs (`.claude/skills`, `.agents/skills`) and the operator's user-level install are refreshed, and `npm run verify` is green.

## Plan

- [x] Red: remove the two names from `USER_INVOCABLE_SKILLS`; the class, cap, and budget tests fail on both hosts.
- [x] Green: frontmatter on both hosts, descriptions within budget, the approval sentence in each Phase 0, the always-confirm rule in `ad-merge` Phase 3.
- [x] ADR-0084, `PROJECTION.md`, ADR-0073 header, `AGENTS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`.
- [x] Refresh dogfood and user-level installs.
- [ ] `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-22

Opened after the host refused the agent's `/ad-merge 146` call that the owner
had just approved. No ground record: the implementation path is the one
ADR-0076 already took for `ad-rules` (commit `9ef119d`), and the host
behaviour is the measurement above plus the Claude Code skills documentation
already cited by GROUND-0028 (A4: "Claude cannot load it automatically";
"the skill description is not in Claude's context").

### 2026-09-22 — Built

Red: removing the two names from `USER_INVOCABLE_SKILLS` failed eight
tests (class flags, the 350-character cap, and the listing budget on both
hosts). Green: frontmatter and Codex policy flipped, descriptions cut to
the use case, the approval, and one trigger phrase (97 and 103 characters);
both skills state the gate in their regime step, and `ad-merge`'s all-green
path now asks once instead of proceeding. The Codex listing then sat 30
characters over budget because two Codex descriptions (`ad-audit`,
`ad-review`) were longer than their Claude Code twins; both were shortened
to their twins' meaning and the Codex total is 7,994.

The evaluation corpus encoded the old class: `ad-pr` was the sole
representative of `workflow-operational/user-invocable-only`, and its
dormancy and coexistence cases expected the skill to stay silent on a
natural request. The `open-pull-request` family is re-authored for the
model-invocable class (the explicit case unchanged, the dormancy case
replaced by a close-negative that routes to `ad-merge` with `ad-pr` dormant,
the coexistence case expecting `ad-commit` then `ad-pr` behind approvals,
with a `bypassed-approval` broken receipt), and `ad-hooks` becomes the
user-invocable-only workflow representative with `wire-quality-gates-{explicit,dormancy,coexistence}`
and six synthetic receipts. The sample stream that fired a dormant skill
inside a subagent now fires `ad-hooks`. Corpus gate: 18 cases, 39 receipts,
no gap. The dogfood and the operator's user-level installs were refreshed;
the host listed both skills as invocable again in the same session.

### 2026-09-22 — Review

Fresh two-axis review (`.agentic/reviews/2026-09-22T16-00-35Z-task-0087-*.md`,
machine-local). Standards: no findings (flags, caps, dogfood parity, state
hashes, ADR cross-references, changelog placement all verified against the
tree). Spec: one Blocker, applied: ADR-0084 decision 3 claimed no other
description was shortened while the Codex `ad-audit` and `ad-review`
descriptions were tightened for the budget; the decision, its trade-off,
the changelog entry, and this task's criteria now say so.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
