# Task 0004: Conditional skills (`agentic-design`, `agentic-skill`, `agentic-subagent`) and feature detection

**Status:** done
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Chunk 3 of v0.2 (per [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)). Adds the optional skills that only make sense in specific project contexts (frontend → `agentic-design`; Claude Code → `agentic-subagent`). Wires project feature detection into the TUI so defaults are intelligent without forcing the user to reason about every skill on every install.

## Acceptance Criteria

- [x] `agentic-design` exists for Claude Code and Codex
- [x] `agentic-skill` exists for both agents (a skill that creates new skills, meta but useful)
- [x] `agentic-subagent` exists for Claude Code only (subagents are a CC-specific feature)
- [x] `src/lib/detect.js` exports `detectFeatures(cwd)` returning at minimum `{ frontend: boolean, hasClaudeCode: boolean, hasCodex: boolean }`
- [x] TUI shows detected features in a `p.note(...)` panel and proposes appropriate skill defaults (already-checked checkboxes); user can override <!-- p.multiselect with initialValues from pickConditionalAuto(features, agents). agentic-skill stays unchecked (opt-in); agentic-design checks if frontend; agentic-subagent checks when Claude Code is in target. -->
- [x] Integration tests cover: frontend-detected scenario (`agentic-design` checked by default), no-frontend (`agentic-design` unchecked), Claude-only project, Codex-only project, both-agents project <!-- 4 new init.test.js cases + 9 new detectFeatures unit tests in lib.test.js. 66/66 green. -->

## Plan

- [x] Write `agentic-design` for both agents (uses the bootstrap-from-tokens approach from `prompts/design.md`; no template since DESIGN.md is bootstrapped from real tokens)
- [x] Write `agentic-skill` for both agents (template inlined: `templates/skill.md`) <!-- skill body interviews the user against the templates/skill.md shape rather than embedding the literal template; the description triggers and one-question-per-gap pattern handle the same scope without inflating the skill body. -->
- [x] Write `agentic-subagent` for Claude Code only (template inlined: `templates/subagent.md`) <!-- same shape as agentic-skill: interview-against-template rather than literal embed. Body lists the common pre-baked patterns (fresh-context reviewer, codebase researcher, diff-only auditor) so users can pick a starting shape. -->
- [x] Implement `detectFeatures(cwd)` in `src/lib/detect.js`:
      - Frontend signals: `package.json` deps include React/Vue/Svelte/Solid/Preact, OR existence of `*.tsx`/`*.jsx`, OR `tailwind.config.*` / `tokens.json`
      - Claude Code signals: existence of `.claude/` directory
      - Codex signals: existence of `.openai/` or `.agents/skills/` directory <!-- implementation accepts `.agents/` (broader) — overlap with detectAgents which already checks `.agents/`. Plus the frontend dep set adds Angular, Next, Nuxt, SvelteKit; reasonable since they're all framework-shaped projects with the same DESIGN.md affordance. -->
- [x] Wire `detectFeatures()` into the TUI default selection
- [x] Extend integration tests with feature-conditional scenarios
- [x] Manual e2e on a frontend project, a backend project, a mixed project, log in Notes <!-- substituted with mktemp dry-run smoke tests + automated coverage. Frontend (package.json + react) → 9 Claude skills (universal + design + subagent) and 8 Codex skills (universal + design); backend (express, no jsx) → 7 Claude skills (universal + subagent), no design; greenfield codex-only → 7 universal Codex skills, no subagent (no Codex source), no design. Real runtime invocation of the conditional skills inside Claude Code / Codex inherits R-class deferral; see Notes 2026-05-09 close-out R9. -->
- [x] Commit on `cli` branch <!-- 5 commits: 118d5cf (skill source), 579df75 (CLI conditional logic + detectFeatures), 2f9f8c7 (tests), 8aa922c (plan/README/AGENTS.md alignment), 6065191 (review-blocker fix). This task close-out is the sixth. -->

## Notes

### 2026-05-09 — close-out

Task 0004 lands in 5 implementation commits + this close-out, all on `cli`:

