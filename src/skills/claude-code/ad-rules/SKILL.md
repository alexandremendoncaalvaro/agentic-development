---
name: ad-rules
description: Resolve and surface the rule-set that binds the current work — repo binding docs, the curated machine store, and project rules — as a topic list, without auditing anything against it. Discovers the practitioner's global rules file when it lives outside the documented locations, and reports the one-line fix so the next session resolves it without being told. Use when the user wants to load, see, list, or refresh the rules, conventions, or standards in force; asks "what are my rules", "bring the topics", "read my global AGENTS"; or starts work in an unfamiliar repo and needs the binding set on the table first. Read-only — never edits a rule, never audits, never approves.
summary: Resolve the rule-set in force (repo binding docs + machine store + project rules per ADR-0035/0043) and surface it as a topic list. Discovers a practitioner global rules file at a non-standard path and prints the one-line fix to make it resolve automatically. Read-only; audits nothing.
allowed-tools: Read, Glob, Grep, Bash
---

# /ad-rules

Loads the rules that bind the current work and puts their topics on the table. Nothing else — this skill does not check the work against them (`/ad-audit`), does not change them (`/ad-level-up`), and does not write files.

It exists because the practitioner's own cross-project rules live at a path the kit cannot guess, so every session started with the same manual instruction: read this file, list the topics. That is setup, not thinking, and it should happen once per machine rather than once per session.

## Step 0 — Confirm regime

Run when the user asks to load, see, list, or refresh the rules in force, asks what governs the current work, or is starting in a repo whose conventions they have not read yet.

Route elsewhere when:

- The user wants the work checked against the rules → `/ad-audit`.
- The user wants to add, sharpen, merge or retire a rule → `/ad-level-up`.
- The user wants documentation-vs-code drift → `/ad-drift`.
- The user wants to know what to do next → `/ad-next`.

## Step 1 — Resolve the layers

Per ADR-0035 and ADR-0043, the rule-set is the union of three layers. Resolve each and record whether it was found, so the report distinguishes *absent* from *empty*.

1. **Repo binding docs (always).** `AGENTS.md`, `ARCHITECTURE.md`, `GUIDELINES.md`, `CONTEXT.md` / `CONTEXT-MAP.md` at the repo root, plus accepted ADRs under `doc/adr/`. Read what exists; never fabricate a reference.
2. **Curated machine store (optional).** `$AGENTIC_RULES_DIR` if set; else `~/.agentic/rules/` if it exists; else fall to Step 2.
3. **Project rules (optional).** `.agentic/rules/` at the repo root. It may be committed or machine-local; resolution does not care which.

**Precedence:** union, except on genuine conflict, where a project rule wins over a machine-store rule. Shadowing is never silent — report which machine-store rule a project rule shadowed.

## Step 2 — Discover a practitioner rules file

Only when layer 2 did not resolve. The practitioner's global rules commonly predate the machine store and sit in a personal repo under a name the kit does not own — `AGENTS.<initials>.md`, `AGENTS.global.md`, `rules.md`, or similar.

Search, cheapest first, and stop at the first hit:

```bash
for p in "$AGENTIC_RULES_DIR" "$HOME/.agentic/rules" "$HOME/.config/agentic/rules"; do
  [ -n "$p" ] && [ -e "$p" ] && echo "FOUND $p" && break
done
find "$HOME" -maxdepth 4 -iname 'AGENTS*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -20
```

Present what the search returned and let the user pick — do not assume the first result is theirs, and do not read a file outside the repo without saying which one you are opening. If the search returns nothing, say so plainly; an absent practitioner layer is a valid state, not an error.

**When a file is chosen, report the one-line fix rather than remembering it yourself:**

```bash
export AGENTIC_RULES_DIR="<directory containing the chosen file>"
```

Say that adding it to their shell profile makes layer 2 resolve on every future session in every repo, which is the whole point — this skill should be needed once per machine, not once per session. Do not write to their shell profile; that is theirs.

## Step 3 — Surface the topics

For each resolved source, extract its **topics**, not its contents. A topic is a heading or a rule-group name plus a clause saying what it governs. The user is deciding what to read, not reading it here.

Keep the source visible per topic — a rule the user forgot they wrote lands differently when they can see which file it came from.

Order by binding force: repo binding docs first (they govern this codebase), then project rules, then the machine store (it governs the practitioner across repos). Within a source, preserve the source's own order; do not re-rank by your judgement of importance.

Flag two things inline:

- **Conflicts** — a project rule shadowing a machine-store rule, with both texts quoted.
- **Staleness signals** — a rule naming a file, flag, or command that no longer exists. Report it; do not fix it. Fixing is `/ad-level-up`'s job and requires the human gate.

## Step 4 — Report

```
## Rules in force — <repo name>

### Repo binding docs
- `AGENTS.md` — <n> topics: <topic>, <topic>, …
- `GUIDELINES.md` — <n> topics: …
- Accepted ADRs — <n>: <ADR-NNNN short title>, …

### Project rules — `.agentic/rules/`
- <group> — <what it governs>
(or "absent")

### Machine store — <resolved path>
- <group> — <what it governs>
(or "absent — no $AGENTIC_RULES_DIR, no ~/.agentic/rules/")

### Conflicts
<project rule shadowing a machine-store rule, both quoted — or "none">

### Staleness
<rules citing files/flags that no longer exist — or "none">
```

Close with one line naming what the user most likely wanted: the single topic most relevant to the work in progress, or the setup fix if layer 2 did not resolve.

## Output contract

- Writes nothing. Reads only.
- Every layer is reported, including absent ones — absent and empty are distinguishable.
- Topics carry their source file; contents are not dumped.
- Conflicts and staleness are reported, never resolved.
- When layer 2 is unresolved and a practitioner file is found, the `export AGENTIC_RULES_DIR=` line is printed; the shell profile is never edited.
- No audit verdict, no approval, no rule text changed.

## Next

- Check the work against what surfaced → `/ad-audit`.
- A rule that is wrong, duplicated, or missing → `/ad-level-up` (human-gated; it never writes unapproved).
- A rule citing something that no longer exists → `/ad-drift` for the full documentation-vs-code sweep.
