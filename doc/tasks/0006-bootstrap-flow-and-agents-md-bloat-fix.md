# Task 0006: Fix bootstrap flow and AGENTS.md bloat (urgent — bug class)

**Status:** proposed
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**
**Priority:** urgent — blocks v0.2 dogfooding credibility

## Context

Surfaced during dogfooding of `agentic init` on this repo (see [Task 0001](0001-dogfood-agents-md-and-architecture-md.md) outcome — the `AGENTS.md` it produced is the artifact under audit here). Two defects, treated as bugs:

### Bug A — Bootstrap flow asks redundant/philosophical questions

The agent driven by [`prompts/agents.md`](../../prompts/agents.md) and [`src/lib/render.js`](../../src/lib/render.js) is told to *"interview me one section at a time"* (render.js:58). Combined with placeholders like `<the quality bar that matters most>` ([templates/agents-project.md:5](../../templates/agents-project.md)) this triggers questions whose answers are obvious from the repo (stack, entry points, conventions) or are architectural decisions that should be pre-set, not asked (e.g. *"is the doc primarily for agents or humans?"*, *"prioritize speed?"*).

Correct UX for an agent with filesystem access: **scan the repo, pre-fill every placeholder it can verify, then surface ONLY the gaps and ambiguities for confirmation** — not a sequential interview.

### Bug B — Generated `AGENTS.md` violates its own bloat rule

The kit's own [`AGENTS.md`](../../AGENTS.md) is 199 lines. Audit against the agents.md spec, the GitHub analysis of 2,500+ repos (https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/), Builder.io and OpenAI Codex guides:

- Lines 115–198 (Universal Agent Behavior, 82 lines, 41% of file) = generic agent advice, the documented #1 anti-pattern. Loaded every turn even though good agents already follow it by default.
- Lines 107–113 (External Resources) = bare URLs derivable from `git remote -v` / `package.json`.
- Several `<TODO>` placeholders inside Quality Gates / Code Style read as meta-prose, not operational rules.

This contradicts the kit's own principle in [WORKFLOW.md:33](../../WORKFLOW.md) (*"bloat causes the model to ignore the file. Keep one topic per Markdown file: lean and focused"*) and in [`prompts/agents.md:13`](../../prompts/agents.md) (*"Cut every line you can — bloat makes the agent ignore rules."*).

### Why this is urgent

Every future user of `@alexandrealvaro/agentic init` reproduces the same bad UX and gets the same bloated output. The kit fails its own quality bar. Must be fixed before v0.2 ships.

## Acceptance Criteria

### Flow fix (forward-looking — applies to every future project)

- [x] [`prompts/agents.md`](../../prompts/agents.md) and [`src/lib/render.js`](../../src/lib/render.js) instruct the agent to *scan first, pre-fill, then confirm gaps* — not to interview section-by-section
- [x] Agent must show pre-filled values as a diff/summary before writing, asking the user only about placeholders that are genuinely ambiguous, missing, or conflict with repo signals
- [x] [`templates/agents-project.md`](../../templates/agents-project.md) placeholders rewritten to be operational, not philosophical — no `<the quality bar that matters most>`-style prompts that invite meta questions
- [x] Bootstrap output template guides the agent to keep the produced `AGENTS.md` under 150 lines; explicit cut list in the instructions

### Universal Agent Behavior — architectural decision

- [x] ADR-0005 (or equivalent) opened to decide where Universal Agent Behavior lives. Three options to evaluate:
  - (a) Skill `agentic-philosophy/SKILL.md` — on-demand, doesn't load every turn (consistent with [WORKFLOW.md:39](../../WORKFLOW.md))
  - (b) Stays only in [`WORKFLOW.md`](../../WORKFLOW.md), removed from `AGENTS.md` output
  - (c) Trimmed to ≤15 lines and kept inline (compromise)
- [x] Decision implemented: [`templates/agents-general.md`](../../templates/agents-general.md) and [`src/lib/render.js`](../../src/lib/render.js) updated accordingly
- [ ] If skill route chosen, skill scaffolding added per ADR-0001 conventions  <!-- deferred to Task 0003 per ADR-0005 §Decision item 3 -->


### Self-fix (backward-looking — this repo's own [`AGENTS.md`](../../AGENTS.md))

