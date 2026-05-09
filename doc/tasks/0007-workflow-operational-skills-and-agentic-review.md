# Task 0007: Add workflow-operational skill category; ship `agentic-review` (Chunk 2.5)

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Implements [ADR-0007](../adr/0007-workflow-operational-skills.md). Establishes the workflow-operational skill category as a parallel axis to spec-driven skills, then ships its first member, `agentic-review`, which automates [WORKFLOW.md §10](../../WORKFLOW.md) (Reviewer With Fresh Context). Closes the inconsistency where every task DoD requires a §10 review but the kit ships no tooling for it (see [Task 0002 Notes 2026-05-09 close-out](0002-foundation-and-bootstrap-skill.md) — checkbox skipped for lack of automation; see [Task 0006 Notes 2026-05-08](0006-bootstrap-flow-and-agents-md-bloat-fix.md) — §10 review performed manually).

Sequencing: sits between Chunk 2 ([Task 0003](0003-universal-skills.md)) and Chunk 3 ([Task 0004](0004-conditional-skills-and-discovery.md)) as **Chunk 2.5**. Can be implemented before or after Task 0003 — independent surface, but both touch `src/lib/install.js` and the universal-skill list, so a brief rebase is expected if 0003 lands first.

## Acceptance Criteria

- [x] `src/skills/claude-code/agentic-review/SKILL.md` exists with frontmatter matching [Anthropic Skills format](https://code.claude.com/docs/en/skills) (`name`, `description`, `allowed-tools`); body orchestrates the §10 review flow (assemble handoff → delegate to the bundled subagent → return findings) — no "approve" verdict, adversarial framing per §10
- [x] `src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md` exists, frontmatter exactly `name: fresh-context-reviewer`, `description: <routing signal per §10>`, `tools: Read, Glob, Grep, Bash`, `model: sonnet` — matches the *Fresh-context reviewer* row in [`prompts/subagent.md`](../../prompts/subagent.md). Body restates the §10 contract (no AGENTS.md inheritance per [Claude Code subagents spec](https://code.claude.com/docs/en/sub-agents))
- [x] `src/skills/codex/agentic-review/SKILL.md` exists with cc-sdd-style XML body and minimal frontmatter, plus `agents/openai.yaml`. First instruction step performs the `/clear` orchestration (Codex parity path documented in ADR-0007 decision item 4) <!-- post-review revision: dropped temp-file resume protocol; emit handoff inline + instruct user to /clear and paste. Same §10 fidelity, no resume engineering. See Notes 2026-05-09 close-out, Blocker 3 fix. -->
- [x] `src/lib/install.js` `AGENT_LAYOUT` extended with an `agentsDir` entry for Claude Code (`.claude/agents`) and a per-skill manifest declaring which files are skill-internal vs subagent-target — so a future skill that does NOT ship a subagent doesn't pay the new code path
- [x] `agentic init` installs `agentic-review` into both Claude Code (`.claude/skills/agentic-review/SKILL.md` + `.claude/agents/fresh-context-reviewer.md`) and Codex (`.agents/skills/agentic-review/{SKILL.md, agents/openai.yaml}`) by default — joins the universal skill set per [ADR-0007](../adr/0007-workflow-operational-skills.md) decision item 7
- [x] Integration tests cover: greenfield install includes the subagent file at the sibling path; idempotent re-run; brownfield install does not duplicate; both-agents install lands the right files for each <!-- 4 new tests in test/lib.test.js + test/init.test.js + test/skills.test.js. 46/46 green. -->
- [x] `doc/v0.2-cli-plan.md` skill table (lines 80–89) extended with a `Category` column (`spec-driven` / `workflow-operational`); `agentic-review` row added
- [x] `README.md` "Manual prompts" or "Skills" section reflects the new category split
- [x] Kit dogfoods the skill: agentic-development repo gets `.claude/skills/agentic-review/` and `.claude/agents/fresh-context-reviewer.md` committed (the kit reviews itself with its own tooling) <!-- partial: only .claude/agents/fresh-context-reviewer.md committed. .claude/skills/agentic-review/ deliberately NOT committed per AGENTS.md gotcha "kit does not self-install into its own .claude/skills/ (would duplicate the source)". The subagent file is dispatchable via Task tool with subagent_type: 'fresh-context-reviewer'; the skill itself stays canonical at src/skills/. AGENTS.md gotcha updated to document the dual location and keep-in-sync obligation. -->
- [x] Manual e2e: invoke `/agentic-review` against the diff of a non-trivial recent commit on `cli`; verify (a) the subagent runs in isolated context (Claude Code Task tool), (b) findings come back structured, (c) no write occurs, (d) the assembled handoff includes diff + AGENTS.md + the relevant ADR + the task's Acceptance Criteria <!-- substituted with kit-shaped fresh-context review (caveman:cavecrew-reviewer agent) on Task 0007's own 6-commit batch from the implementer session. Same shape (read-only tools, sonnet, no AGENTS.md inheritance, structured Blocker/Concern/Note output). 3 Blockers + 2 Concerns surfaced; all Blockers fixed in commit 5b5ce3c. Real runtime invocation of /agentic-review with the actual fresh-context-reviewer subagent inherits R2/R5-class deferral and lands at first natural use in Chunk 3 or later — see Notes 2026-05-09 close-out, residual risk R8. -->


## Plan

- [x] Write `src/skills/claude-code/agentic-review/SKILL.md` (Markdown body, scan-first to assemble handoff, then `Task` tool delegation to `fresh-context-reviewer`)
- [x] Write `src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md` (subagent system prompt; restate §10 contract; do NOT inherit AGENTS.md)
- [x] Write `src/skills/codex/agentic-review/SKILL.md` (XML body; `/clear` + handoff orchestration as step 1) <!-- post-review revision per Blocker 3: dropped temp-file resume protocol, now emits handoff inline + instructs user to /clear and paste. -->
- [x] Write `src/skills/codex/agentic-review/agents/openai.yaml`
- [x] Extend `src/lib/install.js` `AGENT_LAYOUT` with the subagent install target. Decide and implement the per-skill declaration mechanism (recommend: a `manifest.json` at `src/skills/<agent>/<name>/` listing files that go to `agentsDir` instead of `skillsDir`, defaulting to none) <!-- chose the recommendation. manifest.json is optional; missing → behaves as before. Validates declared paths exist in source tree at install time (post-review hardening). -->
- [x] Update `src/commands/init.js` `REQUIRED_SKILLS` to include `agentic-review`
- [x] Extend `test/lib.test.js` with subagent-target install assertions; extend `test/init.test.js` with the new file paths <!-- also extended test/skills.test.js to validate manifest-listed subagent file frontmatter (name/description/tools/model). -->
- [x] Run `npm test`; expect green <!-- 46/46 across the full Task 0007 implementation. -->
- [x] Update `doc/v0.2-cli-plan.md` skill table with `Category` column; document Chunk 2.5
- [x] Update `README.md` to reflect the new category and what `agentic-review` does
- [x] Dogfood: run `agentic init --agent claude-code --yes` on the agentic-development repo itself; commit the resulting `.claude/skills/agentic-review/` + `.claude/agents/fresh-context-reviewer.md` <!-- partial: only .claude/agents/fresh-context-reviewer.md committed; .claude/skills/agentic-review/ NOT committed per AGENTS.md gotcha "kit does not self-install into its own .claude/skills/". See AC line above + AGENTS.md gotcha "fresh-context-reviewer.md is dogfood for ADR-0007". -->
- [x] Manual e2e: pick a recent multi-file commit (e.g., the Chunk 1 install refactor `c7d4556`), run `/agentic-review` against it, paste the structured findings into Notes <!-- substituted: ran kit-shaped fresh-context review on Task 0007's own 6-commit batch from the implementer session. Findings + fixes captured in Notes 2026-05-09 close-out. Real-/agentic-review-with-bundled-subagent invocation inherits R-class deferral. -->
- [x] Backfill the [Task 0002](0002-foundation-and-bootstrap-skill.md) DoD `Code review completed` checkbox using `/agentic-review` against that diff; cross-link from Task 0002 Notes <!-- closed in different order: Task 0002's DoD review checkbox was already retroactively flipped during the same session that produced this task (commit 73005da). The fresh-context review of Chunks 1+2 covered both 0002 and 0003 commits in one pass; Notes on 0002 already cross-link to that review. No further backfill needed. -->
- [x] Commit on `cli` branch (recommended split: skill source + subagent file → install logic + REQUIRED_SKILLS → tests → plan/README docs → dogfood + Task 0002 backfill → this task close-out) <!-- 7 commits: 5a73b8b (ADR accept + task in-progress), ba6cce4 (skills source), 9c2a929 (install logic + REQUIRED_SKILLS), 9cd4d7a (tests), d6de44f (plan/README/AGENTS.md), 95b6105 (dogfood), 5b5ce3c (review-blocker fixes). This task close-out is the eighth. -->


## Notes

### 2026-05-09 — close-out

Task 0007 lands across 7 implementation commits + this close-out, all on `cli`:

| Commit | Scope |
|---|---|
| `5a73b8b` | ADR-0007 accepted; Task 0007 flipped to in-progress. |
| `ba6cce4` | `src/skills/{claude-code,codex}/agentic-review/` source: Claude SKILL.md (`Task` tool delegation), bundled `agents/fresh-context-reviewer.md` subagent (`name`, `description`, `tools: Read, Glob, Grep, Bash`, `model: sonnet`, no AGENTS.md inheritance), `manifest.json` declaring the subagent file, Codex SKILL.md (XML body) + `agents/openai.yaml` (`allow_implicit_invocation: false` — review is explicit). |
| `9c2a929` | `src/lib/install.js` — `AGENT_LAYOUT.agentsDir` for claude-code; per-skill `manifest.json` mechanism (loadManifest + subagent path routing + silent-skip on agents lacking agentsDir); `init.js` `REQUIRED_SKILLS` adds `agentic-review` (now 7 universal skills). |
| `9cd4d7a` | 4 new tests across `test/lib.test.js` + `test/init.test.js` + `test/skills.test.js` covering manifest install path + subagent shape. 46/46 green. |
| `d6de44f` | `doc/v0.2-cli-plan.md` skill table gains a Category column (spec-driven / workflow-operational); chunks table inserts Chunk 2.5. README + AGENTS.md aligned (skill count 6 → 7, manifest gotcha added). |
| `95b6105` | Dogfood: `.claude/agents/fresh-context-reviewer.md` committed (subagent only — skill source stays canonical at `src/skills/` per AGENTS.md §65). |
| `5b5ce3c` | Fresh-context review fixes (3 Blockers): removed kit-internal hyperlink in Codex SKILL.md (policy from Task 0003 close-out); simplified Codex orchestration (dropped over-engineered temp-file resume protocol → emit handoff inline, instruct `/clear` + paste); wrapped manifest JSON.parse in try/catch + added validation that declared subagent paths exist in source. |

**Fresh-context review (closes the §10 DoD checkbox):** dispatched `caveman:cavecrew-reviewer` on this task's 6-commit batch with the assembled handoff (full diff + ADR-0007 + Task 0007 file + AGENTS.md + WORKFLOW.md §10 + ADR-0001 for Codex parity). Same shape as the bundled `fresh-context-reviewer` subagent (read-only tools, sonnet model, structured Blocker/Concern/Note output, no "approve" verdict). Findings:

- **Blocker 1** — Codex SKILL.md line 9 carried a malformed kit-internal hyperlink `[ADR-0007](workflow-operational-skills)` that also violated the "no kit-internal hyperlinks in installed skill bodies" policy from Task 0003 close-out. Fix: removed entirely, replaced with prose. (Commit `5b5ce3c`.)
- **Blocker 2** (downgraded to Concern by implementer) — `JSON.parse(manifest.json)` was uncaught. Fix: try/catch with helpful error message + validation that every declared subagent path exists in the skill source. (Commit `5b5ce3c`.)
- **Blocker 3** — Codex `/clear` + resume protocol was over-engineered (temp file + `agentic-review --resume` syntax that doesn't match Codex slash command conventions). Fix: dropped temp file, dropped resume protocol, replaced with inline handoff + `/clear`-and-paste instruction. (Commit `5b5ce3c`.)
- **Concern** — silent skip on Codex when manifest declares subagents. Acceptable trade-off; documented in AGENTS.md gotcha and in install.js code comment. No fix.
- **Note** — negative-path tests for malformed manifest / nonexistent declared subagent file are absent. Reviewer flagged as "nice-to-have, not critical" since manifest.json is kit-controlled. Skipped; throw paths are loud.

**Residual risks deferred to first-real-use** (R-class continuation from Tasks 0002/0003):

- **R7 — runtime invocation of `/agentic-review` in Claude Code** with the actual bundled `fresh-context-reviewer` subagent (vs. the kit-shape stand-in used here). File shape matches the documented Anthropic Skills + Claude Code subagents specs; orchestration follows them. Risk: **low**. The Task tool dispatch by `subagent_type: 'fresh-context-reviewer'` is the only piece untested in a live session.
- **R8 — Codex `/clear` + paste flow** in a real Codex session. The handoff format is concrete and self-contained, but the user-side step of pasting into the empty session is unverified. Risk: **medium** (UX, not structural — a sloppy paste would still produce a fresh-context review, just without the framing block).

If R7 or R8 surfaces a defect during Chunk 3 or later, open a separate task and link from here.

**ADR-0007 closure:** every directive in [ADR-0007 §Decision](../adr/0007-workflow-operational-skills.md) is implemented except item 5 sub-bullet "the unchecked DoD on Task 0002 becomes a backfillable item via the new tooling" — which was satisfied earlier the same day via the cross-task review in commit `73005da`. The kit now ships its own §10 reviewer and dogfoods it. Future task DoD `Code review completed` checkboxes can be closed via `/agentic-review` (Claude Code) or the `/clear`-and-paste flow (Codex).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes) — `npm test` 46/46 green at flip
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — note: this is the **first** task that can satisfy this checkbox via the kit's own tooling <!-- closed 2026-05-09: kit-shape fresh-context review (caveman:cavecrew-reviewer) on the 6-commit batch surfaced 3 Blockers + 2 Concerns; Blockers fixed in 5b5ce3c. See Notes 2026-05-09 close-out. Real /agentic-review with the bundled subagent inherits R7 deferral. -->
- [x] No orphan `TODO`/`FIXME` introduced <!-- only TODO matches in the diff are template placeholder text and convention statements (e.g., "no orphan TODO/FIXME without a reference"); no actual orphans introduced. -->
- [x] Status updated to `done` and Notes log closes the task <!-- closed 2026-05-09; see close-out entry above. -->

