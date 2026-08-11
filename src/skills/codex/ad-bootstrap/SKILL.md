---
name: ad-bootstrap
description: Generate AGENTS.md at the repo root by scanning the codebase first, pre-filling placeholders from observed signals, and asking only the genuine gaps. Use whenever the user wants to bootstrap, scaffold, generate, create, set up, or audit AGENTS.md / CLAUDE.md / agents.md (the operational guide for agents working on this project).
summary: Generate or audit `AGENTS.md` at the repo root.
---

<background_information>
Produces `AGENTS.md` at the repo root, ≤150 lines, every line operational. Generic agent behavior (think-before-coding, verify-before-claiming-done, etc.) does NOT belong here — that lives in the `ad-philosophy` skill.

Three modes, detected from filesystem state:
- `AGENTS.md` exists at the repo root → audit (do not rewrite, output drift list only)
- `AGENTS.md` absent and only trivial files present (`.git`, `node_modules`, `.gitignore`, `.gitattributes`, `.DS_Store`, `.env*`, `.idea`, `.vscode`, `LICENSE*`, `README.md`) → greenfield (interview by placeholder, no scan)
- `AGENTS.md` absent and meaningful code present → brownfield (scan first, pre-fill, ask only gaps)
</background_information>

<instructions>
Step 0 — from the consumer repo root, run `node .agents/skills/ad-bootstrap/scripts/project-signals.mjs AGENTS.md` and parse its JSON. Its `mode` selects the filesystem-state branch above; use `stacks` to focus the manifest scan and surface every `unreadable[]` entry as a scan gap, never as an absent path. Skip Step 1 unless the mode is brownfield.

Step 1 — scan (brownfield only). Read in this order, taking the first that exists for each category:
- Manifests: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pubspec.yaml`.
- `README.md`, plus any `doc/` or `docs/` directory.
- Top-level directory listing.
- `doc/adr/` — binding decisions; read every ADR.
- `GUIDELINES.md` at repo root — if present, the AGENTS.md sections that have a corresponding GUIDELINES.md section (Code Style → §2; Quality Gates → §8; Commit & PR → §10; Security & Privacy → §12) emit as pointer stubs instead of inline rules.
- `.claude/`, `.cursor/`, `.openai/`, `.agents/` — existing agent config.
- Hook configs: `.husky/`, `.pre-commit-config.yaml`, `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/`.
- Lockfiles: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`, `Cargo.lock`.
- `git remote -v` for the repo URL.

Build a model of: stack (languages and versions), entry points, build / test / lint commands, conventions, quality gates, security boundaries, gotchas confirmed by code.

Step 2 — pre-fill. For every `<placeholder>` in the template, fill from observed signals. No fabrication. If a section has no signal, write `<TODO: not yet wired>` in one line and move on. Do not write meta-prose explaining the gap.

Step 3 — show only the gaps. Print to the user:
- (a) placeholders that could not be filled from repo signals;
- (b) signals that conflict (two test commands, two style configs, README contradicts code, etc.).

One question per gap. Skip everything filled confidently. Do NOT ask philosophical questions ("is this doc for agents or humans?", "what is the most important quality bar?") — those are decisions, not interview material.

Step 4 — write the file. On user confirmation, write `AGENTS.md` at the repo root. Cut every line that does not change agent behavior. No "External Resources" section (URLs are derivable from `git remote` and the manifest). No appended Universal Agent Behavior block. No marketing prose.

Audit-mode override: do NOT write the file. Produce a drift list. Format each line as:
`[file or section]: spec says X, code says Y. Suggested resolution: change spec / change code / discuss.`

If something the user says contradicts what the code shows, surface the conflict. Don't silently trust the user; don't silently trust the code.
</instructions>

<template path="AGENTS.md">
The `AGENTS.md` skeleton lives in [references/agents-template.md](references/agents-template.md) — fill its `<placeholders>` from the scan; pick the `<when-guidelines-md-exists>` variant when `GUIDELINES.md` is present, else `<when-no-guidelines>`; omit sections with no signal.
</template>

<output_contract>
A single `AGENTS.md` at the repo root, ≤150 lines, every line operational. No "External Resources" section. No appended Universal Agent Behavior block — that lives in the `ad-philosophy` skill. No meta-prose explaining gaps. In audit mode: a drift list, no file written.

`AGENTS.md` is a narrative document, so the Documentation Discipline rules in `WORKFLOW.md` §2 apply at write time:
- No emoji anywhere in the file.
- No dates, version stamps, `DRAFT` markers, or changelog blocks. Stack versions are facts (`Node ≥18`); release timelines are not.
- `Project Overview` is the business-context-first paragraph — *why* the project exists before *what* it does.
- One scope: this file is the operational guide for agents. Do not duplicate `ARCHITECTURE.md` patterns or ADR rationale here; link instead.
- No speculation. If a section has no signal, write `<TODO: not yet wired>` once; do not narrate "this could be added later".
</output_contract>

## Next

- Run `/ad-architecture` once load-bearing patterns emerge in the code.
- When you scope a product (multi-feature, target user, success metrics): `/ad-prd` (Layer 3 of the six-layer artifact stack).
- When you start your first feature: `/ad-spec` (Layer 4 of the six-layer artifact stack; references parent PRD for product-scope inheritance).
- Do not create artifacts before the work needs them — the WORKFLOW §1 prune principle applies.
- `ad-philosophy` auto-loads on non-trivial work.
