# ADR-0007: Workflow-operational skills as a parallel category to spec-driven skills

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

Surfaced during planning of [Task 0003](../tasks/0003-universal-skills.md) (Chunk 2 of v0.2). The current skill set in [`doc/v0.2-cli-plan.md`](../v0.2-cli-plan.md) (table at lines 80–89) is uniformly **spec-driven**: every planned skill produces a documentation artifact (`AGENTS.md`, `ARCHITECTURE.md`, ADR, task file, `DESIGN.md`, `SKILL.md`, subagent file, drift report). ADR-0005 added one prescriptive skill (`agentic-philosophy`) but it carries content, not process.

[`WORKFLOW.md`](../../WORKFLOW.md) declares 14 numbered practices. Only §1 (Spec-Driven Design) maps to a planned skill. §4 (Find the Happy Path), §5 (Ground in Real Patterns), §6 (Explore → Plan → Implement → Commit), §9 (Outcome-Based Prompting / TDG), §10 (Reviewer With Fresh Context), §11 (Quality Gates scaffolding), and §14 (Staged Spikes With Golden Fixtures) describe **operations the agent performs**, not artifacts it produces. None has a planned skill.

Three concrete inconsistencies follow from this gap:

1. **§10 is required by every task DoD but not automated.** The task template at [`templates/task.md:41`](../../templates/task.md) ships `Code review completed (human or fresh-context reviewer per WORKFLOW §10)` as a Definition-of-Done item. Six task files (Tasks 0001–0006) inherit that line. Yet every §10 review performed against this kit so far has been manual: see [Task 0006 Notes 2026-05-08](../tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md) (`fresh-context review pass + corrections — fresh-context reviewer (per WORKFLOW.md §10) flagged drift`) and [Task 0002 Notes 2026-05-09 close-out](../tasks/0002-foundation-and-bootstrap-skill.md) where the checkbox was explicitly **skipped** with `user opted to skip a fresh-context review for this task`. The kit obligates a practice it does not ship a tool for.
2. **The reviewer pattern is documented but not delivered.** [`prompts/subagent.md`](../../prompts/subagent.md) (Common patterns table) lists *Fresh-context reviewer* as the first canonical pattern: `Read, Glob, Grep, Bash` tools, `sonnet`, `No write tools`, with the inline note `Matches WORKFLOW §10`. The user can synthesize this subagent by hand, or — once Chunk 3 ships — generate it via `/agentic-subagent`. Neither path produces a pre-baked, on-demand review workflow that handles the `/clear`-and-handoff plumbing §10 actually describes.
3. **The kit doesn't dogfood §10.** This repository has no `.claude/agents/` directory. The reviewer it tells users to maintain doesn't exist for the kit itself.

§10 is the most concrete instance, but the same shape applies to §4, §5, §6, §9, §11, and §14: high-frequency operational practices that an agent could trigger via skill auto-invocation, not artifacts a user generates once per project. Mixing them into the spec-driven category obscures the distinction; treating them as ad-hoc prose in `WORKFLOW.md` leaves them un-automated despite being load-bearing for the kit's quality posture (cf. [`WORKFLOW.md` §12](../../WORKFLOW.md), citing JetBrains *DevEcosystem 2025* and Stack Overflow *2025 Developer Survey* — review and discrimination, not generation, are where AI-assisted code goes wrong).

## Decision

We will introduce a second skill category, **workflow-operational skills**, parallel to the existing spec-driven category, with its own column in the v0.2 plan and its own naming axis.

