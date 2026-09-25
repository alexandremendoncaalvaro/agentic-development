# Task `0088`: Make every skill model-invocable behind its in-skill gate

**Status:** in-progress
**Created:** 2026-09-24
**Scope ref:** doc/adr/0085-gate-skill-effects-inside-the-skill.md
**Evidence ref:** doc/research/0030-skill-invocation-control-and-listing-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0007-evaluate-skill-trajectories.md
**Board ref:**

## Context

Seventeen kit skills cannot be started by the agent even when the owner asks for them, because ADR-0073 blocks model invocation of every outward-facing or setup verb on both hosts. RESEARCH-0030 found that the block's budget reason does not hold (the kit overflows a 200k-window listing with or without it) and that its safety reason is carried by the approval step inside each skill. ADR-0085 replaces the class rule with an effect-gate rule; this task applies it to the kit, its tests, its dogfood install, and the evaluation corpus that was authored around the retired class.

## Acceptance Criteria

- [x] Each of the 17 skills is verified, on both hosts, to run every outward or irreversible effect only after an approval step in its body; any skill found without one receives the step in this change.
- [x] No kit skill carries `disable-model-invocation: true` on Claude Code or `policy.allow_implicit_invocation: false` on Codex, and `test/skills.test.js` fails when either appears outside an explicit exception set that is empty.
- [x] Every description on both hosts is at most 350 characters, opens with the use case and trigger phrases, and stays within 1,024; the 8,000-character total is no longer enforced.
- [ ] The evaluation corpus carries no `user-invocable-only` case, every representative keeps its positive, boundary or dormancy, and coexistence coverage, and the corpus gate is green.
- [ ] `AGENTS.md`, `ARCHITECTURE.md`, `doc/adr/PROJECTION.md`, and the `ad-skill` authoring guidance state the effect-gate rule instead of the invoker classes.
- [ ] The dogfood install is refreshed and byte-identical to `src/skills/`; `npm run verify` is green.

## Plan

- [x] `/ad-research`: RESEARCH-0030, concluded with the owner's approval.
- [x] `/ad-adr`: ADR-0085 proposed, amending ADR-0073.
- [x] Gate verification of the 17 skills; add any missing approval step.
- [x] Red, then green: the flag and cap tests in `test/skills.test.js`, then the frontmatter, YAML, and description changes on both hosts.
- [ ] Re-author the `bootstrap-agents-guide` and `wire-quality-gates` case families for the model-invocable class.
- [ ] Update the binding docs and refresh the dogfood install.
- [ ] `/ad-review` per slice, `/ad-audit` before the pull request, `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-24

Opened after the owner asked why the agent could not start `/ad-level-up` and judged the host block a defect. RESEARCH-0030 measured two one-turn Claude Code sessions (USD 0.034): the kit as shipped overflows the 200k-window listing (41 skills, 13,647 characters against 8,000), and with every skill unblocked it overflows further (58 skills, 19,757 characters). The owner approved the study conclusion in session.

Gate verification (a read-only reviewer over both hosts, every claim re-read by the author in source): 14 of the 17 skills already gate every outward or irreversible effect or have none. Three had a narrow gap and received the missing step in this change, on both hosts: `ad-hooks` wrote session-lifecycle hooks after only a notice, now only on request and after approval of the exact merged JSON; `ad-report` could write to an inferred target outside the repository or over an existing file, now confirmed first; `ad-update` ran its preview, which downloads and executes the latest published package, without a request, and applied a legacy migration without waiting, now both wait. Smaller findings kept for follow-up, not gates under the rule: the approval records `template-store.mjs` and `release-plan.mjs` check are written by the agent, so the prose instruction stays the real gate; `voice-profile.mjs write` replaces the profile without a backup; `ad-skill` and `ad-subagent` overwrite a same-named personal file silently.

Red, then green: `test/skills.test.js` replaced the class list with an empty host-block exception set and one 350-character cap for every description; red with 60 failures (17 skills times the two host flags, plus 26 over-cap descriptions), then green after the descriptions were rewritten trigger-first on both hosts and the flags removed (573 tests). The per-prompt checkpoint in `workflow-checkpoint.mjs` said "/ad-pr stays with the user", stale since ADR-0084; it now says pull request and merge ask the owner once. `ad-skill` authoring guidance, `AGENTS.md`, and `ARCHITECTURE.md` state the effect-gate rule. Dogfood refreshed; the host listed the 17 skills as available to the model in the next turn. Full suite 1124/1124.

Fresh two-axis review of this slice (`.agentic/reviews/2026-09-25T02-19-58Z-task-0088-slice2-*`, machine-local): no Blocker. Spec Concern applied: `ad-skill` and `ad-subagent` could overwrite a same-named personal-scope file outside the repository, an irreversible effect under ADR-0085 decision 1 that the note above had wrongly filed as a follow-up; both now show an existing file and overwrite it only after approval, on both hosts. Standards Concerns: the `CONTEXT.md` "Dormant skill" definition moves with the corpus slice; `doc/adr/PROJECTION.md` changes in the commit that accepts ADR-0085, as its test requires.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
