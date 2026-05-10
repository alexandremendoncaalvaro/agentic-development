---
name: agentic-audit
description: Read-only drift audit — compare AGENTS.md, ARCHITECTURE.md, ADR statuses, feature specs in doc/specs/, and documentation discipline against what the code actually does. Outputs a drift list, never writes files. Use when the user wants to audit, review for drift, sanity-check, or report inconsistencies between the repo's docs and its code.
allowed-tools: Read, Glob, Grep, Bash
---

# /agentic-audit

Read-only. Produces a drift list comparing the repo's operational docs against what the code actually does. Writes nothing — the user decides whether to fix the spec or the code.

## Step 1 — Decide what to audit

If the user names an artifact (`AGENTS.md`, `ARCHITECTURE.md`, ADRs, specs), audit only that. Otherwise audit all categories below.

## Step 2 — Run checks

### `AGENTS.md` drift (if present)

* Stack — does the listed stack match `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / equivalent?
* Setup/build/test commands — do they match `package.json#scripts`, `Makefile`, or `pyproject.toml`?
* Quality gates — do referenced hook configs exist (`.husky/`, `.pre-commit-config.yaml`, `.github/workflows/`)?
* Repository layout — do referenced directories exist?
* Pre-approved commands — anything in the list missing from the toolchain?

### `ARCHITECTURE.md` drift (if present)

* Layers and boundaries — do the named directories exist? Sample 1–2 files per layer; are imports respecting the stated boundaries?
* Patterns — sample one handler / one repository / one entry point. Do they follow the documented pattern?
* Active ADRs section — every entry in `doc/adr/` with `Status: accepted` is listed; nothing listed has been superseded.

### ADR drift (if `doc/adr/` exists)

* Numbering — gaps or duplicates in `doc/adr/NNNN-*.md`?
* Status field — every ADR has one of `proposed | accepted | deprecated | superseded by ADR-NNNN`.
* Superseded chains — every "superseded by ADR-NNNN" target exists.

### Spec drift (if `doc/specs/` exists)

Structural integrity only — does **not** deep-audit spec text against shipped code (deferred per [ADR-0011](../../doc/adr/0011-agentic-spec-skill.md) Consequences).

* Numbering — gaps or duplicates in `doc/specs/NNNN-*.md`?
* Status field — every spec has one of `draft | accepted | shipped | superseded by SPEC-NNNN`.
* Superseded chains — every "superseded by SPEC-NNNN" target exists.
* Reciprocity — every task under `doc/tasks/NNNN-*.md` whose `Spec ref` field is non-empty points to a spec that exists. And every spec with `Status: accepted` or `shipped` has at least one entry in its `Related → Tasks` list (an accepted spec with no implementing task is a smell).
* Success Criteria coverage — when every task that references a spec is `done`, the spec's Success Criteria checkboxes should all be checked. A spec with all tasks `done` but unchecked Success Criteria boxes is drift between work-unit completion and feature-level claim.

### Documentation discipline drift (`WORKFLOW.md` §2 / ADR-0008)

Audit narrative documents — `README.md`, `AGENTS.md` / `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, any prose page under `doc/` that is not a decision-record artifact under `doc/adr/` or `doc/tasks/`:

* Emoji — any present? Rule 3 forbids emoji anywhere (docs, code, comments, commits, skill outputs).
* Dates / version stamps / `DRAFT` markers / changelog blocks in narrative documents — Rule 2 forbids these. Decision-record artifacts under `doc/adr/` and `doc/tasks/` are exempt.
* Business context first — does the first paragraph answer *why* the document exists, before *what* and *how*? Rule 4.
* Scope duplication — does the document copy material that is canonically owned by another file (`AGENTS.md` repeating `ARCHITECTURE.md` patterns; `README.md` re-stating ADR rationale)? Rule 5 requires linking, not copying.
* Speculation — phrases like "we might", "in the future", "could be added", or roadmaps without an ADR / task reference. Rule 1 forbids unfounded plans.

Source code (sample, not exhaustive — flag findings, not every match):

* Orphan `TODO` / `FIXME` — Rule 7. A reference to a GitHub Issue or a `doc/tasks/NNNN-*.md` task file makes it not orphan.
* Commented-out code blocks — Rule 7. Removed code lives in git history.

## Step 3 — Output

One line per finding, formatted:

```
[file or section]: spec says X, code says Y. Suggested resolution: change spec / change code / discuss.
```

Group by artifact. If a category has no drift, print one line: `AGENTS.md — no drift.` etc. If an audited artifact does not exist, say so explicitly rather than reporting zero findings. The Documentation discipline drift category groups its own findings under `Documentation discipline — <category>: ...`.

If something the user says contradicts what the code shows, surface the conflict. Don't silently trust the user; don't silently trust the code.

## Output contract

A drift list, no file written. Read-only operation. Empty result is reported explicitly ("no drift found across audited artifacts"), not silently. Missing artifacts are flagged, not skipped.

## Next

- Address each finding with one of the three resolutions named in the format ("change spec / change code / discuss").
- For findings that require implementation: `/agentic-task` to scaffold the fix.
- For workflow drift (where am I, what's stuck): `/agentic-next`.
- For kit-version drift (state file behind current kit): `agentic update`.
