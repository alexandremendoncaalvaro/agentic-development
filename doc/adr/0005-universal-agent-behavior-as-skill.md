# ADR-0005: Universal Agent Behavior lives in an `agentic-philosophy` skill, not in `AGENTS.md`

**Status:** accepted
**Date:** 2026-05-08
**Deciders:** Alexandre Alvaro

## Context

Surfaced during dogfooding (see [Task 0006](../tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md)). Today, [`src/lib/render.js`](../../src/lib/render.js) concatenates two templates into a single `AGENTS.md`:

- [`templates/agents-project.md`](../../templates/agents-project.md) — per-project operational facts (stack, build/test, conventions, gotchas).
- [`templates/agents-general.md`](../../templates/agents-general.md) — universal agent behavior (Think Before Coding, Ground Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution, Verify Before Claiming Done — 82 lines).

Two problems:

1. The general content is repository-agnostic. Concatenating it inflates every project's `AGENTS.md` by ~80 lines (41% of the file in this repo). Industry guidance (agents.md spec, GitHub's analysis of 2,500+ repos, Builder.io / OpenAI Codex guides) consistently flags generic agent advice as the #1 anti-pattern. Bloat causes the agent to skim or ignore the file.
2. `AGENTS.md` is loaded at every session start. Universal behavior content is recurring token cost on every turn, regardless of whether the current task benefits from it.

The kit's own [`WORKFLOW.md:39`](../../WORKFLOW.md) already states the correct pattern: *"On-demand context is `SKILL.md`. Description loads at session start … and body loads only when the skill is invoked. Use it for repeatable workflows or domain knowledge that shouldn't pay a token cost on every turn."*

[ADR-0001](0001-skills-mode-for-claude-and-codex.md) and [ADR-0002](0002-two-phase-architecture.md) already commit the kit to a skills-based architecture. Universal Agent Behavior fits the on-demand surface exactly.

## Decision

We will:

1. **Stop bundling `agents-general.md` into `AGENTS.md`.** [`src/lib/render.js`](../../src/lib/render.js) and [`prompts/agents.md`](../../prompts/agents.md) emit project content only. The merged H1 fix described in `prompts/agents.md` is dropped.
2. **Ship Universal Agent Behavior as a project-level skill: `agentic-philosophy`.** Two source trees per ADR-0001:
   - `src/skills/claude-code/agentic-philosophy/SKILL.md`
   - `src/skills/codex/agentic-philosophy/SKILL.md` plus `agents/openai.yaml`
3. **Auto-install `agentic-philosophy` alongside `agentic-bootstrap`** when the user runs `agentic init`. It joins the universal skill set ([Task 0003](../tasks/0003-universal-skills.md) scope) — installed for every project regardless of stack.
4. **Skill body = today's `agents-general.md` content, trimmed where possible.** Frontmatter `description` includes triggers like *"think before coding"*, *"verify before claiming done"*, *"non-trivial change"* so the agent auto-invokes when the task warrants it.
5. **Delete [`templates/agents-general.md`](../../templates/agents-general.md)** once the skill ships and the bootstrap flow no longer references it.

Source-of-truth content moves from a template (eagerly inlined) to a skill (lazily loaded). The behavior contract is unchanged — only the loading mechanism differs.

## Consequences

Positive:

- `AGENTS.md` shrinks by ~80 lines for every kit user. Lands inside the 80-150 line sweet spot the industry analysis recommends.
- Universal behavior content stops paying token cost on trivial turns (renaming a variable, fixing a typo) where it adds nothing.
- Updating universal behavior no longer requires every existing project to regenerate `AGENTS.md` — a `npx @alexandrealvaro/agentic init` pulls the new skill version.
- One topic per Markdown file (the kit's own [WORKFLOW.md:33](../../WORKFLOW.md) principle).
- Aligns with [ADR-0001](0001-skills-mode-for-claude-and-codex.md): everything ships as skills, no special cases.

Negative / trade-offs:

- Skill auto-invocation depends on the agent matching `description` triggers. If the trigger doesn't fire, the universal guardrails are not loaded. Mitigation: keep `description` broad and include common task framings; document `/agentic-philosophy` for manual invocation.
- Codex auto-invocation is less mature than Claude Code's. Mitigation: the installed `AGENTS.md` references the skill explicitly so Codex follows the pointer (same defensive pattern as ADR-0001).
- Users who prefer the old "everything inline" form lose that affordance. Acceptable — the inline form was the bug we're fixing.

## Alternatives Considered

- **Option (b): Remove from output entirely; content lives only in [`WORKFLOW.md`](../../WORKFLOW.md).** Rejected. Removes the operational signal — the agent never sees the rules unless the user manually pastes them. Defeats the kit's promise of agent-ready scaffolding.
- **Option (c): Trim to ≤15 lines, keep inline in `AGENTS.md`.** Rejected. Compromise that still pays the token cost on every turn for content that's only relevant on non-trivial work, and still mixes universal content with per-project content in a single file.
- **Skill at user level (`~/.claude/skills/`) instead of project level.** Rejected. Not committable, not shareable with team or contributors. Same reasoning as ADR-0001.
- **Hook instead of skill.** Rejected. Hooks fire on events, not on task complexity. The signal we want — *"this task is non-trivial, load the guardrails"* — is what skill auto-invocation already provides.