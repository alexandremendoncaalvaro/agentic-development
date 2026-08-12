# ADR-0067: Require repository-local scope anchors for new tasks

**Status:** accepted
**Date:** 2026-08-12
**Deciders:** Alexandre Alvaro

## Context

Two proposed tasks for publication and reporting work entered this repository
without a product, specification, decision, code, or roadmap connection to
`@alexandrealvaro/agentic`. They were created from instructions that belonged
to a separate repository. The task format allowed both `Spec ref` and
`Board ref` to be empty, so no durable repository-local fact had to establish
that the work belonged here.

The kit must keep an external board reference optional for solo projects and
must still allow a small work unit to begin before a feature specification
exists. Neither need justifies a task with no local scope anchor.

## Decision

Every new task created by `ad-task` will carry a required `Scope ref` to an
existing repository-local source artifact: a product roadmap, feature
specification, accepted ADR, or root artifact that defines the work.

Before allocating a task number, `ad-task` will establish the current
repository and locate that anchor. A board ticket, global rule, or remembered
request from another repository is supplementary evidence only; it cannot
replace `Scope ref`. When no local anchor exists, the skill will not create a
task. It will first create or amend the product, specification, or decision
artifact that supplies the anchor.

`Spec ref` remains optional. Existing completed tasks remain historical
records. Active task navigation treats an explicit `Scope ref` or `Spec ref`
as local scope evidence; a `Board ref` is supplementary and never removes an
unfinished task from the orphan finding.

## Consequences

Positive:

- A task cannot enter a repository solely because a session or global overlay
  carried an idea from elsewhere.
- A reader can trace every new task to a local product or engineering decision
  before implementation starts.
- Small ADR-driven maintenance work remains lightweight because it need not
  invent a feature specification.

Negative / trade-offs:

- Capturing a genuinely new idea takes one additional artifact step before it
  can appear in `doc/tasks/`.
- An incorrect but existing local reference is still a human-review concern;
  the guard establishes provenance, not semantic intent.

## Alternatives Considered

- **Keep `Spec ref` optional with no replacement.** Rejected: that was the
  exact gap through which the out-of-scope tasks entered.
- **Require an external board ticket.** Rejected: it makes solo work depend on
  an external system and cannot prove which repository owns the work.
- **Infer task ownership from agent memory or global rules.** Rejected: those
  sources are precisely where cross-repository context can leak.
