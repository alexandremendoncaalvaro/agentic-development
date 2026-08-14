---
name: ad-update
description: Preview and safely update the machine-global Agentic Development kit. Use when the user asks to update agentic, refresh installed skills, get the latest kit, sync the engineering skills, inspect kit drift, or invokes `/ad-update`. Project scope is explicit; preserves local edits unless the user explicitly requests force.
summary: Preview and safely apply the current machine-global Agentic Development kit update, preserving local skill edits by default.
allowed-tools: Read, Bash
---

# /ad-update

Update the machine-global Agentic Development materialization. This is the session-native entry point for the CLI; it does not update a globally installed executable or make unrelated repository changes. A repository-local materialization is a deliberate `--scope project` exception.

## Step 1 — Preview

From any directory, run:

```bash
npx --yes @alexandrealvaro/agentic@latest update --dry-run --yes
```

Report the plan before describing an outcome. Explain `!` lines as preserved or skipped files and `-` lines as verified retired-skill migration removals. A dry-run that shows no material changes is a valid result.

## Step 2 — Apply only when requested

If the user explicitly asks to update, refresh, sync, or apply the kit, run:

```bash
npx --yes @alexandrealvaro/agentic@latest update --yes
```

If the request is only to inspect, explain, or preview, stop after Step 1. Pass `--agent claude-code` or `--agent codex` only when the user scopes the host. Do not add `--force` unless the user explicitly chooses to replace a locally edited file after seeing the plan. For a deliberate project materialization, run the same command from that repository root with `--scope project`; only that mode supports the root-document safeguards.

## Step 3 — Migrate a legacy project only when asked

First preview from that repository root:

```bash
npx --yes @alexandrealvaro/agentic@latest update --scope project --migrate-legacy --dry-run --yes
```

Then apply the reviewed plan without `--dry-run`. The migration removes state-recorded pristine skills, exact historical copies of `WORKFLOW.md` / `WORKFLOW-FLOWS.md`, and the bounded generated skills section in `AGENTS.md` or `CLAUDE.md`. It preserves changed skills and unknown workflow files; use `--force` only after the user explicitly chooses to remove a changed skill.

## Step 4 — Verify and report

Report the command's concrete result: created, updated, preserved, skipped, and migrated files. State whether the global kit was changed; never call it "latest" merely because the command ran. If a local edit was preserved, name the path and offer the user's actual choices: keep it, reconcile it manually, or re-run with explicit `--force`.

The CLI's state-aware comparison and named migrations are authoritative. Do not delete skill directories manually to make an update appear clean; use the explicit legacy migration when the user wants to remove a former project installation.