1. **Categorize skills explicitly** in [`doc/v0.2-cli-plan.md`](../v0.2-cli-plan.md) and the README. Each skill carries one of two markers: `spec-driven` (produces an artifact) or `workflow-operational` (executes a process).
2. **First workflow-operational skill: `agentic-review`.** Implements WORKFLOW §10 end-to-end: assemble the diff, the relevant spec slice (`AGENTS.md`, applicable ADRs, the task file's Acceptance Criteria + Plan), spawn a fresh-context reviewer, return a structured findings list scoped to bugs / coupling / edge cases / spec drift. No "approve" verdict — §10 frames the reviewer as adversarial.
3. **Ship a pre-baked Claude Code subagent** at `src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md` (installed as `.claude/agents/fresh-context-reviewer.md` alongside the skill). Tools `Read, Glob, Grep, Bash`, model `sonnet`, no write access — exactly the pattern documented in [`prompts/subagent.md`](../../prompts/subagent.md). The skill orchestrates; the subagent isolates context. This matches §10's mechanism note (`In Claude Code, this means a subagent`).
4. **Codex parity via `/clear` + handoff orchestration.** Codex has no subagent primitive; the Codex variant of the skill instructs the agent to perform the `/clear`, then re-load only the assembled handoff (diff + spec slice) into the new context. Fidelity to §10 is preserved at the cost of one extra UX step. Documented as the skill's first instruction for Codex. **(SUPERSEDED — see Addendum 2026-05-24 below.)**
5. **Dogfood the kit.** `agentic-review` is installed for the agentic-development repo itself before the next §10-bearing task closes; the unchecked DoD on [Task 0002](../tasks/0002-foundation-and-bootstrap-skill.md) becomes a backfillable item via the new tooling rather than a permanent skip.
6. **Other workflow-operational skills are deferred to v0.3.** [Task 0007](../tasks/0007-workflow-operational-skills-and-agentic-review.md) ships `agentic-review` only. Candidates explicitly out of scope for v0.2: `agentic-spike` (§14), `agentic-tdg` (§9), `agentic-hooks` (§11), `agentic-happy-path` (§4), `agentic-ground` (§5), `agentic-plan-mode` (§6). Each gets its own ADR + task when proposed; this ADR establishes the **category**, not the full inventory.
7. **Auto-install with the universal set.** `agentic-review` joins `agentic-bootstrap` and `agentic-philosophy` as part of the always-installed universal skills.

## Consequences

Positive:

- Closes the documented-but-unautomated gap on WORKFLOW §10. The DoD checkbox stops being a manual coordination tax.
- Establishes a coherent axis for future skills: artifact (spec-driven) vs process (workflow-operational). Naming improves — `agentic-review` reads as a verb, mirroring the operation it performs.
- The kit dogfoods §10 instead of only mandating it. The new `.claude/agents/` directory in this repo makes the practice concrete for users reading the source.
- Aligns with ADR-0001 (everything ships as skills, no special cases) and [ADR-0002](0002-two-phase-architecture.md) (CLI installs, agent runs).
- Mirrors prior art: [Anthropic Skills documentation](https://code.claude.com/docs/en/skills) treats skills as task-shaped capabilities, and [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) make role-shaped delegation a first-class primitive — the same line we are drawing internally.

Negative / trade-offs:

- **Scope expansion in v0.2.** Chunk 2 ([Task 0003](../tasks/0003-universal-skills.md)) was sized for four spec-driven skills plus `agentic-philosophy`. Adding `agentic-review` to the universal set adds a sixth, with the largest surface area (orchestration logic + bundled subagent file). Mitigation: ship `agentic-review` as **Chunk 2.5** in [Task 0007](../tasks/0007-workflow-operational-skills-and-agentic-review.md), keeping Task 0003 scope intact.
- **Codex feature parity is imperfect.** Without a subagent primitive, Codex relies on `/clear` + manual re-prompt. The §10 contract is honored (fresh context, diff + spec only) but the UX is one extra step. Mitigation: document the asymmetry in the skill body; revisit if Codex ships a comparable primitive. **(SUPERSEDED — see Addendum 2026-05-24 below.)**
- **New install target.** Today `installSkills()` only writes under `.claude/skills/<name>/` and `.agents/skills/<name>/` (see [`src/lib/install.js`](../../src/lib/install.js) `AGENT_LAYOUT`). The bundled subagent file lives at `.claude/agents/<name>.md`, a sibling tree. Mitigation: extend `AGENT_LAYOUT` once with an `agentsDir` entry, document the dual target.
- **Risk of category-bloat.** Once a "workflow-operational" lane exists, future ideas may compete to land in it. Mitigation: each new workflow-operational skill requires its own ADR (per item 6), forcing the same scrutiny ADR-0005 received.

## Alternatives Considered

- **Document the §10 review pattern only; no shipped automation.** Rejected. This is the current state. It produces inconsistency (1) above — the kit obligates a practice it does not ship.
- **Pre-bake the reviewer subagent without an orchestrating skill.** Rejected. A standalone subagent file gives the user the worker but not the trigger; they still hand-assemble the handoff (diff + spec slice + acceptance criteria) every time. The skill is the part that codifies *what to load into the fresh context*, which is the failure mode §10 is built to prevent.
- **Bundle the reviewer into `agentic-subagent` (Chunk 3).** Rejected. `agentic-subagent` *generates* new subagents from a template; it does not *deliver* a specific pre-baked one. Coupling them conflates meta-tooling with operational tooling and forces users into Chunk 3 for a Chunk-2-class need.
- **Ship at user level (`~/.claude/skills/`) instead of project level.** Rejected for the same reason as ADR-0001: not committable, not shareable, no team review.
- **Wait for v0.3 to introduce the workflow-operational category as a whole.** Rejected. §10 is already required by every task DoD in v0.2. Deferring the category leaves the inconsistency open through release.

## Addendum — 2026-05-24: Codex subagent primitive shipped; `/clear` choreography superseded

The two premises underwriting Decision §4 and the matching Consequence ("Codex has no subagent primitive"; "Codex parity via `/clear` + handoff orchestration") are factually stale as of late 2025 / early 2026:

- Codex shipped subagents — see [developers.openai.com/codex/subagents](https://developers.openai.com/codex/subagents). Roles configured via `[agents]` blocks in `~/.codex/config.toml`. **Subagents are user-initiated only** — a Codex skill cannot programmatically spawn agents from inside its instructions. The Claude Code `Task` primitive has no Codex equivalent at the skill layer.
- Codex shipped `/clear` ([GH#9965](https://github.com/openai/codex/issues/9965), closed 2026-01-27). The command resets terminal display + conversation context together. There is no "clear context only, keep terminal" command — [GH#19829](https://github.com/openai/codex/issues/19829) tracks the request; still open at this addendum's date.

What this means for the Codex variant of `ad-review`:

- The `/clear` + paste choreography prescribed in Decision §4 was inherited from a moment when Codex had no subagents at all. By the time `/clear` shipped, the UX was already heavy (nuking the terminal scrollback alongside the context), and skills could not orchestrate sub-reviewers anyway.
- Commit `3fabb92` (2026-05-23) rewrites the Codex variant to a **single-session two-axis review** with structural axis separation (`## Standards Findings` + `## Spec Findings` headings). The §10 spirit is preserved through schema rigor; the §10 ideal (truly fresh context) is offered as an optional **user-initiated** subagent escalation against the persisted audit-trail file, not as the default path.

Status of the surrounding decision: the broader workflow-operational skill category — items 1, 2, 3, 5, 6, 7 of the original Decision section — still holds. **Only the Codex consequence stanza is superseded.** Claude Code variant of `ad-review` continues to spawn two parallel `Task` sub-agents (one Standards-axis, one Spec-axis); that path is unaffected by this addendum.

Follow-up captured: review the structural-axis-separation degradation flagged during the §10 self-review of commit `3fabb92`. A single reviewer with both axes' material loaded simultaneously can still rationalize; the schema enforces output ordering, not reasoning independence. If field evidence shows axis bleed in practice, a future ADR may reintroduce a stricter Codex path (e.g., always recommending the optional subagent escalation rather than burying it).
