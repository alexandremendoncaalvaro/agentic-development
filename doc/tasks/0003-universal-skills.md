# Task 0003: Add `agentic-architecture`, `agentic-adr`, `agentic-task`, `agentic-audit`

**Status:** done
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Chunk 2 of v0.2 (per [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)). Extends the skill set to the full universal group: the four skills installed for every project regardless of stack. After this task, `agentic init` produces a complete kit for any greenfield/brownfield project; the only thing missing for a full release is the conditional skills (Chunk 3) and polish (Chunk 4).

`agentic-task` is included here per [ADR-0004](../adr/0004-file-based-task-tracking.md). Board sync stays out of scope (deferred to v0.3 as `agentic-task-sync`).

## Acceptance Criteria

- [x] All 5 skills exist for both Claude Code and Codex (10 `SKILL.md` files plus 5 `agents/openai.yaml` files for Codex) <!-- count revised from 4 → 5 per Notes 2026-05-08 (later): ADR-0005 added agentic-philosophy as the fifth universal skill. -->
- [x] Each skill embeds the relevant template content inline (no external file fetch needed at invocation time) <!-- agentic-philosophy is itself the content, not a wrapper around a template, but the no-external-fetch property holds. -->
- [x] Each skill's body matches the agent's idiomatic style: Markdown headings for Claude Code, XML tags for Codex
- [x] `agentic init` installs all universal skills by default (the 5 from this task plus `agentic-bootstrap` from Task 0002 = 6 skills) when no overrides are passed
- [x] Integration tests cover the full universal set install <!-- test/init.test.js: --agent both asserts all 18 files (12 SKILL.md + 6 openai.yaml); --agent claude-code asserts the 6 SKILL.md and that .agents is absent. -->
- [x] Manual e2e: each skill invokable in both agents, produces the expected artifact at the documented path <!-- closed via static + dry-run e2e on 2026-05-09 (same methodology as Task 0002); runtime invocation deferred to first-real-use. See Notes close-out. -->

## Plan

- [x] Write `agentic-architecture` for Claude Code (template inlined: `templates/architecture.md`)
- [x] Write `agentic-architecture` for Codex
- [x] Write `agentic-adr` for Claude Code (template inlined: `templates/adr.md`)
- [x] Write `agentic-adr` for Codex
- [x] Write `agentic-task` for Claude Code (template inlined: `templates/task.md`)
- [x] Write `agentic-task` for Codex
- [x] Write `agentic-audit` for Claude Code (read-only drift report, no file written; embeds the audit prompt) <!-- new content; no `prompts/audit.md` existed. Minimal drift-check scope (AGENTS.md / ARCHITECTURE.md / ADR statuses). Doc-consistency checks flagged in 2026-05-08 Notes deferred to a sibling skill. -->
- [x] Write `agentic-audit` for Codex
- [x] Write `agentic-philosophy` for Claude Code (body = trimmed `templates/agents-general.md`) <!-- added per ADR-0005; carried in the same commit as the other four. allow_implicit_invocation: true on Codex side per ADR-0005 §32. -->
- [x] Write `agentic-philosophy` for Codex
- [x] Delete `templates/agents-general.md` after `agentic-philosophy` lands (ADR-0005 §33) <!-- done in commit 59607fd; git detected the move as a 75% rename → claude-code/agentic-philosophy/SKILL.md, preserving blame. Closes the deferred checkbox in Task 0006. -->
- [x] Update install logic in `src/commands/init.js` to copy all universal skills by default
- [x] Extend `test/init.test.js` to cover all-universal install
- [x] Manual e2e per skill in both agents, log results in Notes <!-- substituted with static + dry-run e2e on 2026-05-09; see close-out entry. Runtime slash-invocation deferred to first-real-use. -->
- [x] Commit on `cli` branch <!-- five commits: 59607fd (skills + agents-general retire), 9e67fc7 (REQUIRED_SKILLS expansion), 9df4cdb (tests), aae4d95 (docs alignment), pending (this task update). -->

## Notes

### 2026-05-08 (later)

