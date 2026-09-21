# Task `0082`: Recognize implicit skill activation on Claude Code

**Status:** proposed
**Created:** 2026-09-21
**Scope ref:** doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md
**Evidence ref:** doc/research/0025-ground-host-stream-adapters.md — 2026-09-21 addendum
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0007-evaluate-skill-trajectories.md

## Context

The first authorized live pilot measured what the Claude Code adapter assumed.
GROUND-0025 recorded that only Codex needs a `SKILL.md`-read mapping for
implicit activation, because Claude Code emits a skill record of its own. The
pilot shows that is wrong: with `Skill` listed among the session's available
tools, the model read `.claude/skills/ad-task/SKILL.md` with the ordinary `Read`
tool and then followed the skill — ran its script, read its template, produced
its artifact. The adapter scored the trial `skill_invoked: 0`, and the `Read`
landed in `unmapped`.

The consequence is a false negative in merged code: the route grader fails a
trial whose skill did route it. Every model-invocable case in the corpus is
scored the same way, so today the live lane cannot pass a case it should pass.

## Acceptance Criteria

- [ ] A Claude Code trial whose stream contains no `Skill` record but reads a `SKILL.md` under a skills root is recognized as an invocation of that skill, on the same terms the Codex adapter already uses.
- [ ] A read of a `SKILL.md` that is not under a skills root, or that names no skill, is not an invocation.
- [ ] A trial that carries both a `Skill` record and a `SKILL.md` read reports one invocation, not two.
- [ ] The pilot's captured stream, or a fixture faithful to it, is a test case, so the defect cannot return silently.
- [ ] GROUND-0025 and ADR-0080 record which reading now binds and what measured it.

## Plan

- [ ] Confirm the finding under a bare context policy before generalizing it; the pilot inherited the operator's global configuration, and GROUND-0025 names that as a limitation.
- [ ] Design the recognition rule in its own commit, then implement test-first.
- [ ] Re-run the pilot case and confirm the trial now routes.

## Notes

### 2026-09-21 — Opened from the live pilot

Held out of task-0081 deliberately. That task built the lane and ran the pilot;
this changes how every existing case is graded, which is a semantic change to
merged behavior and deserves its own design, review, and blast-radius
discussion rather than riding along in the branch that discovered it.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