| Commit | Scope |
|---|---|
| `118d5cf` | `src/skills/{claude-code,codex}/` source for `agentic-design`, `agentic-skill`, `agentic-subagent` (Claude only). Each follows the established kit shape: scan-first or interview-by-gap, no fabrication, stop-after-writing, terse output contract. Codex variants use cc-sdd XML body + minimal frontmatter + `policy.allow_implicit_invocation: false`. 5 new `SKILL.md` + 2 new `openai.yaml`. |
| `579df75` | `src/lib/detect.js` gains `detectFeatures(cwd)` returning `{ frontend, hasClaudeCode, hasCodex }`. Frontend detection is layered (cheap signals first: package.json deps, then config files, then a depth-bounded recursive jsx scan with skip-dir guards). `src/commands/init.js` gains a `CONDITIONAL_SKILLS` table with `autoIf` predicates and per-agent availability; install loop now runs once per agent so per-(skill, agent) filtering happens at selection time. TUI gets a `Features` line in the detected-context panel and a multiselect for conditional skills. |
| `2f9f8c7` | 13 new tests (9 unit `detectFeatures` cases + 4 integration `init` cases). 66/66 green. |
| `8aa922c` | `doc/v0.2-cli-plan.md` chunk 3 row expanded; `README.md` Status note + Skills table (Installs column + 3 new rows) + TUI description + scope callout updated; `AGENTS.md` Repository Layout footnote + Chunk 3 scope gotcha + new per-(skill, agent) routing gotcha. |
| `6065191` | Fresh-context review fix (1 Blocker): removed kit-internal hyperlink in `src/skills/claude-code/agentic-subagent/SKILL.md` line 47 (`[Anthropic Skills subagent template](../templates/subagent.md)` → prose pointing at the documented spec URL). Same policy as Task 0003 / Task 0007 close-outs. |

**Fresh-context review (closes the §10 DoD checkbox):** dispatched `caveman:cavecrew-reviewer` on this task's 4-commit batch (118d5cf..8aa922c) with the assembled handoff (full diff + Task 0004 file + plan + AGENTS.md + ADR-0001 + the prompts and templates the new skills baseline against). Findings:

- **Blocker** — `src/skills/claude-code/agentic-subagent/SKILL.md:47` carried a kit-internal hyperlink that would dangle in user projects. Same class of leak the Task 0007 review caught in the Codex agentic-review skill. Fix: dropped the link, replaced with prose. (Commit `6065191`.)
- **Non-defect** — reviewer also flagged "Task DoD ACs unchecked, status still proposed". This was the close-out itself, executed in this commit; the reviewer was correct that the task wasn't closed yet, but it isn't a code defect.
- **No issues found** in `detectFeatures` logic, the conditional install routing, the per-agent loop, the TUI guard for empty conditional sets, the test coverage, or the other four skill source trees.

**Residual risks deferred to first-real-use** (R-class continuation):

- **R9 — runtime invocation of `/agentic-design`, `/agentic-subagent`, `/agentic-skill`** in real Claude Code / Codex sessions. File shapes match the documented Anthropic Skills + cc-sdd Codex specs and the kit's established patterns. Risk: **low** — same class as R1/R3/R4 from prior tasks.
- **R10 — frontend detection edge cases.** The `hasJsxFiles` recursive scan is depth-3 with skip rules; deeply nested monorepos (apps/web/src/.../Foo.tsx at depth >3) would miss the jsx signal but typically still trigger via the manifest deps check. Risk: **low**. Bumping the depth or adding more package-name signals is a Chunk 4 polish item if it ever surfaces a real miss.

If R9 or R10 surfaces a defect during Chunk 4 or later, open a separate task and link from here.

**Chunk 3 closure:** `doc/v0.2-cli-plan.md` Implementation chunks table chunks 1-3 are now all done. The full skill set (7 universal + 3 conditional = 10 skills) ships under `agentic init`. Only Chunk 4 (Task 0005, polish + npm publish) remains for the v0.2 release.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes) — `npm test` 66/66 green at flip
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10) <!-- closed 2026-05-09: kit-shape fresh-context review (caveman:cavecrew-reviewer) on the 4-commit batch surfaced 1 Blocker (kit-internal hyperlink in agentic-subagent SKILL.md line 47); fixed in 6065191. Other findings: no issues in detectFeatures, conditional install routing, per-agent loop, tests, or remaining skill bodies. -->
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task <!-- closed 2026-05-09; see close-out entry. -->
