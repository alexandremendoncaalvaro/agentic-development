# Task 0007: Add workflow-operational skill category; ship `agentic-review` (Chunk 2.5)

**Status:** proposed
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Implements [ADR-0007](../adr/0007-workflow-operational-skills.md). Establishes the workflow-operational skill category as a parallel axis to spec-driven skills, then ships its first member, `agentic-review`, which automates [WORKFLOW.md §10](../../WORKFLOW.md) (Reviewer With Fresh Context). Closes the inconsistency where every task DoD requires a §10 review but the kit ships no tooling for it (see [Task 0002 Notes 2026-05-09 close-out](0002-foundation-and-bootstrap-skill.md) — checkbox skipped for lack of automation; see [Task 0006 Notes 2026-05-08](0006-bootstrap-flow-and-agents-md-bloat-fix.md) — §10 review performed manually).

Sequencing: sits between Chunk 2 ([Task 0003](0003-universal-skills.md)) and Chunk 3 ([Task 0004](0004-conditional-skills-and-discovery.md)) as **Chunk 2.5**. Can be implemented before or after Task 0003 — independent surface, but both touch `src/lib/install.js` and the universal-skill list, so a brief rebase is expected if 0003 lands first.

## Acceptance Criteria

- [ ] `src/skills/claude-code/agentic-review/SKILL.md` exists with frontmatter matching [Anthropic Skills format](https://code.claude.com/docs/en/skills) (`name`, `description`, `allowed-tools`); body orchestrates the §10 review flow (assemble handoff → delegate to the bundled subagent → return findings) — no "approve" verdict, adversarial framing per §10
- [ ] `src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md` exists, frontmatter exactly `name: fresh-context-reviewer`, `description: <routing signal per §10>`, `tools: Read, Glob, Grep, Bash`, `model: sonnet` — matches the *Fresh-context reviewer* row in [`prompts/subagent.md`](../../prompts/subagent.md). Body restates the §10 contract (no AGENTS.md inheritance per [Claude Code subagents spec](https://code.claude.com/docs/en/sub-agents))
- [ ] `src/skills/codex/agentic-review/SKILL.md` exists with cc-sdd-style XML body and minimal frontmatter, plus `agents/openai.yaml`. First instruction step performs the `/clear` orchestration (Codex parity path documented in [ADR-0007](../adr/0007-workflow-operational-skills.md) decision item 4)
- [ ] `src/lib/install.js` `AGENT_LAYOUT` extended with an `agentsDir` entry for Claude Code (`.claude/agents`) and a per-skill manifest declaring which files are skill-internal vs subagent-target — so a future skill that does NOT ship a subagent doesn't pay the new code path
- [ ] `agentic init` installs `agentic-review` into both Claude Code (`.claude/skills/agentic-review/SKILL.md` + `.claude/agents/fresh-context-reviewer.md`) and Codex (`.agents/skills/agentic-review/{SKILL.md, agents/openai.yaml}`) by default — joins the universal skill set per [ADR-0007](../adr/0007-workflow-operational-skills.md) decision item 7
- [ ] Integration tests cover: greenfield install includes the subagent file at the sibling path; idempotent re-run; brownfield install does not duplicate; both-agents install lands the right files for each
- [ ] `doc/v0.2-cli-plan.md` skill table (lines 80–89) extended with a `Category` column (`spec-driven` / `workflow-operational`); `agentic-review` row added
- [ ] `README.md` "Manual prompts" or "Skills" section reflects the new category split
- [ ] Kit dogfoods the skill: agentic-development repo gets `.claude/skills/agentic-review/` and `.claude/agents/fresh-context-reviewer.md` committed (the kit reviews itself with its own tooling)
- [ ] Manual e2e: invoke `/agentic-review` against the diff of a non-trivial recent commit on `cli`; verify (a) the subagent runs in isolated context (Claude Code Task tool), (b) findings come back structured, (c) no write occurs, (d) the assembled handoff includes diff + AGENTS.md + the relevant ADR + the task's Acceptance Criteria

## Plan

- [ ] Write `src/skills/claude-code/agentic-review/SKILL.md` (Markdown body, scan-first to assemble handoff, then `Task` tool delegation to `fresh-context-reviewer`)
- [ ] Write `src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md` (subagent system prompt; restate §10 contract; do NOT inherit AGENTS.md)
- [ ] Write `src/skills/codex/agentic-review/SKILL.md` (XML body; `/clear` + handoff orchestration as step 1)
- [ ] Write `src/skills/codex/agentic-review/agents/openai.yaml`
- [ ] Extend `src/lib/install.js` `AGENT_LAYOUT` with the subagent install target. Decide and implement the per-skill declaration mechanism (recommend: a `manifest.json` at `src/skills/<agent>/<name>/` listing files that go to `agentsDir` instead of `skillsDir`, defaulting to none)
- [ ] Update `src/commands/init.js` `REQUIRED_SKILLS` to include `agentic-review`
- [ ] Extend `test/lib.test.js` with subagent-target install assertions; extend `test/init.test.js` with the new file paths
- [ ] Run `npm test`; expect green
- [ ] Update `doc/v0.2-cli-plan.md` skill table with `Category` column; document Chunk 2.5
- [ ] Update `README.md` to reflect the new category and what `agentic-review` does
- [ ] Dogfood: run `agentic init --agent claude-code --yes` on the agentic-development repo itself; commit the resulting `.claude/skills/agentic-review/` + `.claude/agents/fresh-context-reviewer.md`
- [ ] Manual e2e: pick a recent multi-file commit (e.g., the Chunk 1 install refactor `c7d4556`), run `/agentic-review` against it, paste the structured findings into Notes
- [ ] Backfill the [Task 0002](0002-foundation-and-bootstrap-skill.md) DoD `Code review completed` checkbox using `/agentic-review` against that diff; cross-link from Task 0002 Notes
- [ ] Commit on `cli` branch (recommended split: skill source + subagent file → install logic + REQUIRED_SKILLS → tests → plan/README docs → dogfood + Task 0002 backfill → this task close-out)

## Notes

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — note: this is the **first** task that can satisfy this checkbox via the kit's own tooling
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
