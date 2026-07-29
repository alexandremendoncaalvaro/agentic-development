# Task `0005`: Fix wrong-depth kit cross-reference links in skill bodies

**Status:** done
**Created:** 2026-07-27
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Skill `SKILL.md` files at `src/skills/<host>/<skill>/` referenced kit docs (ADRs, `WORKFLOW.md`, `CONTEXT.md`, `templates/`) with a relative link like `[ADR-0030](../../doc/adr/0030-...)`. From that file's location, `../../` resolves to `src/skills/`, so the link points at the non-existent `src/skills/doc/adr/` — broken. The correct depth from a `src/skills/<host>/<skill>/SKILL.md` is `../../../../` (four levels to the repo root), matching `ad-philosophy`'s already-correct `../../../../WORKFLOW.md`.

A deterministic audit sorted the relative links into three buckets. **Fix to source-correct depth:** 20 `../`-prefixed cross-references to kit-canonical docs (ADRs, `WORKFLOW.md`, `templates/`) across 11 files. **Recategorize to bare path:** one `CONTEXT.md` reference in `ad-diagnose`, wrongly bucketed at first as a kit cross-ref — `CONTEXT.md` is a per-project artifact that `ad-domain` generates at each *consumer's* root, so `ad-diagnose` reading it means the current project's file, referenced bare (matching `ad-domain`'s own sibling `CONTEXT.md` links), not a depth-corrected kit path. **Leave unchanged:** the bare-path target-project references that generation skills (`ad-bootstrap`, `ad-domain`) and `templates/` emit into the consumer's own files — rewriting those would put broken links into every consumer's output.

The correct depth from a `src/skills/<host>/<skill>/SKILL.md` to a repo-root doc is `../../../../` (four levels), matching `ad-philosophy`'s already-correct `../../../../WORKFLOW.md` precedent.

**Source vs installed (why source-correct, per doc type).** A `SKILL.md` exists at two depths — source `src/skills/<host>/<skill>/` (four levels to root) and installed `.claude/skills/<skill>/` (three levels) — and the two must be byte-identical (idempotency contract), so no single relative path resolves from both. The fix targets **source-correct** depth, justified per doc type rather than by blanket analogy: **ADRs** are kit-internal and never placed in a consumer tree. **`WORKFLOW.md` and `templates/`** ship inside the npm package but the installer (`src/lib/install.js`, `src/commands/init.js`) never copies them into a consumer's tree either, so the kit's own canonical copy is the referent. **`CONTEXT.md`** is the exception — it is generated in every consumer tree, so its references stay bare-path (target-project), not depth-corrected. Installed copies are read by the agent as text and never clicked, so their non-resolving links are an accepted limitation of the byte-identical-install model, not a regression (they were already broken from source).

## Acceptance Criteria

- [x] The 20 `../`-prefixed cross-references to kit-canonical docs (ADR / `WORKFLOW.md` / `templates/`) in skill `SKILL.md` files are fixed to source-correct depth (`../../../../`) and resolve from their source location.
- [x] The one `CONTEXT.md` reference (in `ad-diagnose`) is recategorized to a bare target-project path, matching `ad-domain`'s convention — not depth-corrected to the kit's own `CONTEXT.md`.
- [x] The bare-path target-project references (in `ad-bootstrap`, `ad-domain`, `ad-guidelines`, `templates/`) are LEFT UNCHANGED.
- [x] No surrounding prose is reworded — pure link-path change only.
- [x] Dogfood installed copies regenerated (`update --yes --force`); managed table unaffected.
- [x] A re-audit reports zero remaining `../`-prefixed wrong-depth links.
- [x] `npm test` green.

## Plan

- [x] Deterministic audit (path math, not per-file guessing) of every relative link in tracked markdown; separate genuine wrong-depth cross-refs from target-project references and examples/placeholders.
- [x] Apply source-correct depth ONLY to the `../`-prefixed kit cross-refs; leave bare-path and single-`../` example links untouched.
- [x] `node bin/agentic.js update --yes --force`; re-audit; `npm test`.
- [x] Fresh-context §10 review before PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-27

Followed up the chip spawned during W1b's review. The chip framed this as "fix all to correct depth," but exhaustive grounding showed a naive sweep would break the bare-path target-project / template links (generation skills emit `[GUIDELINES.md](GUIDELINES.md)` into the *consumer's* AGENTS.md, where the bare path is correct). Scoped to the genuine `../`-prefixed kit cross-refs and fixed them source-correct (matching `ad-philosophy`'s precedent). Applied via a deterministic path-math script (depth is computation, not judgment).

A three-agent adversarial §10 review (independent re-audit + Standards + Spec, run as a workflow) confirmed the re-audit clean (no miss, over-reach, or prose change) and surfaced one real Spec finding: the `ad-diagnose` `CONTEXT.md` link had been mis-bucketed as a kit cross-ref and depth-corrected to point at the kit's own `CONTEXT.md`, when `CONTEXT.md` is a per-consumer generated artifact and should be a bare target-project path (as `ad-domain` links it). Recategorized it to bare; the design-note reasoning was tightened to justify source-correct depth per doc type (ADR vs WORKFLOW/templates vs CONTEXT.md) rather than by blanket analogy, and folded into Context to match the task template. 226/226 green; re-audit clean.

### 2026-07-29 — closed

Shipped in PR #40 (`dbbe42f`), merged to `main` with CI green. Every acceptance criterion and Definition-of-Done item above is checked against work that actually landed, not against intent.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
