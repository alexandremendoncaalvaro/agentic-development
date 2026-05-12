---
name: ad-subagent
description: Draft a new Codex subagent at .Codex/agents/<name>.md, using the official subagents format. Use when the user wants to create, write, draft, or scaffold a custom Codex subagent for delegated work (fresh-context reviewer, codebase researcher, diff auditor, etc.). Asks one question per missing field; never invents roles or tool sets. Codex only — Codex has no subagent primitive.
summary: Draft a new Codex subagent at `.Codex/agents/<name>.md`.
allowed-tools: Read, Write, Glob, Bash
---

# /ad-subagent

Drafts `.Codex/agents/<name>.md` (project) or `~/.Codex/agents/<name>.md` (personal). Spec: [code.Codex.com/docs/en/sub-agents](https://code.Codex.com/docs/en/sub-agents).

The body becomes the subagent's full system prompt. The subagent does **not** inherit `AGENTS.md` / `AGENTS.md` from the parent — restate any convention it must follow.

## Step 1 — Confirm target

Ask the user:

* **Name** — kebab-case, lowercase. Becomes the file name and the routing handle (`subagent_type: '<name>'`).
* **Personal or project** — `~/.Codex/agents/<name>.md` (personal) vs `.Codex/agents/<name>.md` (project, committed). Default: project.

## Step 2 — Pick a pattern (or build custom)

Common pre-baked shapes (from `prompts/subagent.md`):

| Pattern | Tools | Model | Notes |
| --- | --- | --- | --- |
| Fresh-context reviewer | `Read, Glob, Grep, Bash` | `sonnet` | Matches WORKFLOW §10. No write tools. |
| Codebase researcher | use built-in `Explore` | inherit | Don't build custom unless you need different tools. |
| Diff-only auditor | `Read, Bash` | `sonnet` | Pair with `permissionMode: dontAsk` for read-only runs. |

Built-in subagents (`Explore`, `Plan`, `general-purpose`) cover most cases. Build custom only when you need a specific role, scoped tools, persistent memory, or a different model.

## Step 3 — Interview to fill

Ask one question per missing field, in this order:

* **Role** — one sentence: "You are a <role> that <does X> when <triggered by Y>."
* **Description** — the routing signal. Specific, includes the task framings the parent agent would recognize. Codex reads this to decide whether to delegate.
* **Tools** — comma-separated list. Limit deliberately. A reviewer with `Write` access stops being a reviewer. Omit to inherit all parent tools.
* **Model** — `sonnet | opus | haiku | inherit`. Default: `inherit`.
* **Output contract** — what the subagent returns to the caller. Be explicit about format.
* **Stop criterion** — when the subagent should stop and return control.

**Do not invent values.** When the user does not know something, ask. Do not invent frontmatter fields not in the spec.

## Step 4 — Write the file

Path: `.Codex/agents/<name>.md` (project, committed) or `~/.Codex/agents/<name>.md` (personal). Frontmatter uses the Codex subagents shape (see code.Codex.com/docs/en/sub-agents) — declare only the fields the subagent actually uses.

Body = the system prompt. Every line costs tokens on every subagent turn. Be terse. State role, scope, output format, stop criterion, and what NOT to do. Restate any convention from `AGENTS.md` the subagent must follow (it does not read `AGENTS.md`).

Edits to subagent files on disk require a session restart to take effect; agents created via Codex's `/agents` UI take effect immediately.

## Step 5 — Stop after writing

Do not dispatch to the new subagent, do not test it. The user will exercise it themselves.

## Output contract

A single new file at `.Codex/agents/<name>.md` (or `~/.Codex/agents/<name>.md`). Frontmatter declares only the fields actually used. Body is the system prompt: terse, imperative, with explicit stop criterion. No external file dependencies the user did not ask for.

## Next

- Test the new subagent by exercising the workflow it serves — invoke via the `Task` tool with `subagent_type: '<name>'`.
- Document the subagent in `AGENTS.md` (or the project's operational guide) if it is project-wide rather than personal.
- If the subagent ships alongside a skill (manifest-listed), update the skill's `manifest.json` to declare the file.
