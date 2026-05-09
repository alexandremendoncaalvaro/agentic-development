# ADR-0011: Spec-driven skill `agentic-spec` for feature-level specification at `doc/specs/NNNN-<slug>.md`

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

Spec-driven development with LLMs has converged on a four-layer artifact stack across the active 2025–2026 ecosystem (most prominently in [GitHub Spec Kit](https://github.com/github/spec-kit), which ships templates for `constitution.md`, `spec.md`, `plan.md`, and `tasks.md`):

1. **Constitution** — operational guide and engineering philosophy (the kit's [`AGENTS.md`](../../AGENTS.md) plus [`WORKFLOW.md`](../../WORKFLOW.md) ).
2. **Specs** — feature-level requirements: who the feature is for, what it must do, the measurable success criteria, the non-goals.
3. **Plans / decisions** — system patterns ([`ARCHITECTURE.md`](../../ARCHITECTURE.md)), binding architectural decisions ([`doc/adr/`](.)), and per-task plans ([`doc/tasks/`](../tasks)).
4. **Code** — the implementation, the canonical doc of behavior per [ADR-0008](0008-documentation-discipline.md) Rule 6.

The kit covers layers 1, 3, and 4. **Layer 2 has no primitive.** Today the closest analog is `AGENTS.md`'s one-sentence "Project Overview" (too coarse for a feature) and the per-task `Acceptance Criteria` in [`templates/task.md`](../../templates/task.md) (too narrow for a feature — a task is a work unit, a spec is the feature multiple tasks implement). Without a feature-level spec primitive, agents are left to infer "what does success look like for this feature" from a mix of partial sources (commit messages, AGENTS.md prose, scattered tasks), which is exactly the failure mode [WORKFLOW.md §1](../../WORKFLOW.md) flags as the cause of bloat in `AGENTS.md`.

[Spec Kit's spec template](https://github.com/github/spec-kit/blob/main/templates/spec-template.md) (4.5 KB, mandatory sections **User Scenarios & Testing**, **Requirements**, **Success Criteria**, **Assumptions**; subsections **Functional Requirements**, **Key Entities**, **Measurable Outcomes**, **Edge Cases**, **Acceptance Scenarios**) is the most-cited reference for this layer in the current ecosystem. Anthropic's prompting guidance ("be specific, give examples, name success criteria") points the same direction without prescribing an artifact. Cursor / Aider / Cline leave the gap to user discretion.

The user surfaced this gap explicitly: their daily practice on non-trivial features writes a feature-level spec before tasks are decomposed, but the kit has nothing to scaffold that artifact. The gap is consistent across both industry validation and lived practice.

[`WORKFLOW.md` §1 "Spec-Driven Design"](../../WORKFLOW.md) already names "Spec-Driven Design" as the kit's first principle and enumerates three context types (operational / canonical / on-demand). It does **not** articulate the four-layer artifact stack, which leaves contributors to discover the layering by reading every ADR and skill.

## Decision

We will introduce one spec-driven skill, **`agentic-spec`**, that scaffolds feature-level specifications at `doc/specs/NNNN-<slug>.md`. The template adapts Spec Kit's mandatory sections to the kit's documentation discipline rules ([ADR-0008](0008-documentation-discipline.md) — business context first, no narrative dates, one scope per doc). Decision-record exemption applies: spec status lifecycle and a Created date are part of the artifact, mirroring ADR-0008's reconciliation for ADRs and tasks.

1. **Skill name `agentic-spec`.** Spec-driven category per [ADR-0007](0007-workflow-operational-skills.md). Auto-installed alongside the universal skill set; the skill's own description keywords include both "spec" and "PRD" so verbal triggers from either tradition land the right skill.

2. **Output path `doc/specs/NNNN-<slug>.md`.** Plural directory matches the existing `doc/adr/` and `doc/tasks/` conventions. `NNNN` is the next available 4-digit number after the highest existing spec — same numbering rule as ADR and task. Slug: kebab-case, ≤6 words, derived from the feature title.

3. **Status lifecycle: `draft | accepted | shipped | superseded by SPEC-NNNN`.** `draft` while writing; `accepted` once the user signs off and feature work begins; `shipped` after release; `superseded by SPEC-NNNN` when a later spec replaces this one. The `shipped` state is the spec-equivalent of an ADR's `accepted` — the moment after which the spec is binding history rather than active scope.

4. **Template structure adapted from Spec Kit.** Mandatory sections: **Context** (business context first per ADR-0008), **User Scenarios** (Given-When-Then for the key flows), **Requirements** (Functional + Non-functional), **Success Criteria** (each as a measurable checkbox per WORKFLOW.md §1), **Edge Cases**, **Out of Scope** (explicit non-goals to prevent scope creep), **Open Questions** (deferred decisions that may become ADRs), **Related** (cross-links to ADRs and tasks).

5. **Coupling with existing artifacts.** The task template [`templates/task.md`](../../templates/task.md) gains a `**Spec ref:**` field above the existing `**Board ref:**`, both optional. `Spec ref` carries the path or number of the spec the task implements; `Board ref` retains its meaning for teams using Linear / Jira / GitHub Issues alongside file-based tracking. ADRs and architecture docs may reference specs in their Context when the decision is spec-driven.

6. **`WORKFLOW.md` §1 expansion.** Section 1 will articulate the four-layer artifact stack explicitly — Constitution → Spec → Plan / Decisions → Code — so the layering is visible from the philosophy doc rather than implicit in the union of ADRs and skill descriptions. The existing three-context-type frame (operational / canonical / on-demand) is preserved as the loading-mechanism framing; the four-layer stack is the artifact-purpose framing. Both views ship side by side.

7. **Codex parity is asymmetric.** Same posture as [ADR-0007](0007-workflow-operational-skills.md) on `agentic-review` and [ADR-0010](0010-agentic-ground-skill.md) on `agentic-ground` — auto-trigger on Codex is best-effort; the skill body advises manual invocation when description-trigger does not fire.

8. **Universal install, not opt-in.** Same posture as `agentic-task` and `agentic-adr`: the primitive is broadly valuable; lazy-loading means zero token cost when not invoked. Projects that never write feature specs simply never call the skill — there is no penalty for installing it.

## Consequences

Positive:

- Closes the layer-2 gap industry validation already documents. The kit ships a complete four-layer stack for the first time.
- Feature-level intent stops being inferred from commit messages, scattered tasks, and `AGENTS.md` "Project Overview" prose. Specs are written down once and referenced by every task that implements them.
- The cross-link `Spec ref` on tasks turns "what feature does this task serve?" from an archaeological question into a hyperlink.
- WORKFLOW.md §1 expansion gives contributors the artifact-stack mental model in one place rather than across nine ADRs.
- The template structure is industry-validated (Spec Kit). New users transferring from Spec Kit projects find familiar sections; the kit gains adoption surface.
- Mirrors [ADR-0010](0010-agentic-ground-skill.md)'s industry alignment posture: established external pattern, adapted to the kit's discipline rules, named and routed via the kit's own skill mechanism.

Negative / trade-offs:

- **Twelve universal-or-conditional skills now in the kit.** Description-load on session start grows by one. Mitigation: skill descriptions stay under the 1,536-character cap; bodies lazy-load. The cost is monotone and small per skill.
- **Risk of spec-vs-task confusion.** Both have acceptance / success criteria, both are checkbox-based, both live under `doc/`. Mitigation: spec is feature-level, task is work-unit-level, and the `Spec ref` linkage makes the relationship explicit in every task that implements a spec. Documentation discipline Rule 5 (one scope per doc) keeps each artifact narrow.
- **Risk of spec drift vs implementation.** A spec written six months ago and never revisited drifts from the code that ships under it. Mitigation: `agentic-audit` ([Task 0010](../tasks/0010-v0.3-review-followups.md) follow-ups will eventually extend it) gains "spec drift" as a candidate category in a later ADR; for v0.5 the spec is human-maintained and the audit category is deferred.
- **Numbering collision risk if the user adopts an external numbering scheme.** Same risk that already exists for ADRs and tasks; same mitigation — the skill scans `doc/specs/` for the highest existing N and increments, never assumes a starting point.
- **`doc/specs/` does not exist on existing v0.4 installs.** The skill creates it on first invocation, same as `agentic-adr` and `agentic-task` do for their directories. No migration tool needed.

## Alternatives Considered

- **Name the skill `agentic-prd`.** Rejected per F1. "PRD" carries enterprise-PM connotations (broad strategic doc, market positioning, release roadmaps) that overshoot what an LLM-paired feature spec needs; Spec Kit's "spec" naming has industry traction in 2025–2026 and aligns with the user's own [`WORKFLOW.md` §1](../../WORKFLOW.md) "Spec-Driven Design" framing. The skill's description keywords still include "PRD" so verbal triggers land the same skill.
- **Make the skill opt-in only (like `agentic-skill`).** Rejected per F2. Feature-level specification is broadly valuable; the lazy-load mechanism means zero cost when not invoked. Opt-in would force the same gap that motivated this ADR — users who don't know the skill exists wouldn't add it.
- **Place specs under `doc/features/` or `doc/prds/`.** Rejected per F3. `doc/specs/` matches the plural-directory convention already used by `doc/adr/` and `doc/tasks/`; it also matches Spec Kit's `spec*.md` naming, which aids cross-tool muscle memory.
- **Invent a custom template instead of adapting Spec Kit's structure.** Rejected per F4. Industry-validated structure beats novel structure; users transferring between tools find familiar sections; we sidestep NIH risk entirely.
- **Replace the task template's `Board ref` field with `Spec ref` outright.** Rejected per F5. Teams using Linear / Jira / GitHub Issues alongside file-based tracking still need `Board ref`; both fields ship side-by-side, both optional. Killing `Board ref` would break existing v0.4 task files that use it.
- **Skip the `WORKFLOW.md` §1 expansion and only ship the skill.** Rejected per F6. Without the four-layer stack articulated in the philosophy doc, the layering remains implicit and contributors discover it by reading every ADR. Articulating the stack costs four sentences; the clarity gain is large.
- **Status lifecycle without `shipped`.** Rejected per F7. Without `shipped`, an `accepted` spec stays "active" forever; downstream filters (e.g., "list specs currently in flight") have no way to distinguish scope-being-built from scope-already-released. `shipped` is the moment after which the spec is binding history.
- **Defer to v0.6 and ship spec discipline as ADR text only.** Rejected. The same anti-pattern [ADR-0007](0007-workflow-operational-skills.md) §1 named: "documenting a practice without delivering automation produces inconsistency between what the kit obligates and what it ships." A spec-driven kit without a spec primitive is exactly that inconsistency.
