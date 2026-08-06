# ADR-0050: The installer detects a shared write target and refuses to guess

**Status:** accepted
**Date:** 2026-08-06
**Deciders:** Alexandre Alvaro

## Context

The kit writes into a target project in two places that reach past the agent surface it owns. It copies skill files into `.claude/skills/` and `.claude/agents/` (or the Codex equivalents), and it appends or refreshes a managed `Skills installed by agentic` section in the project's root `AGENTS.md` or `CLAUDE.md`. Both writes are decided from filesystem signals alone — `detectMode` counts meaningful entries, `detectAgents` looks for `.claude/` and `.agents/`, `detectFeatures` sniffs a frontend. The installer runs no git command and reads no user-level install state; neither `src/lib/` nor `src/commands/` references a subprocess or the home directory.

That leaves two blind spots with one root cause: the installer cannot see whether the thing it is about to write is **shared with other people**, and cannot see whether the practitioner **already has the kit installed where it serves every repo** without touching any of them.

Both blind spots fired together in an employer repository. Running `init` there appended the managed section to a tracked, team-owned `AGENTS.md` and left more than thirty untracked kit files in the working tree. Nothing was committed, but the cleanup was manual, and that clone's `.git/info/exclude` now carries five kit entries under an explicit "never commit" comment — the exclusion work has been redone by hand across successive installs.

The failure reproduces in a fixture repository, and it is sharper than the incident suggested. `init --agent claude-code -y` against a tracked `AGENTS.md` wrote the managed section into it with **no prompt at all** — a non-interactive run hard-codes consent for the append — and left 33 untracked kit files with no exclusion. The interactive path does ask, but its prompt text speaks to content ("existing content preserved") rather than to sharing, and it pre-selects yes. On the second blind spot: the practitioner's machine carries the full `ad-*` skill set at `~/.claude/skills/` with its own user-level state file, so every skill file written into that repository duplicated one already in service.

Tracked-ness on its own is not the signal, which rules out the obvious rule. This kit's own `AGENTS.md` carries the managed section **committed** and does so deliberately, and a personal repository wants the same. A blanket refusal to write into a tracked file would refuse the kit's own dogfood install.

The kit has already ratified the correct shape for a sibling surface. [ADR-0043](0043-per-project-rules-layer.md) decided that project rules ask committed-versus-machine-local on creation and that machine-local mode writes the `.git/info/exclude` entry itself, never `.gitignore` — because `.gitignore` is committed and team-visible, so it cannot carry a machine-local intent. This ADR extends that posture from the surface a skill owns to the surfaces the installer owns.

## Decision

We will make the installer establish two facts before it writes, and refuse to guess when it cannot ask.

1. **Detect before writing.** At target resolution the installer determines whether the prospective write path is tracked by git, and whether a user-level kit install already exists. A git query that cannot be resolved (no repository, no git binary) yields "unknown" and falls back to current behavior; detection never blocks an install by failing.

2. **Name the risk in the prompt, and default to declining.** For a tracked root doc, the interactive confirmation states that the file is version-controlled and that the section will be visible to everyone who shares the repository, and its default answer is no rather than yes. When a user-level install is present, the install summary says so, so the operator sees the local copies are redundant while they can still decline them.

3. **Refuse to guess when it cannot ask.** A non-interactive run will not append or replace the managed section in a tracked root doc. It skips that write, states the reason on stderr, and completes the rest of the install. An explicit flag forces the write for callers that genuinely want it.

4. **Write its own exclusion, enumerated by filename.** When the installer places kit files in a repository where they would otherwise sit untracked and committable, it offers to add the `.git/info/exclude` entries itself — never `.gitignore`, per ADR-0043 — listing installed files by path. Directory-level entries are prohibited: agent directories carry mixed ownership. In the incident repository a team-authored subagent file is tracked in the same `.claude/agents/` directory where the kit installs its three bundled reviewers, so a directory-level entry would hide a team-owned file from git.

## Consequences

Positive:

- The two writes that reach beyond the agent surface — a shared document and a shared tree — stop happening unannounced.
- The non-interactive path, which is exactly where the failure was silent, becomes safe to point at a work repository.
- Recurring manual exclusion work moves into the tool that creates the need for it.
- A redundant local install becomes visible at the one moment the operator can still decline it.

Negative / trade-offs:

- The installer gains git awareness it has deliberately lacked. Contained to read-only queries, with an unresolved result treated as unknown rather than fatal.
- A force flag is new public CLI surface to maintain.
- Non-interactive behavior changes: an automated run that relies on the managed section landing in a tracked root doc must pass the flag. Loud by design — the silent write into a shared file is the thing being removed.
- `.git/info/exclude` is per-clone, the same limit ADR-0043 records for project rules: a fresh clone needs the entries again.
- Filename-level entries grow with the installed skill set and go stale when a skill leaves that set. `removeOrphanSkills` removes the files, not the exclusion lines.

## Alternatives Considered

- **Warn but keep every write unconditional** — rejected against the evidence. The incident produced no prompt at all, so there was no surface a warning could have reached, and a single advisory line inside a thirty-file install log is noise rather than a gate.
- **Never write into a tracked file the installer did not create** — rejected; refuted by this repository, whose own managed section is committed on purpose, as a personal project's would be.
- **Skip the local install entirely whenever a user-level install exists** — rejected. Local installs are legitimate (pinning a repository to a kit version, onboarding someone who has no user-level install); the decision surfaces the redundancy rather than overriding the operator.
- **`.gitignore` for the exclusion** — rejected, on ADR-0043's existing ground: a committed, team-visible file cannot express a machine-local intent.
- **Directory-level exclusion entries** — rejected; verified to hide a team-owned file in a mixed-ownership agent directory.
- **Infer sharing from the git remote or branch instead of tracked-ness** — rejected as guesswork. Whether the specific path is tracked is the fact that decides whether the write becomes teammate-visible.
