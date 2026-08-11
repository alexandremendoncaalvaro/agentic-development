---
name: ad-rules
description: Load the practitioner's global rules — the host's `CLAUDE.md` or `AGENTS.md`, symlinks resolved — and reinforce them by listing their topics in the conversation, alongside whatever the repo and the kit's rule-set layers add. Use when the user says "read my global CLAUDE.md / AGENTS.md and bring the topics", asks what rules or conventions are in force, wants the rules refreshed mid-session, or starts in a repo whose conventions they have not read. Read-only — never edits a rule, never audits, never approves.
summary: Load the host's global rules file (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, symlinks resolved) and reinforce it by listing topics in the conversation, plus the repo's binding docs and the kit's rule-set layers by reference. Read-only; audits nothing.
allowed-tools: Read, Glob, Grep, Bash
---

# /ad-rules

Loads the rules in force and reinforces them by listing their topics in the conversation. Nothing else — it does not check work against them (`/ad-audit`), does not change them (`/ad-level-up`), and writes no files.

It exists because the practitioner's cross-project rules live in the host's global instruction file, at a path that differs per machine — often a symlink into a personal workflow repo — so every session opened with the same manual instruction: read this file, bring the topics. Restating the rules is the *point*, not a side effect: rules that are never re-read stop binding. What should not repeat is the path archaeology.

## Step 0 — Confirm regime

Run when the user asks to load, see, list, or refresh the rules in force, asks what governs the current work, or is starting in a repo whose conventions they have not read yet.

Route elsewhere when:

- The user wants the work checked against the rules → `/ad-audit`.
- The user wants to add, sharpen, merge or retire a rule → `/ad-level-up`.
- The user wants documentation-vs-code drift → `/ad-drift`.
- The user wants to know what to do next → `/ad-next`.

## Step 1 — Resolve the host's global rules

This is the primary target and the reason the skill exists: the practitioner keeps cross-project rules in their agent host's global instruction file, and every session began by pasting its path by hand.

Run from the consumer repo root:

```bash
node .claude/skills/ad-rules/scripts/resolve-global-rules.mjs
```

If this skill is loaded from a different base directory, substitute that installed skill directory for `.claude/skills/ad-rules` in the command.

Parse its JSON. `primary` is the first readable file in Claude Code's canonical priority order; `sources` reports every found file, including `symlink` entries with both `path` and `resolvedPath`. A `broken-symlink` is "found, target missing", not absent. Surface every `unreadable[]` entry; never collapse it into an absent source.

If none resolves, search for a practitioner file under the names these carry in the wild — `AGENTS.<initials>.md`, `AGENTS.global.md`, `CLAUDE.md`, `rules.md` — and present what you found for the user to pick. Never assume the first hit is theirs; always name a file outside the repo before opening it:

```bash
find "$HOME" -maxdepth 4 \( -iname 'AGENTS*.md' -o -iname 'CLAUDE.md' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -20
```

When more than one canonical path resolves, `primary` wins — this host's own file has priority — and the others are reported as also-present rather than merged. An absent global layer is a valid state, not an error. Say so plainly rather than manufacturing a source.

**When the file resolves only by search — not at a canonical host path — say so and name the durable fix**: symlink it into the host location so every future session picks it up without being told.

```bash
ln -s "<real path>" ~/.claude/CLAUDE.md
```

Print the command; never run it. Creating symlinks in the user's home is theirs to approve.

## Step 2 — Resolve the kit's rule-set layers

Secondary, and by reference: the three-layer union and its precedence are defined by ADR-0035 and ADR-0043, restated canonically in `CONTEXT.md`'s **rule-set** glossary entry, and implemented by `/ad-audit` Step 1. Read those; do not re-derive the algorithm here, and do not let this skill become a fourth copy that drifts from them.

Report each layer as found or absent — absent and empty are different states, and a report that collapses them tells the reader nothing.

## Step 3 — Surface the topics

For each resolved source, extract its **topics**, not its contents. A topic is a heading or a rule-group name plus a clause saying what it governs. The user is deciding what to read, not reading it here.

Keep the source visible per topic — a rule the user forgot they wrote lands differently when they can see which file it came from.

Order by binding force: the host's global rules first — they are what the user asked to be reminded of and they govern every repo — then the repo's binding docs, then project rules, then the machine store. Within a source, preserve the source's own order; do not re-rank by your judgement of importance.

Flag two things inline:

- **Conflicts** — a project rule shadowing a machine-store rule, with both texts quoted.
- **Staleness signals** — a rule naming a file, flag, or command that no longer exists. Report it; do not fix it. Fixing is `/ad-level-up`'s job and requires the human gate.

## Step 4 — Report

```
## Rules in force — <repo name>

### Global — <resolved path><, symlinked from <link> if applicable>
- <topic> — <what it governs>
(or "absent — no CLAUDE.md or AGENTS.md at a canonical host path")

### Repo binding docs
- `AGENTS.md` — <n> topics: <topic>, <topic>, …
- `ARCHITECTURE.md` — <n> topics: …
- `GUIDELINES.md` — <n> topics: …
- Accepted ADRs — <n>: <ADR-NNNN short title>, …

### Kit rule-set layers (per ADR-0035 / ADR-0043)
- Machine store — <resolved path, or "absent">
- Project rules — <`.agentic/rules/`, or "absent">

### Conflicts
<project rule shadowing a machine-store rule, both quoted — or "none">

### Staleness
<rules citing files/flags that no longer exist — or "none">
```

Close with one line naming what the user most likely wanted: the single topic most relevant to the work in progress, or the symlink fix when the global file resolved only by search.

## Output contract

- Writes nothing. Reads only.
- Every source is reported, including absent ones — absent and empty are distinguishable.
- The global file's real path is reported, with the symlink it was reached through when there was one.
- Topics carry their source file; contents are not dumped.
- Conflicts and staleness are reported, never resolved.
- The kit's three-layer resolution is referenced (ADR-0035 / ADR-0043 / `CONTEXT.md` / `/ad-audit` Step 1), never re-derived here.
- When the global file resolves only by search, the `ln -s` command is printed and never run.
- No audit verdict, no approval, no rule text changed.

## Next

- Check the work against what surfaced → `/ad-audit`.
- A rule that is wrong, duplicated, or missing → `/ad-level-up` (human-gated; it never writes unapproved).
- A rule citing something that no longer exists → `/ad-drift` for the full documentation-vs-code sweep.