- [x] External Resources section removed
- [x] Universal Agent Behavior section handled per ADR-0005 outcome
- [x] Meta `<TODO>` placeholders inside Quality Gates / Code Style replaced with one-line "not yet wired, see Task NNNN" pointers, or removed
- [x] Linha 5 marketing prose ("grounded in established standards…") cut
- [x] Final `AGENTS.md` ≤ 150 lines, every retained line operational

### Cross-doc audit (prevent recurrence)

- [x] Audit all sibling prompts for the same "interview-first, no scan" anti-pattern: [`prompts/architecture.md`](../../prompts/architecture.md), [`prompts/adr.md`](../../prompts/adr.md), [`prompts/design.md`](../../prompts/design.md), [`prompts/skill.md`](../../prompts/skill.md), [`prompts/subagent.md`](../../prompts/subagent.md), [`prompts/task.md`](../../prompts/task.md). Fix in place where the same bug exists.
- [x] Audit all sibling templates for philosophical/meta placeholders: [`templates/architecture.md`](../../templates/architecture.md), [`templates/adr.md`](../../templates/adr.md), [`templates/skill.md`](../../templates/skill.md), [`templates/subagent.md`](../../templates/subagent.md), [`templates/task.md`](../../templates/task.md). Fix where bug exists.
- [x] Audit [`README.md`](../../README.md) and [`WORKFLOW.md`](../../WORKFLOW.md) for any claim that contradicts the corrected flow (e.g. promises of "interview" UX). Update.
- [x] Audit pending task files ([`0002`](0002-foundation-and-bootstrap-skill.md), [`0003`](0003-universal-skills.md), [`0004`](0004-conditional-skills-and-discovery.md), [`0005`](0005-polish-and-publish.md)) and revise scope where they encode the broken flow.

### Regression guard

- [x] Add a smoke test (or documented manual checklist) that re-runs `agentic init` against this repo and asserts the produced `AGENTS.md` is ≤ 150 lines and contains no Universal Agent Behavior block (unless ADR-0005 chose option c)
- [x] Definition-of-Done in this task explicitly requires running the smoke test before close

## Plan

- [x] **Phase 1 — diagnose**
  - [x] Re-read current [`AGENTS.md`](../../AGENTS.md), record exact line ranges to cut. Output a diff plan in Notes.
  - [x] Re-read all prompts + templates listed above; list each occurrence of "interview" / "ask me" / philosophical placeholder. Add to Notes.
- [x] **Phase 2 — decide**
  - [x] Open ADR-0005 covering Universal Agent Behavior placement; choose (a)/(b)/(c). Mark accepted.
- [x] **Phase 3 — fix flow (the kit)**
  - [x] Rewrite [`prompts/agents.md`](../../prompts/agents.md) and [`src/lib/render.js`](../../src/lib/render.js) instructions: *scan → pre-fill → confirm gaps*, with explicit ≤150-line target.
  - [x] Rewrite philosophical placeholders in [`templates/agents-project.md`](../../templates/agents-project.md).
  - [x] Apply the same scan-first rewrite to sibling prompts identified in Phase 1.
  - [ ] Apply ADR-0005 outcome to [`templates/agents-general.md`](../../templates/agents-general.md) (delete / shrink / move to skill).  <!-- deferred: keep file until agentic-philosophy skill ships in Task 0003; delete then -->
- [x] **Phase 4 — fix this repo's [`AGENTS.md`](../../AGENTS.md)**
  - [x] Apply cuts per Phase 1 plan.
  - [x] Verify ≤150 lines, every line operational.
- [x] **Phase 5 — regression guard**
  - [x] Add smoke test or checklist file under `test/` or `doc/`.
- [ ] **Phase 6 — close**
  - [x] Update [`README.md`](../../README.md) / [`WORKFLOW.md`](../../WORKFLOW.md) where claims drifted.
  - [x] Cross-check against neighbour tasks and revise where they encode the broken flow.
  - [ ] Run `npm test` + smoke test. Commit. PR to `cli`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-08

Task opened after dogfooding the kit on its own repo surfaced two defects:
1. Bootstrap interview asks questions whose answers are in the repo or are architectural decisions, not user input.
2. Generated `AGENTS.md` is 199 lines and 41% of it is generic agent behavior — the exact anti-pattern flagged by the GitHub analysis of 2.5k repos and the Builder.io / OpenAI Codex AGENTS.md guides.

