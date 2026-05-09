# Task 0002: Build skill source tree and ship `agentic-bootstrap` for both agents

**Status:** proposed
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

First implementation chunk of v0.2 (Chunk 1 in [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)). Establishes the skill source layout under `src/skills/<agent>/<skill>/`, refactors `agentic init` from "print prompt" (v0.1) to "install skills" (v0.2 per [ADR-0002](../adr/0002-two-phase-architecture.md)), and ships the first working skill — `agentic-bootstrap`, which generates `AGENTS.md`. Validates the entire install model end-to-end before any other skills are added, so later skills only have to follow the proven pattern.

## Acceptance Criteria

- [x] `src/skills/claude-code/agentic-bootstrap/SKILL.md` exists with frontmatter matching Anthropic's Skills format (`name`, `description`, `allowed-tools`, `argument-hint`) <!-- argument-hint omitted: the skill takes no positional argument; description triggers cover invocation. -->
- [x] `src/skills/codex/agentic-bootstrap/SKILL.md` and `src/skills/codex/agentic-bootstrap/agents/openai.yaml` exist matching cc-sdd's Codex format ([ADR-0001](../adr/0001-skills-mode-for-claude-and-codex.md))
- [x] `agentic init` installs the skill into the correct path per agent choice (`.claude/skills/agentic-bootstrap/` or `.agents/skills/agentic-bootstrap/`)
- [x] Integration test (vitest) spawns the CLI in a `mktemp` directory, asserts files land at expected paths, asserts idempotency on re-run <!-- substituted node:test for vitest — see 2026-05-09 Notes; same coverage, no new dev dep. -->
- [ ] Manual end-to-end: `/agentic-bootstrap` invokable in Claude Code, runs the AGENTS.md interview, writes the file at the repo root <!-- blocked on user-side validation. Implementation complete; user must install + run `/agentic-bootstrap` once and confirm the produced AGENTS.md is ≤150 lines and matches Task 0006 quality bar. -->


## Plan

- [x] Create `src/skills/{claude-code,codex}/agentic-bootstrap/` directory structure
- [x] Write `SKILL.md` for Claude Code (Markdown body with `agents-project.md` inlined; frontmatter `name`/`description`/`allowed-tools`) <!-- agents-general.md NOT inlined per ADR-0005 / Task 0006 supersession (see Notes) -->
- [x] Write `SKILL.md` for Codex (XML-tagged body — `<background_information>`, `<instructions>`, `<template>`, `<output_contract>`; minimal frontmatter)
- [x] Write `agents/openai.yaml` for Codex (`interface.display_name`, `interface.short_description`, `policy.allow_implicit_invocation: false`)
- [x] Refactor `src/commands/init.js`: remove prompt-printing, add skill-copying logic that reads `src/skills/<agent>/` and writes to target's `.claude/skills/` or `.agents/skills/`
- [x] Update TUI: ask which agent(s) (Claude Code / Codex / both); confirm skill list (only `agentic-bootstrap` for now)
- [x] Write `test/init.test.js` covering: greenfield install, brownfield install, both-agents install, idempotent re-run <!-- plus test/lib.test.js for unit-level detect/install coverage -->
- [ ] Manual e2e in a real test project, log result in Notes <!-- user-side; see Notes 2026-05-09 for the run-this-by-hand checklist -->
- [x] Commit on `cli` branch <!-- five commits: e1015ea (skill source), c7d4556 (CLI refactor), 4be181e (tests), 13280f7 (docs), pending (this task update) -->


## Notes

### 2026-05-08

Revised after [ADR-0005](../adr/0005-universal-agent-behavior-as-skill.md) and [Task 0006](0006-bootstrap-flow-and-agents-md-bloat-fix.md):

- `agentic-bootstrap` skill body **does not** inline `agents-general.md`. Project content only (`agents-project.md`).
- The skill must encode the scan-first instructions from the revised [`prompts/agents.md`](../../prompts/agents.md), not the old "interview by section" pattern.
- Universal Agent Behavior moves to a separate skill `agentic-philosophy` — installed as part of the universal set in [Task 0003](0003-universal-skills.md), not here.
- Acceptance criterion "Markdown body with `agents-general.md` + `agents-project.md` content inlined" in the original Plan is **superseded**. New Plan step: inline only `agents-project.md` plus the scan-first instructions.

