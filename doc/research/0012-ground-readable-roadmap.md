# GROUND-0012: Make the roadmap readable at a glance

**Status:** recorded
**Decision:** Keep `ad-roadmap`'s artifact reconciliation and percentage calculation, default unqualified requests to a project-wide report, add an explicit task-scoped report when requested, and render either scope through its own plain-language thirty-second checklist template.
**Decision ref:** doc/tasks/0071-make-roadmap-readable-at-a-glance.md
**Confidence:** Strong

## Decision and confidence

The happy path is a presentation refinement, not a new planning system. An unqualified request should keep the product roadmap as its spine and report the whole project; task scope should activate only when the user asks for one task and should stay within that task's outcome, plan, acceptance checks, and definition of done. Each scope gets a stable template, while both lead with the same thirty-second overview and use the same `- [x]` / `- [ ]` grammar. Broad project collection remains cheap and bounded to roadmap sections, frontmatter, references, checkbox counts, and read-only git evidence that disambiguates several tasks marked in progress. Only tasks actually marked `in-progress` receive a focused read of `## Context` and `## Acceptance Criteria` in project scope; explicit task scope may read the selected task sections needed to render its own plan. Axis-2 verdict: Strong; the change is reversible, reuses the existing evidence ledger, follows established public and in-repo patterns, and is protectable with dual-host source contract tests.

## Evidence

### E1 — A roadmap should explain direction and progress in language its audience can scan quickly

**Strength:** High
**Provenance:** A1, A2, A3, B1, C2

Atlassian describes a roadmap as a shared source of truth for vision, direction, priorities, and progress, stresses that the audience must understand it, and recommends showing the necessary detail rather than overwhelming the reader. GOV.UK guidance independently requires plain language and content structured around what users need to find out or do. GitHub's public roadmap applies the same idea by exposing each item with status, stage, and area. The repository's handoff contract already compresses a roadmap into Done / Now / Next for a decision-maker who did not watch the work.

### E2 — Standard task-list syntax is the smallest familiar representation of done versus remaining

**Strength:** High
**Provenance:** A4, B1, C2

GitHub's official Markdown documentation defines `- [ ]` and `- [x]` task lists as a way to break work into smaller tasks and track completion. The public GitHub roadmap similarly turns roadmap items into trackable issues, and the in-repo handoff contract already uses standard checked and open boxes for one dependency-ordered plan. Reusing that representation gives the reader immediate state visibility without adding a custom status glyph or a second data store.

### E3 — Focused active-task reading adds useful explanation without turning the broad rollup into a full-document crawl

**Strength:** High
**Provenance:** A1, A2, C1, C2, C3, D1

The existing skill deliberately limits broad reconciliation to the roadmap and implementation ledger, which keeps the report fast and evidence-backed. The active front is the one place where the user explicitly needs more than labels and identifiers. Reading only `## Context` and `## Acceptance Criteria` for tasks marked `in-progress` supplies the purpose and remaining steps needed for a plain explanation while preserving the original read-only boundary and avoiding unrelated task prose. When several tasks carry that status, the in-repo handoff pattern supports consulting live working-tree and commit state rather than choosing an arbitrary stale entry. Git history confirms that the original frontmatter-only rule was a performance and scope choice, not a prohibition on a narrowly justified presentation refinement.

### E4 — The new hierarchy should lead with meaning and keep tiers, percentages, and artifact identifiers as evidence

**Strength:** High
**Provenance:** A1, A2, A3, B1, C1, C3

The current output leads with a percentage and tier labels, which answers the calculation but makes a newcomer reconstruct the delivery story. Public guidance favors context, direction, user need, and necessary detail. The refined hierarchy therefore opens with the main front, current state, next front, progress, and blocker; explains the active front; then shows the complete tiered checklist with counts and artifact identifiers as supporting evidence. When nothing is marked in progress, honesty requires saying so and selecting the first remaining item as next rather than inventing current work.

### E5 — Project and task roadmaps should be explicit scopes with separate templates

**Strength:** High
**Provenance:** A1, A3, A4, B1, C2, C3

Product-roadmap guidance treats the roadmap as the project-level direction and priority spine, while task-list guidance treats checkboxes as the decomposition of one unit of work. The public GitHub roadmap keeps those levels linked but distinct: the roadmap exposes product direction and each issue carries its own delivery detail. The repository's handoff template likewise separates its compressed whole-front roadmap from detailed open artifacts. Defaulting to the project view preserves the skill's original decision-maker question; entering task scope only on an explicit request prevents a current task from silently replacing the product plan. Separate bundled templates make that boundary deterministic without creating a new state artifact.

## Source register

- **A1:** Atlassian, "Product roadmaps", https://www.atlassian.com/agile/product-management/product-roadmaps, roadmap as shared source of truth; importance of why, audience comprehension, and necessary detail (accessed 2026-09-09 via Web open)
- **A2:** GOV.UK Content and Publishing Guidance, "Understand content design", https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/understand-content-design/, clear plain-English content that helps people quickly find what they need to know or do (accessed 2026-09-09 via Web search and open)
- **A3:** Atlassian, "Roadmaps", https://www.atlassian.com/agile/product-management/roadmaps, Now / Next / Later framing and linking product direction to delivery work (accessed 2026-09-09 via Web open)
- **A4:** GitHub Docs, "About tasklists", https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/about-tasklists, standard `- [ ]` and `- [x]` syntax for tracking completion (accessed 2026-09-09 via Web open)
- **B1:** GitHub public roadmap, https://github.com/github/roadmap, roadmap items represented as issues with status, stage, area, and delivered closure (accessed 2026-09-09 via Web open)
- **C1:** `src/skills/{claude-code,codex}/ad-roadmap/SKILL.md`, current reconciliation, broad-read, and percentage-first output contract (accessed 2026-09-09 via `sed`)
- **C2:** `src/skills/codex/ad-handoff/SKILL.md` and `src/skills/codex/ad-handoff/references/handoff-template.md`, existing plain-language decision-maker brief plus standard checklist and Done / Now / Next roadmap pattern (accessed 2026-09-09 via `sed`)
- **C3:** `doc/tasks/0071-make-roadmap-readable-at-a-glance.md`, accepted behavior and bounded-read criteria (accessed 2026-09-09 via `sed`)
- **D1:** `git show d74b7c7 -- doc/adr/0053-ad-roadmap-progress-rollup.md src/skills/codex/ad-roadmap/SKILL.md`, original skill decision and its frontmatter-only, percentage-first realization (accessed 2026-09-09 via git show)

## Limitations and reversal

This receipt establishes a grounded output contract, not measured comprehension across a representative user sample. If usage shows that the overview cannot be understood without opening artifacts, that nested checklists obscure rather than clarify active work, that users regularly expect task scope from unqualified requests, or that focused section reads create material latency or context pressure, revisit the hierarchy and measure it against representative repositories before widening the read scope.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0012-ground-readable-roadmap.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