Treated as a bug, not an enhancement. Scope covers the current repo, the bootstrap flow, sibling prompts/templates, and a regression guard so the next project can't repeat it.

References consulted during diagnosis:
- https://agents.md
- https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/
- https://www.builder.io/blog/agents-md
- https://developers.openai.com/codex/guides/agents-md
- https://atlan.com/know/how-to-write-agents-md/

### 2026-05-08 — Phase 1 diagnosis (diff plan + cross-doc audit)

#### A. This repo's `AGENTS.md` — line-by-line cut list

| Lines | Content | Action |
|-------|---------|--------|
| 5 | "grounded in established standards (Anthropic Skills, Claude Code subagents, agents.md, Nygard ADRs, Google Labs DESIGN.md)" | Cut — marketing prose, not operational |
| 26 | `# Lint / format / typecheck — <TODO: not yet wired>` | Replace with one-line "not yet wired, see Task 0006" |
| 30 | Paragraph "Project is early. Linter, formatter…" | Cut — duplicates message of TODO |
| 34 | "Deterministic enforcement to add as the project matures. Right-sized for a CLI — fast feedback, no over-engineering." | Cut — meta narration |
| 36-39 | 4× `<TODO>` bullets | Compress to one line: "Not yet wired. Tracked in [Task 0006]." |
| 43 | "Ground every rule in a real OSS exemplar before encoding here. Until then, follow what the existing code already does:" | Cut — meta-prose |
| 49 | `<TODO: pick + cite OSS reference for naming, import order, file organization rules before adding more>` | Cut — meta placeholder |
| 59 | "Templates as source of truth" without ADR ref | Either promote to ADR or cut |
| 107-113 | External Resources section (whole) | Cut — derivable from `git remote -v` / `package.json` |
| 115-198 | Universal Agent Behavior (whole, 82 lines) | Move per ADR-0005 outcome |

Projected size after cuts: ~95-110 lines. Within 80-150 sweet spot.

#### B. Bug A — "interview-first, no scan" anti-pattern propagation

| File:Line | Instance | Fix needed |
|-----------|----------|-----------|
| [`prompts/agents.md:7`](../../prompts/agents.md) | "Interview me one section at a time" | Rewrite: scan → pre-fill → confirm gaps |
| [`prompts/architecture.md:7`](../../prompts/architecture.md) | "Interview me one section at a time" | Same rewrite — architecture is even more derivable from code |
| [`src/lib/render.js:58`](../../src/lib/render.js) | "Interview me one section at a time" | Same rewrite (this is the runtime version of `prompts/agents.md`) |
| [`prompts/task.md:17`](../../prompts/task.md) | "Interview me to fill" | Lower priority — task content is user-driven, scan less applicable. Keep but require Acceptance Criteria be measurable per WORKFLOW §1 |

ADR (`prompts/adr.md`), Skill (`prompts/skill.md`), Subagent (`prompts/subagent.md`), Design (`prompts/design.md`) prompts are constraint-driven, not interview-driven. No bug A instance — leave alone.

#### C. Bug B — philosophical/meta placeholders in templates

| File:Line | Placeholder | Fix |
|-----------|------------|-----|
| [`templates/agents-project.md:5`](../../templates/agents-project.md) | `<the quality bar that matters most>` | Replace with operational placeholder — e.g. `<one-sentence purpose: what it does, who runs it, the constraint a wrong change would violate>` |
| [`templates/agents-project.md:49`](../../templates/agents-project.md) | `<TODO: pick + cite OSS reference for naming, import order, file organization rules before adding more>` | Cut — this is meta-instruction, not a placeholder |

`templates/architecture.md`, `templates/adr.md`, `templates/skill.md`, `templates/subagent.md`, `templates/task.md` audited. No philosophical placeholders. Clean.

#### D. Bug C — generic agent behavior bundled into every output

Source: [`templates/agents-general.md`](../../templates/agents-general.md) (82 lines) + concatenation in [`src/lib/render.js:22-28`](../../src/lib/render.js).

