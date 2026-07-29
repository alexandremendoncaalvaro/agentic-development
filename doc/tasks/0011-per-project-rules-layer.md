# Task `0011`: Per-project rules layer in `ad-audit` / `ad-level-up`

**Status:** in-progress
**Created:** 2026-07-28
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0043](../adr/0043-per-project-rules-layer.md) (amending [ADR-0035](../adr/0035-rules-location-convention.md)) adds a third rule-set layer — per-project curated rules at `.agentic/rules/` — with project-wins-and-report precedence over the machine store and a per-repo commit-or-machine-local visibility choice (`.git/info/exclude`, never `.gitignore`). Scoped through an `ad-grill-me` session; this task lands the mechanics in the two consuming skills, both hosts.

## Acceptance Criteria

- [x] `ad-audit` (both hosts) resolves three layers — binding docs (always) ∪ machine store (optional) ∪ `.agentic/rules/` (if present) — and on genuine conflict applies the project rule while reporting the shadowed machine-store rule in the audit output; the Codex announce/quick-map blocks reflect three layers.
- [x] `ad-level-up` (both hosts) carries the layer-picker (you-everywhere → machine store; this-project → `.agentic/rules/`), asks committed vs machine-local on first project-rule creation, writes the `.git/info/exclude` entry itself in machine-local mode (on approval), and re-offers the wiring when it finds an unexcluded, uncommitted `.agentic/rules/`.
- [x] Frontmatter updated: `ad-audit` `description` mentions both curated layers; `ad-level-up` `summary` names the machine (ADR-0035) and project (ADR-0043) targets (≤320 chars); managed AGENTS.md table regenerated.
- [x] ADR-0035 carries the `Amended by: ADR-0043` pointer (annotation only; body untouched).
- [x] `CONTEXT.md` gains the "Rule-set layer" vocabulary (three layers, aliases to avoid).
- [x] Dogfood regenerated; state re-keyed; `npm test` green (CI confirms Node 20 / 22).

## Plan

- [x] Branch `feat/per-project-rules-layer` off `main`.
- [x] Write ADR-0043; annotate ADR-0035; apply skill edits (both hosts) + frontmatter + CONTEXT.md.
- [x] `node bin/agentic.js update --yes --force`; `npm test`; two-axis §10 review; PR; merge on CI green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-28

Scoped via an `ad-grill-me` session with the user (dogfooded, three questions): Q1 fixed the object as scope layering (severity levels and audit-depth presets explicitly out); Q2 landed the in-repo `.agentic/rules/` home with the user's refinement that visibility is a per-repo choice — committed in personal repos, machine-local via `.git/info/exclude` (never `.gitignore`, which is committed and team-visible) in employer repos; Q3 confirmed project-wins-and-report precedence, grounded on the user's own precedent that the repository's standard wins over personal defaults on conflict. Leaf decisions resolved by binding docs and declared: anti-duplication boundary (Documentation Discipline rule 5), same file format as the machine store, layer-picker + exclude-wiring in ad-level-up, three-layer resolution in ad-audit. ADR-0035 annotated with an Amended-by pointer (83b0c7a precedent — annotate, don't rewrite). Summaries re-trimmed under the 320 cap (318/303). `npm test` 226/226 green; dogfood byte-identical all four files.

Two-axis §10 review (rerun after the first attempt was killed mid-run by a session limit — an incomplete review is not a review). Spec axis: one real Blocker — the codex host dropped the re-offer-on-fresh-clone sentence ADR-0043 requires (the `.git/info/exclude` entry is per-clone); restored in codex Step 6, both hosts now carry it. The AC2 overstatement concern resolves with the fix. All other clauses verified MET with direct measurement (318/303 summaries, 226/226 tests, byte-identical dogfood, precedence wording identical across hosts, no scope creep).

Standards axis: one real Blocker, verified-by-execution by the reviewer — `src/leak-guard.js` only matched top-level `rules/`, so nothing actually blocked committing `.agentic/rules/` in this public repo, contradicting ADR-0043's "machine-local is the only mode here, by design". Fixed by extending the guard to `.agentic/rules/` + a regression test (suite now 227/227) + a `.gitignore` line — the ADR claim is true as of this same commit. Concerns accepted: commit subject trimmed to ≤72; ADR-0035's rejected-alternative bullet gained an inline Superseded marker (83b0c7a precedent — the Consequences stanza needed none, its leak-guard claim is true again post-fix); CONTEXT.md Related-code now cites both hosts per the file's dual-host convention. Note on all-ADRs-proposed vs AGENTS.md "all accepted": pre-existing drift, pending the user's ratification pass.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