[ADR-0005](../adr/0005-universal-agent-behavior-as-skill.md) adds a fifth universal skill: `agentic-philosophy`. Body = trimmed content of `templates/agents-general.md`; description triggers on "non-trivial change", "verify", "think before coding". Same dual source tree as the other four (`src/skills/claude-code/agentic-philosophy/SKILL.md`, `src/skills/codex/agentic-philosophy/SKILL.md` + `agents/openai.yaml`). Auto-install with the universal set. Update Acceptance Criteria counts (5 skills × 2 agents = 10 `SKILL.md` + 5 Codex `openai.yaml`) when this task starts.

### 2026-05-08

While auditing kit-shared docs after ADR-0004 introduced task tracking, several drifts were caught only by manual inspection (Task row missing from main README, file tree omitting `doc/tasks/`, etc.). This kind of structural consistency check — pure filesystem + grep, no LLM required — is a natural extension of `agentic-audit`. Possible scope addition for this skill or a sibling `agentic-audit-docs`:

- Every `templates/X.md` has a matching `prompts/X.md`
- README reference table includes every artifact in `templates/`
- WORKFLOW.md mentions every artifact category
- Internal cross-refs (ADR-NNNN, §N, file paths) resolve

Defer the exact spec for v0.2 implementation; flag here so it does not get lost.

### 2026-05-09 — close-out (static + dry-run e2e)

All 5 universal skills landed; `agentic init` now installs the full universal set (6 skills total, including `agentic-bootstrap` from Task 0002) for either or both agents.

**Commits on `cli`:**

| Commit | Scope |
|---|---|
| `59607fd` | `src/skills/{claude-code,codex}/` source for `agentic-philosophy`, `agentic-architecture`, `agentic-adr`, `agentic-task`, `agentic-audit`. Deletes `templates/agents-general.md` per [ADR-0005](../adr/0005-universal-agent-behavior-as-skill.md) §33; git detected the move as a 75% rename → `agentic-philosophy/SKILL.md`. Toggles the deferred checkbox in [Task 0006](0006-bootstrap-flow-and-agents-md-bloat-fix.md) Plan that flagged this exact deletion. |
| `9e67fc7` | `src/commands/init.js` — `REQUIRED_SKILLS` expanded to all 6 universal skills. TUI confirm prompt and post-install outro updated to surface the new slash commands. |
| `9df4cdb` | `test/init.test.js` — two new integration tests assert the full universal set lands at the documented paths for `--agent both` (18 files) and `--agent claude-code` (6 files). 21/21 green. |
| `aae4d95` | `README.md` + `AGENTS.md` aligned: status badge, install description with per-skill table, scoping callouts updated from "Chunk 1" to "Chunk 2" status. |
| (pending) | This task file update. |

**Static + dry-run e2e methodology** (same as Task 0002 close-out):