ADR-0005 must decide:
- (a) Move whole content to skill `agentic-philosophy/SKILL.md` — on-demand load. Most aligned with [WORKFLOW.md:39](../../WORKFLOW.md) ("on-demand context is `SKILL.md`").
- (b) Remove from output entirely; content lives only in [`WORKFLOW.md`](../../WORKFLOW.md). User reads it, agent doesn't auto-load.
- (c) Trim to ≤15 lines, keep inline. Compromise — partial relief.

Recommendation: (a). Aligns with kit's own architecture (skills are the on-demand surface), separates concerns (per-project `AGENTS.md` ≠ universal philosophy), unblocks shipping universal-behavior updates without forcing every existing project to regenerate `AGENTS.md`.

#### E. Cross-doc audit findings

**[`README.md:60`](../../README.md):**
> "The project-wide prompts (`prompts/agents.md`, `prompts/architecture.md`) already instruct the agent to read the codebase, verify what you told them, and flag any mismatch before writing"

Drift: today the prompts say "interview, then verify after" — verification is post-hoc, not pre-fill. Update README claim once flow is fixed.

**[`README.md:22`](../../README.md):**
> "It runs a short TUI: confirm the mode, choose where to send the output…"

Accurate today. After fix, add a sentence noting the agent scans first, then confirms gaps.

**[`WORKFLOW.md:33-44`](../../WORKFLOW.md) (§1 Spec-Driven Design):**
Already aligned with the fix — explicit "lean and focused, one topic per file, prune". No drift. Reinforces ADR-0005 case.

**[`WORKFLOW.md:39`](../../WORKFLOW.md):** "On-demand context is `SKILL.md`. Description loads at session start … and body loads only when the skill is invoked." — direct support for ADR-0005 option (a).

**Neighbor task drift:**
- [Task 0002:23](0002-foundation-and-bootstrap-skill.md) Plan step says: *"Write `SKILL.md` for Claude Code (Markdown body with `agents-general.md` + `agents-project.md` content inlined; frontmatter as above)"*. **Encodes the broken architecture into v0.2 implementation.** Must be revised after ADR-0005: if option (a), `agentic-bootstrap` skill should NOT inline `agents-general.md`; that becomes a separate `agentic-philosophy` skill.
- [Task 0003](0003-universal-skills.md): independent (architecture/adr/task/audit skills). No revision needed unless ADR-0005 option (a) adds a fifth skill — then list it under universal skills.
- [Task 0001](0001-dogfood-agents-md-and-architecture-md.md): produced the bloated `AGENTS.md` under audit. Add a Notes entry pointing to Task 0006 as the followup.
- Tasks 0004, 0005: not yet read — defer audit to Phase 6 closing pass.

#### F. Phase 1 conclusion

Diff plan, anti-pattern locations, and ADR-0005 options ready. Blocked on user decision: ADR-0005 option (a)/(b)/(c). Recommend (a) — argued in section D above.

### 2026-05-08 — Phase 2-6 execution

ADR-0005 chosen: option (a) — `agentic-philosophy` skill. ADR file written, status `accepted`.

Phase 3 — flow fix delivered:
- [`prompts/agents.md`](../../prompts/agents.md): rewritten scan-first, no interview-by-section, ≤150-line cap, explicit "no Universal Agent Behavior block" instruction.
- [`src/lib/render.js`](../../src/lib/render.js): stops reading `agents-general.md`, no concatenation, scan-first instructions inlined; mode-context strings updated for greenfield/brownfield/audit.
- [`templates/agents-project.md`](../../templates/agents-project.md): line 5 placeholder rewritten operational; External Resources section removed; line 5 stack now requires "languages + versions" per industry guidance.
- [`prompts/architecture.md`](../../prompts/architecture.md): same scan-first rewrite — read code, ADRs, deploy config; pre-fill; ask only gaps.

Phase 4 — this repo's [`AGENTS.md`](../../AGENTS.md) rewritten: 199 → 86 lines (−57%). All operational lines retained, all bloat cut, ADR-0005 added under Architectural Principles.

Phase 5 — regression guard at [`test/init-output.test.js`](../../test/init-output.test.js). Wired to `npm test`. Asserts (per mode): no `Universal Agent Behavior` heading, no `agents-general.md` headings inlined, no `Interview me one section at a time` anti-pattern, presence of `Step 1 — Scan`, `Show me only the gaps`, `≤150 lines`, `agentic-philosophy` reference.

