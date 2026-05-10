# Task `0020`: Absorb selected mattpocock/skills practices into kit (v0.14.0-beta.1 + deferred)

**Status:** in-progress
**Created:** 2026-05-10
**Owner:** Alexandre Alvaro
**Spec ref:**
**Board ref:**

## Context

A side-by-side comparison of this kit against [`mattpocock/skills`](https://github.com/mattpocock/skills) on 2026-05-10 (branch `cli`, kit v0.13.0-beta.1) surfaced principles and skills grounded in canonical engineering literature (DDD, *Pragmatic Programmer*, Ousterhout, Feathers, Kernighan/Pike) that the kit had not codified. A strict filter — "does it close a real gap *and* change agent behavior?" — was applied; the result was nine WORKFLOW deltas plus four deferred skills. This task tracks the rollout in two phases:

- **v0.14.0-beta.1 — Principles release.** WORKFLOW edits + three accepting ADRs (Domain layer, deep-modules vocabulary, diagnose discipline). No skill implementations land in this release; the principles are documented and citable, ready for skill rollout in subsequent minor versions.
- **v0.15.x and later — Skill implementations.** Four deferred skills implement the principles operationally. Each ships in its own minor version with its own task file; this task closes once all four are scheduled.

Splitting the principles release from the skill implementations matches the pattern in [task-0018](0018-agentic-spike-skill.md) / [task-0019](0019-agentic-tdg-skill.md) (one skill per minor) and keeps each release coherent.

## Acceptance Criteria

### Phase 1 — Principles release (v0.14.0-beta.1)

- [x] [`WORKFLOW.md`](../../WORKFLOW.md) preamble extended with the smart-zone-vs-dumb-zone prescription (one task per session, reset over extend).
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) TL;DR adds three bullets: Diagnose with discipline, One task per session, Slice vertically.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §1 four-layer artifact stack becomes a five-layer stack with the new **Layer 2 — Domain** between Constitution and Spec; downstream layer indices shift; the closing paragraph notes the renumbering.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §1 acceptance-criteria rules add the durable-not-procedural bullet.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §6 Plan phase extends with vertical slicing (anti-pattern: horizontal slicing) and HITL/AFK tagging.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §8 grows from 4 lines to ~25 lines with the Ousterhout/Feathers vocabulary and the three principles (deletion test, interface-as-test-surface, two-adapters rule).
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §12 second paragraph adds the AI-mechanical / human-judgment dual-role principle.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §14 head adds the spike-vs-prototype distinction.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) gains a new §15 "Diagnose With Discipline" with the five phases.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) Sources section updated for §1 (Evans), §6 (PragProg), §8 (Ousterhout, Feathers), §15 (Kernighan/Pike, Popper).
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) "How this guide was built" gains the cross-pollination acknowledgment paragraph crediting `mattpocock/skills`.
- [x] [`doc/adr/0019-domain-language-layer.md`](../adr/0019-domain-language-layer.md) accepted, with placement rationale (Layer 2, not folded into Constitution) and the lazy-creation discipline.
- [x] [`doc/adr/0020-deep-modules-vocabulary.md`](../adr/0020-deep-modules-vocabulary.md) accepted, naming the canonical terms and the rejected depth-as-line-ratio framing.
- [x] [`doc/adr/0021-diagnose-discipline.md`](../adr/0021-diagnose-discipline.md) accepted, with the five-phase shape and the v0.15.x deferral of `agentic-diagnose`.
- [x] [`AGENTS.md`](../../AGENTS.md) updated to mention the new Layer 2 (Domain / `CONTEXT.md`) in the artifact-stack reference (managed-skills section regenerated from updated `src/lib/rootdoc.js` SKILL_DESCRIPTIONS).
- [x] [`ARCHITECTURE.md`](../../ARCHITECTURE.md) Architectural Principles section updated with the five-layer stack and a new bullet for the Ousterhout/Feathers vocabulary (ADR-0020). No retroactive rewrite of historic patterns; only the principles paragraph and the new vocabulary bullet were added.
- [x] [`README.md`](../../README.md) skill-table descriptions, "Lost mid-flow" hint, and "Specifying a feature" workflow narrative all updated to five-layer + Domain-layer citation. New "Planned skills" subsection under "Install & use" lists `agentic-domain` (v0.15.x), `agentic-grill` (v0.16.x), `agentic-deepen` (v0.17.x), `agentic-diagnose` (v0.18.x) with their accepting ADRs.
- [x] [`package.json`](../../package.json) bumped to `0.14.0-beta.1` (principles addition + new layer = minor).
- [x] `npm test` passes (150/150; no test-shape change for this release).
- [x] Dogfood install refreshed via `node bin/agentic.js update --yes --force` so the new WORKFLOW + ADRs + skill body updates land in the local install paths.
- [x] Skill source bodies renamed `four-layer` → `five-layer` across `src/skills/{claude-code,codex}/agentic-bootstrap`, `agentic-spec`, `agentic-next` plus the codex `agents/openai.yaml` short_description. Layer numbering shifted (Layer 2 = Domain; Spec is Layer 3; ADRs/tasks Layer 4; Code Layer 5) consistently across all skill bodies that reference the stack. `agentic-next` survey logic (Step 1 sections, Step 4 profile filtering, Output contract) renumbered end-to-end and gained a Layer 2 (Domain / CONTEXT.md) survey block honoring ADR-0019's lazy-creation discipline.

### Phase 2 — Deferred skill implementations (v0.15.x and later)

Each skill ships under its own minor version with its own task file; the implementing task is created at the start of that minor's branch.