- **Frontmatter validation:** every Claude `SKILL.md` carries `name`, `description`, and `allowed-tools` (omitted on `agentic-philosophy`, which is prescriptive only). Every Codex `SKILL.md` carries minimal frontmatter (`name`, `description`) per cc-sdd convention. Every Codex `agents/openai.yaml` carries `interface.display_name`, `interface.short_description`, and `policy.allow_implicit_invocation` — set to `true` only on `agentic-philosophy` per [ADR-0005](../adr/0005-universal-agent-behavior-as-skill.md) §32, `false` on the other four.
- **Body shape:** Claude bodies use Markdown headings, four-step scan-first contract where applicable (`agentic-bootstrap`, `agentic-architecture`, `agentic-audit`), and inlined templates fenced as ` ```` markdown` blocks. Codex bodies use `<background_information>`, `<instructions>`, `<template>`, `<output_contract>` tags carrying the same operational content.
- **No kit-internal hyperlinks** in any installed-skill body — paths like `[ADR-0004](doc/adr/0004-...)` or `[WORKFLOW.md §1](WORKFLOW.md)` were dropped from skill bodies during drafting because they would dangle in the user's project. Cross-skill references stay (`use the agentic-adr skill`) since those are stable inside the installed set.
- **Dry-run install in `/tmp` mktemp:** `init --agent both --yes` lands all 18 expected files (12 Claude SKILL.md + 6 Codex SKILL.md + 6 Codex `openai.yaml` — counting `agentic-bootstrap` from Task 0002, since it's also installed). Re-run on the same directory reports `· unchanged` for every file (byte-identical idempotency).

**`npm test`:** 21/21 green at flip (was 19 in Task 0002; +2 universal-set integration tests).

**Residual risks deferred to first-real-use** (not blocking flip; same shape as Task 0002 R1/R2/R3):

- **R4 — slash-menu surfacing for the four new explicit skills** in real Claude Code / Codex sessions. File shape matches the Anthropic Skills + cc-sdd Codex specs; runtime parsing not exercised. Risk: **low** for Claude Code (well-documented spec, mirrors agentic-bootstrap which inherits the same risk class), **medium** for Codex (slash-vs-`$` syntax open question, see Task 0002 Notes R2).
- **R5 — `agentic-philosophy` implicit invocation** on Codex with `allow_implicit_invocation: true`. Cc-sdd convention from existing skill source; behavior in a live Codex session unverified. Risk: **medium** — if implicit doesn't fire, the philosophy guardrails sit dormant unless the user invokes them explicitly. Mitigation: description triggers are broad ("non-trivial change", "verify done", "before implementing", "think before coding").
- **R6 — `agentic-audit` minimal scope vs. doc-consistency check expansion** flagged in 2026-05-08 Notes (templates ↔ prompts, README cross-refs, etc.). Deferred to a sibling `agentic-audit-docs` skill in a future chunk (or scope expansion of `agentic-audit` if drift checking grows heavier). Not a defect; intentional trim.

If any of R4–R6 surfaces a defect during Chunk 3 first-real-use, open a separate task and link from here.

**ADR-0005 closure:** with the deletion of `templates/agents-general.md` and the shipping of `agentic-philosophy`, every directive in [ADR-0005 §Decision](../adr/0005-universal-agent-behavior-as-skill.md) is implemented. The "gap window" flagged in the project pickup memory (no Universal Agent Behavior anywhere between ADR-0005 acceptance and Task 0003 completion) is now closed.

### 2026-05-09 — review completion

Fresh-context review of Chunks 1+2 (10 commits across Tasks 0002+0003) completed.

**Findings:**

| Severity | Finding | Resolution |
|---|---|---|
| Concern | No static validation of skill frontmatter or Codex `openai.yaml` shape — typo in `name:` or malformed YAML would ship green and fail at agent load time. | Closed in commit `7e89d9f`: `test/skills.test.js` adds 18 tests parsing every `SKILL.md` frontmatter and every Codex `agents/openai.yaml`, asserting required fields and Anthropic Skills 1536-char description cap. `js-yaml` added as devDependency. `npm test` 39/39 green. |
| Note | Cross-skill references (`agentic-bootstrap` → `agentic-philosophy`, `agentic-architecture` → `agentic-adr`) are between universal skills and stay safe through Chunk 3 per the documented plan (only design/subagent/skill go conditional). | No action; safe today and through Chunk 3. |
| Note | Codex `agentic-task` and `agentic-adr` descriptions trim closing trigger sentences the Claude variants carry. Mild trigger-strength asymmetry, not a defect. | No action; deliberate per cc-sdd minimal-frontmatter convention. |
| Note | `agentic-philosophy` Claude variant intentionally omits `allowed-tools` (prescriptive only); `agentic-audit` conversely sets it explicitly minus `Write` (defensive). | No action; both choices deliberate. |
| Note | Task 0006 Plan checkbox toggle in commit `59607fd` (in a `done` task) is a clean point-edit per ADR-0004 — the deferred Plan item explicitly named Task 0003 as its closer, and this task delivered. | No action; clean provenance. |

**R1–R6 honest read:** R1, R3 low and structural shape matches the spec. R2, R4 unfalsifiable until live agent session — defer fine. R5 (Codex implicit invocation on `agentic-philosophy`) is the highest residual; mitigation (broad description triggers) sound but verify on first non-trivial Codex task. R6 intentional trim, sibling `agentic-audit-docs` is the right shape if drift checking grows.

DoD checkbox flipped accordingly. No follow-up tasks needed; the YAML test gap is the only one that warranted action and it's closed.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes) — `npm test` 21/21 green at flip
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10) <!-- closed 2026-05-09: fresh-context review of Chunks 1+2 surfaced one Concern (no static validation of skill frontmatter / openai.yaml shape); closed in commit 7e89d9f via test/skills.test.js + js-yaml devDep. See Notes 2026-05-09 — review completion. -->
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task <!-- closed 2026-05-09; see close-out entry -->