### 2026-05-09 — implementation landed; blocked on user-side e2e

All implementation items done across five commits on `cli`:

| Commit | Scope |
|---|---|
| `e1015ea` | `src/skills/{claude-code,codex}/agentic-bootstrap/` source files (SKILL.md + Codex `agents/openai.yaml`). Both bodies encode the four-step scan-first contract with audit-mode override; agents-general.md NOT inlined per ADR-0005. |
| `c7d4556` | Refactor `src/commands/init.js` from prompt-printer to skill-installer. Adds `src/lib/install.js` (pure copy logic with byte-comparison idempotency) and `detectAgents()` in `src/lib/detect.js`. Drops `src/lib/render.js`, the old `--copy`/`--stdout`/`--out`/`--mode` flags, and the `clipboardy` dependency. New flags: `--agent <claude-code|codex|both>`, `--yes`. |
| `4be181e` | `test/lib.test.js` (unit) + `test/init.test.js` (integration via `execFileSync` in `mktemp`). 19/19 pass. node:test instead of vitest — same coverage, no new dev dep. The vitest decision can be revisited in Chunk 2/3 when the test surface justifies it. |
| `13280f7` | README + AGENTS.md aligned with the install flow; AGENTS.md gotchas updated to flag the new install.js KIT_ROOT path and the divergent-target idempotency contract. |
| (pending) | This task file update. |

**Open question carryforward — Codex root doc:** the install flow does NOT touch `AGENTS.md` at the project root (cc-sdd convention §198 of v0.2-cli-plan was to append a "Skills installed by agentic" section to existing `AGENTS.md`). Deferred — `agentic-bootstrap` is the skill that PRODUCES `AGENTS.md`, so writing/appending one at install time would be tangled. Decide in Chunk 4 (polish) when the full skill set ships and root-doc handling is a single concern.

**Open question carryforward — Codex skill invocation syntax:** cc-sdd renders `$skill-name` in their docs but Codex's slash menu uses `/`. Untested empirically. Verify during the user-side e2e step below.

#### Hand-off — manual e2e checklist (user-side)

I cannot run `/agentic-bootstrap` from this session. To close the last AC:

1. In a fresh scratch project (or `npx-style cd /tmp && mkdir test-bootstrap && cd test-bootstrap && echo '{"name":"x","version":"1.0.0"}' > package.json`), run `node /Volumes/MacMini/Home/Dev/agentic-development/bin/agentic.js init --agent claude-code --yes`. Confirm `.claude/skills/agentic-bootstrap/SKILL.md` lands.
2. Open Claude Code in that directory (`claude` or `claude --add-dir .`). Verify `/agentic-bootstrap` appears in the slash-command list (skill auto-discovered).
3. Run `/agentic-bootstrap`. Expected: skill detects brownfield, scans `package.json` and the directory, surfaces the gaps it cannot infer (most placeholders, since the scratch project has nothing), waits for confirmation, then writes `AGENTS.md` ≤150 lines with no Universal Agent Behavior block and no External Resources section.
4. For Codex: same flow with `--agent codex`. Confirm `/agentic-bootstrap` (or `$agentic-bootstrap` if cc-sdd convention) is the right invocation form. Log whichever works in this Notes section so Chunk 2 inherits the right pattern.
5. If the produced `AGENTS.md` exceeds 150 lines, surfaces philosophical questions, or includes a Universal Agent Behavior block — open a new Task and link it as the regression. Otherwise flip this task's status to `done`.

`npm test` green at hand-off (19/19).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes) — `npm test` green at hand-off
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10) <!-- recommended before flipping to done; the diff spans skill source + CLI refactor + tests + docs and benefits from a fresh-context pass per WORKFLOW §10 -->
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task <!-- waits on manual e2e + fresh-context review -->