- [ ] **v0.15.0-beta.1 — `agentic-domain`** (universal across all profiles per [ADR-0019](../adr/0019-domain-language-layer.md) §4). Lazily creates / updates `CONTEXT.md` from grilling sessions, spec drafting, or explicit `/agentic-domain` invocation. Codex parity required. Wires into `agentic-bootstrap` (insert `CONTEXT.md` pointer in `AGENTS.md` once the file exists), `agentic-spec` (use glossary in spec drafts), `agentic-architecture` (use glossary in architecture prose), `agentic-audit` (drift between glossary and code). Track under task-0021.

- [ ] **v0.16.0-beta.1 — `agentic-grill`** (universal across all profiles). Interview-before-research skill upstream of `agentic-ground`. Resolves vocabulary inline against `CONTEXT.md` when present. Distinguishes from `agentic-tdg` (technique-known regime) and `agentic-spike` (technique-uncertain regime) by Step 0 routing. Codex parity required. Track under task-0022.

- [ ] **v0.17.0-beta.1 — `agentic-deepen`** (universal across `team` and `mature` profiles only — premature for `poc` per [ADR-0020](../adr/0020-deep-modules-vocabulary.md) §4). Surfaces deepening opportunities in the codebase using the §8 vocabulary. Pairs with `agentic-audit` (audit detects drift; deepen proposes refactors). Codex parity required. Track under task-0023.

- [ ] **v0.18.0-beta.1 — `agentic-diagnose`** (universal across all profiles per [ADR-0021](../adr/0021-diagnose-discipline.md) §3). Five-phase debugging skill operationalizing WORKFLOW §15. Codex parity required. Track under task-0024.

Order rationale: `agentic-domain` first because the Domain layer ships in v0.14 and the operationalizing skill should follow next minor. `agentic-grill` second because it depends on `CONTEXT.md` for inline glossary updates. `agentic-deepen` third because the §8 vocabulary needs to settle in real ADRs and architecture docs before a skill consumes it. `agentic-diagnose` fourth because it is the most self-contained — no dependency on the other three.

### Phase-2 close

- [ ] All four deferred skills shipped, each with its own task file marked `done`.
- [ ] `/agentic-next` survey on `cli` after the v0.18.0-beta.1 ship reports no remaining absorptions from this task.
- [ ] This task transitions to `done` only when Phase 2 is fully scheduled (each deferred skill has its own task file open) and Phase 1 acceptance criteria are all checked.

## Plan

### Phase 1 (this branch, v0.14.0-beta.1)

- [x] Branch `feat/v0.14.0-workflow-deepening` cut from `cli`.
- [x] Edit `WORKFLOW.md` (preamble + TL;DR + §1 + §6 + §8 + §12 + §14 + new §15 + Sources + How-this-was-built).
- [x] Write `doc/adr/0019-domain-language-layer.md`.
- [x] Write `doc/adr/0020-deep-modules-vocabulary.md`.
- [x] Write `doc/adr/0021-diagnose-discipline.md`.
- [x] Write this task file.
- [x] Update `AGENTS.md` artifact-stack reference for new Layer 2 (regenerated via `agentic update --yes --force` from updated `src/lib/rootdoc.js`).
- [x] Update `ARCHITECTURE.md` architectural prose for the §8 vocabulary (no retro rewrite).
- [x] Update `README.md` (skill-table descriptions + "Lost mid-flow" hint + "Specifying a feature" workflow + new Planned skills section).
- [x] Update `src/lib/rootdoc.js` SKILL_DESCRIPTIONS for `agentic-spec` and `agentic-next` (source of the managed-skills section).
- [x] Update skill source bodies under `src/skills/{claude-code,codex}/{agentic-bootstrap,agentic-spec,agentic-next}/` to the v0.14 layer numbering.
- [x] Bump `package.json` to `0.14.0-beta.1`.
- [x] Run `npm test` — confirm green (150/150).
- [x] Dogfood refresh `node bin/agentic.js update --yes --force`.
- [ ] PR + merge to `cli`; tag `v0.14.0-beta.1`; `npm publish --tag beta`; smoke verify. (Awaiting user authorization for shared-state actions per WORKFLOW §8 conservatism.)

### Phase 2 (subsequent minors)

- [ ] At start of each subsequent minor, open the per-skill task file (task-0021 through task-0024) per the schedule in Acceptance Criteria Phase 2.
- [ ] Close this task once all four per-skill task files are open and Phase 1 has shipped.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

- **2026-05-10** — Task created on branch `feat/v0.14.0-workflow-deepening`. Phase 1 WORKFLOW edits and all three ADRs landed in the same branch. AGENTS.md / ARCHITECTURE.md / README.md / version bump / test verification / dogfood refresh remaining.
- **2026-05-10** — Filter-strict decision pass with user reduced 18 candidate borrowings to 9 WORKFLOW changes + 3 ADRs + 4 deferred skills. Three "MAYBE" candidates skipped from WORKFLOW: grilling-as-§4.0 (lives in skill only, no principle change), specs-to-code caveat (already covered by §10 fresh-context review), DAG-as-§6.5 (operationalized in task templates, not principle-worthy). Three "SKIP" candidates rejected entirely: small-PRs bullet (redundant with §6 "one logical change per commit"), doc-rot principle (already implicit in `agentic-philosophy` Documentation Discipline + `agentic-audit`), RGR position-change in §9 (kept TDM stance per [ADR-0018](../adr/0018-agentic-tdg-skill.md); RGR tradeoff documented in this task's Notes only).
- **2026-05-10** — Phase 1 complete except for shared-state ship steps. Two commits on branch: `928d1d1` (WORKFLOW + ADRs + task) and `a7ae1e0` (skill body rename four-layer→five-layer + dogfood refresh + version bump + AGENTS/ARCHITECTURE/README updates). 150/150 tests green. Branch ready for PR to `cli`. Tagging + publishing held back pending explicit user authorization.
