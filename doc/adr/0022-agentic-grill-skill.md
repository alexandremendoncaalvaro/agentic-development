# ADR-0022: Workflow-operational skill `agentic-grill` for interview-before-research grilling sessions

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`WORKFLOW.md`](../../WORKFLOW.md) §4 (Find the Happy Path) and §5 (Ground in Real Patterns) cover the *research before implementation* phase, operationalized by [`agentic-ground`](0010-agentic-ground-skill.md). They presuppose a clear question to research. In practice, the agent often starts a session with a *fuzzy* question — vocabulary the user has not been challenged to sharpen, scope that bundles several decisions into one ask, scenarios that have not been stress-tested.

The cross-pollination pass against [`mattpocock/skills`](https://github.com/mattpocock/skills) — performed on 2026-05-10 against branch `cli`, captured in [task-0020](../tasks/0020-mattpocock-absorptions.md) — surfaced this gap directly. Pocock ships [`grill-with-docs`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md): an interview-relentlessly skill that resolves vocabulary inline against `CONTEXT.md`, walks the design tree branch-by-branch, asks one question at a time, and explores the codebase in place of asking when an answer is in code.

The kit covers nearby practices but none replaces this one:

- [`agentic-ground`](0010-agentic-ground-skill.md) covers research after the question is sharp. Stops at "what is the canonical approach for this problem?". Grilling starts upstream of that — given a fuzzy ask, *what is the actual problem we are solving, and using which words*?
- [`agentic-tdg`](0018-agentic-tdg-skill.md) covers implementation when the technique is known and multiple strategies exist. Starts after research finishes.
- [`agentic-spike`](0017-agentic-spike-skill.md) covers cases where the technique itself is uncertain across plausible approaches. Starts after research surfaces the techniques.
- [`agentic-philosophy`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) Goal-Driven Execution names "ask one question at a time" as posture but does not scaffold a structured grilling pass.

Adding `agentic-grill` upstream of `agentic-ground` closes the gap and gives every WORKFLOW phase its operationalizing skill:

| Phase | Skill |
| --- | --- |
| §4 Sharpen the question | **`agentic-grill`** (this ADR) |
| §4–5 Find the happy path + ground patterns | `agentic-ground` |
| §9 Implement (technique known, strategy uncertain) | `agentic-tdg` |
| §14 Spike (technique uncertain) | `agentic-spike` |
| §10 Review | `agentic-review` |
| §11 Quality gates | `agentic-hooks` |
| §15 Diagnose | `agentic-diagnose` (per [ADR-0021](0021-diagnose-discipline.md)) |

This ADR was deferred from v0.14 alongside ADR-0019 / 0020 / 0021 (the principles release) and is accepted now as part of the v0.15 bundle. Per [ADR-0007](0007-workflow-operational-skills.md) §6, the skill ships with its own ADR; this is it.

## Decision

We will introduce a workflow-operational skill, **`agentic-grill`**, that scaffolds the interview-before-research phase. Universal install across every profile per [ADR-0013](0013-project-maturity-profiles.md).

1. **Skill name `agentic-grill`.** Workflow-operational. Universal in `poc`, `solo`, `team`, `mature`. Description triggers on the §4 / §5 keywords: "grill me", "interview me", "stress test the plan", "challenge my assumptions", "before implementing", "ask me questions", "fuzzy ask", "sharpen the question", "what should I clarify".

2. **Five-step body, mirrors mattpocock's pattern adapted to this kit's discipline:**
   - **Step 0: Confirm regime.** Grill is for the *fuzzy-question, scope-uncertain* regime. Run only when the user's ask is broad, ambiguous, or bundles multiple decisions. Route elsewhere when the ask is already sharp (`agentic-ground` for research, `agentic-tdg` for implementation, `agentic-spike` for technique discovery, `agentic-diagnose` for debugging).
   - **Step 1: Codebase-first.** Before asking, search the codebase for an answer. `Glob` / `Grep` / `Read` the surface the question touches. If `CONTEXT.md` exists ([ADR-0019](0019-domain-language-layer.md)), read it first to anchor vocabulary.
   - **Step 2: One question at a time.** Each question carries a recommended answer. Wait for feedback before the next question. Never batch a list. Walk the design tree branch by branch.
   - **Step 3: Challenge, sharpen, scenario-test.** Three discipline patterns:
     - *Challenge against the glossary.* When the user's term conflicts with `CONTEXT.md`, surface it: "Your glossary defines X as Y, but you seem to mean Z — which is it?"
     - *Sharpen fuzzy language.* When the user uses a vague term ("account", "user"), propose the canonical resolution.
     - *Scenario-test relationships.* When two concepts interact, invent a concrete edge case that forces precision.
   - **Step 4: Capture inline.** When a term resolves, route to `/agentic-domain` ([task-0021](../tasks/0021-agentic-domain-skill.md)) to update `CONTEXT.md`. When a binding decision crystallizes that meets the three-criteria test (hard to reverse, surprising without context, real trade-off), route to `/agentic-adr`. Never batch — capture as it happens.

3. **No primary file output.** Grill is a process scaffold. Side-effects land in `CONTEXT.md` (via `agentic-domain`) and ADRs (via `agentic-adr`) — both lazy, both belonging to other skills. Grill itself does not write a `doc/grills/` artifact.

4. **Codex parity is symmetric.** Grilling is agent-agnostic; both variants ship. Auto-trigger asymmetry per [ADR-0007](0007-workflow-operational-skills.md) applies — Codex variant invites manual invocation when auto-trigger does not fire.

5. **Three-criteria ADR rule (Pocock's discipline).** When grilling surfaces a candidate decision, offer an ADR only when **all three** are true: (a) hard to reverse, (b) surprising without context, (c) the result of a real trade-off with named alternatives. Otherwise, skip the ADR — capture the resolution in the conversation or the task `Notes`. This rule is repeated in `agentic-grill`, `agentic-domain`, and the existing `agentic-adr` skill so the bar is uniform.

6. **Cross-references in skill bodies.**
   - `agentic-grill` Step 0 routes to `/agentic-ground` (research-ready ask), `/agentic-tdg` (implement-ready ask), `/agentic-spike` (technique discovery), `/agentic-diagnose` (debugging).
   - `agentic-grill` Step 4 routes to `/agentic-domain` (term resolution → `CONTEXT.md`), `/agentic-adr` (decision crystallization → `doc/adr/`).
   - `agentic-ground` Step 0 cross-references back: "If the question is fuzzy, `/agentic-grill` first."
   - `agentic-philosophy` Goal-Driven Execution cross-references `agentic-grill` for the "one question at a time" practice.

## Consequences

**Positive.**
- Closes the upstream-of-research gap. Every WORKFLOW phase now has a corresponding operationalizing skill.
- Pairs naturally with `agentic-domain` (term resolution → `CONTEXT.md`) and `agentic-adr` (decision crystallization → `doc/adr/`). Grill is the *trigger*; the other two own the *capture*.
- Forces single-question discipline by skill-body shape, not by reminder. The kit's `agentic-philosophy` already names the practice; the skill makes it operational.
- Universal install matches the WORKFLOW-principles-bind-every-profile rule from [ADR-0013](0013-project-maturity-profiles.md). A `poc` user benefits from grilling on the first commit; a `mature` user benefits when scope creep starts.
- Codebase-first discipline (Step 1) reduces user interrupts — most "what does X do?" questions are answerable by reading the code.

**Negative / trade-offs.**
- **Fourth implementation-phase routing decision.** Step 0 now includes a fourth option (grill → ground / tdg / spike / diagnose). Mitigated by the explicit decision table in the skill body and the matching cross-references from each downstream skill.
- **No primary artifact.** Same trade-off as `agentic-tdg` — the skill produces structured conversation, not a persistent file. Audit trail lives in `CONTEXT.md` updates (when present), ADRs (when justified), and the task `Notes` log.
- **Depends on `agentic-domain`.** The "capture inline" step routes to `/agentic-domain` for `CONTEXT.md` updates. If `agentic-domain` is not installed (custom profile), the route degrades to "user manually edits `CONTEXT.md`" or "skip capture." Mitigated: both ship in the same v0.15 bundle; the dependency is satisfied by default.
- **Three-criteria ADR rule may suppress useful ADRs.** A team that wants to record more decisions than the bar admits will feel the rule too strict. Mitigated: the rule is the *default*; the user can always invoke `/agentic-adr` directly without the gate.

## Alternatives considered

- **Merge `agentic-grill` and `agentic-domain` into a single `grill-with-docs` skill (mattpocock's pattern).** Rejected for kit consistency: Pocock's kit has no separate "draft an ADR" or "draft a spec" skill — his grilling skill does both as side effects. This kit has [`agentic-adr`](0007-workflow-operational-skills.md), [`agentic-spec`](0011-agentic-spec-skill.md), [`agentic-task`](0004-file-based-task-tracking.md), and [`agentic-architecture`](0006-architecture-md-at-repo-root.md) as separate skills per the one-skill-per-artifact rule. Splitting `agentic-grill` (the trigger) from `agentic-domain` (the artifact owner) matches that pattern. The cost is one extra skill to install; the benefit is consistent skill boundaries. The split is documented in [task-0020](../tasks/0020-mattpocock-absorptions.md) Phase 2 ordering.

- **Fold into `agentic-ground` as a Step 0.** Rejected. Ground assumes a sharp question; folding grill in would either inflate every research turn with grilling overhead, or push grill behind a Step 0 gate that re-creates the routing problem we already solve at the skill-router level. Two skills with explicit routing is cleaner than one skill with internal mode-switching.

- **Fold into `agentic-philosophy` as posture only.** Rejected. The "ask one question at a time" practice is in `agentic-philosophy` Goal-Driven Execution, but posture cannot scaffold the codebase-first / one-at-a-time / scenario-test loop. The skill body is required to operationalize the principle; posture alone leaves it as a hope.

- **Defer to v0.16 as originally scheduled in [task-0022](../tasks/0022-agentic-grill-skill.md) stub.** Rejected. The user's 2026-05-10 decision to bundle the four Phase-2 skills into v0.15 settles this; the per-minor split was the original schedule, not a binding constraint.

- **Make `agentic-grill` opt-in (conditional, not universal).** Rejected. Fuzzy asks arise at every project maturity. Universal install matches the same logic that universalized `agentic-ground`, `agentic-tdg`, and `agentic-spike` — discipline that applies to every profile lives in `universal`.

## References

- [`mattpocock/skills` `grill-with-docs/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) — direct prior art for the interview pattern, codebase-first discipline, glossary-aware sharpening, and three-criteria ADR rule.
- [`mattpocock/skills` `grill-me/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) — generic interviewer variant; this skill adopts the docs-aware shape.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill category and the per-skill-ADR rule.
- [ADR-0010](0010-agentic-ground-skill.md) — `agentic-ground` skill, the downstream research phase.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog the new universal skill will join.
- [ADR-0019](0019-domain-language-layer.md) — Domain layer (`CONTEXT.md`); the natural capture target for terms grilling resolves.
- [ADR-0018](0018-agentic-tdg-skill.md) — `agentic-tdg`, the downstream implementation phase when the question is research-resolved.
- [task-0020](../tasks/0020-mattpocock-absorptions.md) — Phase-2 schedule that this ADR closes.
- [task-0022](../tasks/0022-agentic-grill-skill.md) — implementing task.
