---
name: ad-drift
description: Read-only drift audit — compare AGENTS.md, ARCHITECTURE.md, and ADR statuses against what the code actually does. Outputs a drift list, never writes files. Use when the user wants to audit, review for drift, sanity-check, or report inconsistencies between the repo's docs and its code.
summary: Read-only drift report comparing AGENTS.md / ARCHITECTURE.md / ADRs against the code.
---

<background_information>
Read-only. Produces a drift list comparing the repo's operational docs against what the code actually does. Writes nothing — the user decides whether to fix the spec or the code.
</background_information>

<instructions>
Step 1 — decide what to audit. If the user names an artifact (AGENTS.md, ARCHITECTURE.md, ADRs), audit only that. Otherwise audit all categories below.

Step 2 — run the deterministic scan. The mechanical checks — artifact numbering, `Status:` validity, supersession-target existence, amendment-pair matching, emoji in narrative docs, checkbox UI in definition docs / specs, and AGENTS-to-GUIDELINES reciprocity — are a bundled script (ADR-0057), not prose to re-derive by hand. Run it from the repo root and read its JSON:

```bash
node .agents/skills/ad-drift/scripts/drift-scan.mjs
```

If this skill loaded from a different base directory (stated at the top of the skill load), substitute it — the script lives at `scripts/drift-scan.mjs` inside it.

The JSON carries `numbering` (per decision-record layer `adr` / `specs`, each with `duplicates` and `gaps`), `status` (`adr` / `specs`, records with a missing or out-of-enum `Status`), `supersession` (dangling `superseded by` targets), `amendmentPairs` (unpaired `Amends` / `Amended by` declarations), `emoji` (`{path, line}` in narrative docs), `checkbox` (`{path, line}` of checkbox UI in definition docs / specs, fenced examples excluded), `constitutionReciprocity` (an `applicable` flag and `duplicateSections` entries `{section, guidelinesSection, line}`), and `unreadable` (`{path, code}` — files the scan could not read, so any check over them is missing; report the gap). A reciprocity entry means that a mapped AGENTS heading exists but lacks its designated `GUIDELINES.md` section pointer; an absent heading is valid, and a pointer may retain a short operational subset. Tasks are not a numbering/status layer here (the audit has no task-drift category — tasks surface only under spec reciprocity, which stays judgment below). Step 3 narrates these facts; everything the scan does not compute below is judgment you perform by reading.

Step 3 — interpret checks.

AGENTS.md drift (if present):
- Stack — does the listed stack match `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / equivalent?
- Setup/build/test commands — do they match `package.json#scripts`, `Makefile`, or `pyproject.toml`?
- Quality gates — do referenced hook configs exist (`.husky/`, `.pre-commit-config.yaml`, `.github/workflows/`)?
- Repository layout — do referenced directories exist?
- Pre-approved commands — anything in the list missing from the toolchain?
- AGENTS-to-GUIDELINES reciprocity — when `constitutionReciprocity.applicable` is true, report each `duplicateSections` entry as a duplicate detailed-rules finding. A missing mapped heading is valid; a designated pointer within the heading is valid even with a short operational subset.

ARCHITECTURE.md drift (if present):
- Layers and boundaries — do the named directories exist? Sample 1–2 files per layer; are imports respecting the stated boundaries?
- Patterns — sample one handler / one repository / one entry point. Do they follow the documented pattern?
- No `## Active ADRs` section — ARCHITECTURE.md must not duplicate the `doc/adr/` directory index per ADR-0030 §2.

ADR drift (if `doc/adr/` exists):
- Numbering — `numbering.adr`: `duplicates` (two records sharing a number) is always drift. `gaps` is informational and expected wherever `/ad-archive` hard-deletes completed records (git history is their ledger); treat a gap as drift only when the project does not archive and the missing number is unexplained.
- Status field — `status.adr` lists every ADR whose `Status` is missing or outside `proposed | accepted | deprecated | superseded`.
- Superseded chains — `supersession` (its `adr` entries) lists every "superseded by ADR-NNNN" whose target record is absent.
- Amendment pairs — a partial supersession is declared as a header-field pair: `**Amends:**` on the amending record, `**Amended by:**` on the amended one. `amendmentPairs` pre-computes every unpaired declaration, comparing relations NOT filenames (`A declares Amends: B` must be answered by `B declares Amended by: A`) — which is why a keyword sweep for `supersed|amends` is NOT the check: it reports records that merely discuss the vocabulary or state they augment rather than supersede. Know the limit: this check is silent in a layer that never adopted the fields (`amendmentPairs` is empty) — measured across three repositories, the field check returned nothing there while a keyword sweep returned between one and ten hits per layer, much of it noise. So when a layer holds records whose prose claims supersession and carries no amendment field anywhere, say so once, as an adoption suggestion; do not enumerate a sweep's hits as findings. A signal firing on a quarter of a directory stops being read.
- State projection contradicting a live record (only if the layer has one — `<layer>/PROJECTION.md`, the name rule 10 fixes; check every append-only layer, not just `doc/adr/`). Report a record the projection calls fully binding whose own header says otherwise (`deprecated`, `superseded by`, or an `Amended by:` the projection omits), and a record the projection lists as retired-in-part that carries no such marker. A missing projection is NOT a finding — rule 10 permits one, it does not require one; flagging absence would turn a permission into an obligation the rule never granted.

