# Spec `0001`: `session handoff skill for cross-session continuation`

**Status:** `shipped`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`

## Context

Long agent sessions accumulate inherited bias (WORKFLOW §12 — "almost right" failures compound) and run into context-window pressure that forces ad-hoc summarisation. Engineers switching between Claude Code and Codex, hitting context exhaustion mid-task, or just wrapping up a stretch of work need to hand off live state to a fresh agent without losing the parts the next session actually needs.

Before this feature, the typical workaround was a manual hand-written summary in the chat or a scratch note in `$TMPDIR`. Both forms drift in shape — sometimes they reference artifacts by path, sometimes they paste full bodies; sometimes they redact secrets, sometimes they do not; sometimes they suggest next skills, usually they do not. Ad-hoc summarisation IS the failure mode this feature replaces.

What would break without this feature: every long-session continuation re-creates the handoff format from scratch, the next agent receives inconsistent context shapes, secrets occasionally leak into chat-pasted summaries, and the engineer wastes the first 5–10 minutes of the new session re-deriving what the prior agent already knew.

This spec was backfilled after `ad-handoff` shipped in commit `916a1f7` (v0.17.0-beta.1, 2026-05-23). Adapted from `mattpocock/skills/handoff` (May 2026) and bound to this kit's six-layer artifact stack — captures live state, references PRD / spec / task / ADR by path rather than duplicating them, suggests next skills from the installed `ad-*` set, and redacts secrets before writing.

## User Scenarios

- **Scenario 1: context-window pressure mid-task**
  - Given the user is in a long Claude Code or Codex session with significant pending work (uncommitted diff, unresolved decisions, in-flight task)
  - When the user says `"handoff"`, `"compact this conversation"`, `"I need to /clear"`, or invokes `/ad-handoff`
  - Then the skill writes a structured markdown file to `${TMPDIR:-/tmp}/agentic-handoffs/<ISO>-<slug>.md` and prints the absolute path plus the recommended first action for the next session, without auto-executing any destructive op

- **Scenario 2: agent switch (Claude Code → Codex or back)**
  - Given the user wants to continue the same work in a different agent host
  - When the user invokes `/ad-handoff <slug>` with an optional descriptive slug
  - Then the next session loads the file with `cat <path>` (and `/clear` + paste on Codex / Claude Code), reads PRD / spec / task / ADR references by path, and resumes with cold context but warm intent

- **Scenario 3: secret-bearing session**
  - Given the session has handled API keys, OAuth tokens, `.env` payloads, or other credentials during work
  - When `/ad-handoff` runs
  - Then the written file contains `<REDACTED:type>` placeholders in place of secret values, with a one-line note on where to fetch each (`pull from 1Password vault "X"`, `re-export from env`), so the file is safe to leave on disk

## Requirements

### Functional

- R1: The skill writes exactly one markdown file per invocation, at `${TMPDIR:-/tmp}/agentic-handoffs/<ISO>-<slug>.md`. The directory is created if missing. Never writes inside the repo.
- R2: The file content references PRD / spec / task / ADR by path; it does not duplicate their body content. The next agent reads referenced files fresh.
- R3: The file contains exactly these sections in order: title with slug + ISO date, `Repo` / `Branch` / `Started from` metadata block, `## What the next agent should do first`, `## State`, `## Open artifacts`, `## Unresolved decisions`, `## Recent errors`, `## Suggested skills for the next session`, `## Notes`. Omitted sections are removed entirely (no `N/A` placeholders).
- R4: Secret values matching API-key / JWT / OAuth-token / env-payload patterns are replaced with `<REDACTED:type>` placeholders before write.
- R5: The `Suggested skills` section lists items only from the installed `ad-*` set, each with a one-clause rationale.
- R6: The skill prints the absolute path of the written file and the recommended first action; it does not execute `/clear` or any other destructive session op on the user's behalf.
- R7: Slug derivation, in priority order: (a) argument the user passed, (b) current git branch with non-alphanumeric chars replaced by `-`, (c) `session` as the fallback.

### Non-functional

- The file is per-session and OS-temp-dir ephemeral; never committed to the repo, never added to the repo's `.gitignore`.
- The skill runs in under 5 seconds on a working tree with ≤300 lines of pending diff (the rough threshold above which it summarises per-file rather than inlining the full diff).

## Success Criteria

- A user invoking `/ad-handoff` at any point in a session receives an absolute file path within 5 seconds, with no destructive session op performed.
- The written file contains only the section list in R3, in that order, with no fabricated references and no duplicated artifact bodies.
- No secret value present in the session appears in the written file in plaintext — every match of common credential patterns is replaced with `<REDACTED:type>`.
- The next session can resume work by reading the file plus the artifacts it references by path, without needing further context from the prior session.

## Edge Cases

- **No pending work:** if the working tree is clean and there is no in-flight task, the skill still writes a file but it is minimal (metadata + "no pending work; the prior session ended cleanly" under `## What the next agent should do first`).
- **Diff >300 lines:** skill summarises per-file (paths + ±line counts) and tells the next agent to re-read with `git diff` rather than inlining the full diff body.
- **No remote tracked:** the `Divergence` line in `## State` reads `no remote tracked` rather than failing on the `git log @{upstream}..HEAD` call.
- **`$TMPDIR` unset:** falls back to `/tmp`. On Windows hosts (out of scope; see Out of Scope), behaviour is undefined.
- **Repeated invocations within the same second:** ISO timestamp resolution is per-second; if the user invokes twice in the same second with the same slug, the second invocation overwrites the first. Acceptable — handoffs are ephemeral.

## Out of Scope

- Windows handoff path (`%TEMP%`) — not supported. Matches the kit's overall posture per `AGENTS.md`.
- Encrypted-at-rest handoffs — `$TMPDIR` is filesystem-protected by user ownership; further encryption is the user's responsibility.
- Auto-execution of `/clear` or any session-reset command — the user explicitly decides when to discard the current session.
- Loading the handoff on the receiving side — the receiving agent reads the file via its native `Read` tool; no special loader.
- Cross-agent state translation (Claude Code → Codex format conversion) — both agents read the same markdown shape.

## Open Questions

None at ship time. The skill is in production use at `v0.17.0-beta.1` and forward.

## Related

- ADRs: ADR-0007 (workflow-operational skills category, of which `ad-handoff` is a member); ADR-0008 (documentation discipline — handoff files are exempt from the no-dates rule for the same reason ADRs / tasks / specs are).
- Tasks: none — the skill shipped before the kit's task discipline applied to the kit's own development.
- Supersedes / Depends on: depends on the `ad-*` skill set being installed (the `Suggested skills` section assumes them).
- Adapted from: [mattpocock/skills/productivity/handoff](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md).
- Shipped in: commit `916a1f7`, release `v0.17.0-beta.1` (2026-05-23).
