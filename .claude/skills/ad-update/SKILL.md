---
name: ad-update
description: Preview and safely update the Agentic Development kit installed in the current project. Use when the user asks to update agentic, refresh installed skills, get the latest kit, sync the engineering skills, inspect kit drift, or invokes `/ad-update`. Runs the project-local CLI flow; preserves local edits unless the user explicitly requests force.
summary: Preview and safely apply the current Agentic Development kit update in this project, preserving local skill edits by default.
allowed-tools: Read, Bash
---

# /ad-update

Update the Agentic Development materialization in the current project. This is the session-native entry point for the CLI; it does not update a globally installed executable or make unrelated repository changes.

## Step 1 — Preview

From the project root, run:

```bash
npx --yes @alexandrealvaro/agentic update --dry-run --yes
```

Report the plan before describing an outcome. Explain `!` lines as preserved or skipped files, `-` lines as verified retired-skill migration removals, and any root-document notice as a deliberate shared-file safeguard. A dry-run that shows no material changes is a valid result.

## Step 2 — Apply only when requested

If the user explicitly asks to update, refresh, sync, or apply the kit, run:

```bash
npx --yes @alexandrealvaro/agentic update --yes
```

If the request is only to inspect, explain, or preview, stop after Step 1. Pass `--agent claude-code` or `--agent codex` only when the user scopes the host. Do not add `--force` unless the user explicitly chooses to replace a locally edited file after seeing the plan. Do not add `--force-root-doc` unless the user explicitly authorizes changing a tracked root document.

## Step 3 — Verify and report

Report the command's concrete result: created, updated, preserved, skipped, and migrated files. State whether the current project was changed; never call it "latest" merely because the command ran. If a local edit was preserved, name the path and offer the user's actual choices: keep it, reconcile it manually, or re-run with explicit `--force`.

The CLI's state-aware comparison and named migrations are authoritative. Do not delete skill directories manually to make an update appear clean; use `agentic uninstall --dry-run --yes` when the user instead wants to remove the project installation.