Spec drift (if `doc/specs/` exists; structural integrity only — does NOT deep-audit spec text against code, deferred per ADR-0011):
- Numbering — `numbering.specs`: `duplicates` is drift, `gaps` informational (as for ADRs).
- Status field — `status.specs` lists every spec whose `Status` is missing or outside `draft | accepted | shipped | superseded`.
- Superseded chains — `supersession` (its `specs` entries) lists every "superseded by SPEC-NNNN" whose target is absent.
- Reciprocity — the scan does not compute this; read it. Every task with non-empty `Spec ref` points to a spec that exists; every accepted/shipped spec has at least one entry in its Related → Tasks list.
- No checkbox UI — per ADR-0030 §1, Spec is decision-record (not tracking). Functional Requirements / Non-functional Requirements / Success Criteria must use plain bullets, not `- [ ]` checkboxes; implementation tracking lives in per-Spec tasks. `checkbox` (its `doc/specs/` entries) pre-computes these.
- Status / task aggregate alignment — the scan does not compute this; read it. When every task referencing a spec is done, the spec's Status should be `shipped`. A spec with all tasks done but Status: accepted is drift between work-unit completion and feature-level claim.

Documentation discipline drift (`WORKFLOW.md` §2 / ADR-0008). Audit narrative documents — `README.md`, `AGENTS.md` / `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, and prose pages under `doc/` that are not lifecycle-managed artifacts under `doc/product/`, `doc/specs/`, `doc/adr/`, or `doc/tasks/`:
- Emoji — `emoji` lists every `{path, line}` in the fixed narrative-doc set. Rule 3 forbids emoji anywhere (docs, code, comments, commits, skill outputs), so extend by eye to code/comments and to any non-lifecycle prose page under `doc/` — the scan's fixed doc set does not reach those.
- Dates / version stamps / `DRAFT` markers / changelog blocks in narrative documents — Rule 2 forbids these. Lifecycle-managed artifacts under `doc/product/`, `doc/specs/`, `doc/adr/`, and `doc/tasks/` are exempt.
- Business context first — does the first paragraph answer *why* the document exists, before *what* and *how*? Rule 4.
- Scope duplication — does the document copy material that is canonically owned by another file? Rule 5 requires linking, not copying.
- Speculation — phrases like "we might", "in the future", "could be added", or roadmaps without an ADR / task reference. Rule 1 forbids unfounded plans.

Source code (sample, not exhaustive — flag findings, not every match):
- Orphan `TODO` / `FIXME` — Rule 7. A reference to a GitHub Issue or a `doc/tasks/NNNN-*.md` task file makes it not orphan.
- Commented-out code blocks — Rule 7. Removed code lives in git history.

Single-responsibility drift (ADR-0030 / WORKFLOW §2 rules #9–#12):
- Definition-layer tracking UI (Rule #9) — `checkbox` lists checkbox UI (`{path, line}`) in AGENTS.md, WORKFLOW.md, ARCHITECTURE.md, GUIDELINES.md, CONTEXT.md, `doc/product/*.md`, and specs, with fenced code-block examples (PR-body templates, etc.) already excluded. Definition documents must not carry per-item checkbox UI.
- Directory-as-index duplication (Rule #10) — flag sections that re-state another layer's index: `## Active ADRs` inside ARCHITECTURE.md or AGENTS.md; multi-bullet `## Architectural Principles` digests paraphrasing each ADR; PRD `## Related → ADRs` bullet lists enumerating the kit's ADR ledger. NOT a finding: a layer's own state projection inside its own directory — rule 10 sanctions exactly one per append-only layer. It IS a finding when that projection only lists records without saying what still binds, which makes it a duplicate index wearing the exception's name.
- Kit-state in WORKFLOW.md (Rule #12) — grep `ADR-[0-9]{4}` in WORKFLOW.md. Universal philosophy must not cite kit-specific ADR numbers (downstream installs lack `doc/adr/`). Literature citations and generic `doc/adr/` references are allowed.
- Cross-references that are decoration (Rule #11) — sample inline `per ADR-NNNN` refs in narrative documents and apply the load-bearing test: deletion leaves the surrounding statement intact → decoration; flag.

Step 4 — output. One line per finding, formatted:
`[file or section]: spec says X, code says Y. Suggested resolution: change spec / change code / discuss.`

Group by artifact. If a category has no drift, print one line: `AGENTS.md — no drift.` etc. If an audited artifact does not exist, say so explicitly rather than reporting zero findings. The Documentation discipline drift category groups findings under `Documentation discipline — <category>: ...`.

If something the user says contradicts what the code shows, surface the conflict. Don't silently trust the user; don't silently trust the code.
</instructions>

<output_contract>
A drift list, no file written. Read-only operation. Empty result is reported explicitly ("no drift found across audited artifacts"), not silently. Missing artifacts are flagged, not skipped.
</output_contract>

## Next

- Address each finding with one of the three resolutions named in the format ("change spec / change code / discuss").
- For findings that require implementation: `/ad-task` to scaffold the fix.
- For workflow drift (where am I, what's stuck): `/ad-next`.
- For kit-version drift (state file behind current kit): `agentic update`.