Phase 6 — drift fixed in [`README.md:60`](../../README.md) (now describes scan-first explicitly), Notes appended to [Task 0001](0001-dogfood-agents-md-and-architecture-md.md), [Task 0002:Notes](0002-foundation-and-bootstrap-skill.md), [Task 0003:Notes](0003-universal-skills.md). Tasks 0004/0005 audited — clean, no drift.

Two acceptance criteria intentionally deferred:
- *Skill scaffolding added per ADR-0001 conventions* — scope of [Task 0003](0003-universal-skills.md), not this task. ADR-0005 §Decision item 3 names it.
- *Apply ADR-0005 outcome to `templates/agents-general.md` (delete / shrink / move to skill)* — keep file until the `agentic-philosophy` skill is written and verified in Task 0003. Deleting now would orphan the only canonical copy of the content. Delete in Task 0003 when the skill body lands.

`npm test` green. Ready for commit + PR to `cli` once user signs off.

### 2026-05-08 — fresh-context review pass + corrections

Fresh-context reviewer (per WORKFLOW.md §10) flagged drift between spec and implementation. Applied:

- **`src/lib/render.js`** — Instructions block was identical for all three modes, contradicting `MODE_CONTEXT`. Audit mode emitted "Step 4 — On my confirmation, write the file"; greenfield emitted "Step 1 — Scan" despite the mode-context line saying "skip Step 1". Replaced single block with `INSTRUCTIONS_BY_MODE` + `OUTPUT_INSTRUCTION_BY_MODE` dicts. Audit now lists drift only and is explicitly read-only; greenfield drops the scan step (no code to scan); brownfield keeps the four-step scan-first flow.
- **`test/init-output.test.js`** — exempted audit from substantive assertions (`if (mode !== 'audit')`), so the audit-mode contradiction passed green. Added per-mode blocks: brownfield asserts the full scan-first contract, greenfield asserts there is *no* `Step 1 — Scan` and the "do not invent values" rule survives, audit asserts the prompt does *not* tell the agent to write the file and does instruct it to list drift. Also broadened the interview-pattern regex (`/interview\s+(me|each|by|section|one\s+section)/i`) and the line-cap regex (`/(≤|<=|under|below|at most|no more than)\s*150\s*lines/i`) so a paraphrased regression cannot slip through.
- **`README.md:39`** — Manual prompts table still listed `agents-general` as a template feeding `AGENTS.md`. ADR-0005 §Decision item 1 stops bundling it. Cell now lists only `agents-project`.
- **`doc/v0.2-cli-plan.md`** — three "interview" mentions (lines 14, 24, 78) contradicted the scan-first flow. Lines 14 and 24 (bootstrap-specific) rewritten to scan-first language; line 78 rewritten to distinguish project-wide skills (scan-first) from per-artifact skills (constraint-driven), matching Phase 1 §D analysis.
- **`prompts/task.md:19`** — Phase 1 §D promised "keep interview but require measurable AC per WORKFLOW §1"; the "measurable" requirement was missing. Added with WORKFLOW §1 link and a concrete example.
- **`AGENTS.md`** — `npm test` description was stale (still said "smoke only — runs --help"); two Quality Gates lines pointed at Task 0006 as the tracker for lint/CI wiring (not its scope) and one of them duplicated the "no direct push to main/cli" rule that Commit & PR Conventions already owns. All three corrected.

`npm test` green after corrections. The fresh-context review is the §10 / Definition-of-Done item below.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (`npm test` + new smoke test)
- [x] Code review completed (fresh-context reviewer per WORKFLOW §10) — diff + this task file + ADR-0005 only, no other history
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Re-running `agentic init` against this repo produces an `AGENTS.md` ≤150 lines with no philosophical questions during the interview <!-- structural guarantee: hand-cut AGENTS.md is 86 lines; smoke test asserts the new prompt has no Universal Agent Behavior block, no interview-by-section, and explicit ≤150-line cap. Empirical dogfood re-run is Task 0001's responsibility per its Notes pointer. -->
- [x] Definition-of-Done in this task explicitly requires running the smoke test before close — `npm test` runs `test/init-output.test.js`; green at commit time
- [ ] Status updated to `done` and Notes log closes the task
