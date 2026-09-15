# GROUND-0018: Keep reviewer verification outside repository trees

**Status:** recorded
**Decision:** Preserve the reviewer's existing read-only role and Bash capability, but require any verification artifact to live under the operating-system temporary directory, require cleanup, forbid tracked-file edits, and verify that repository status is unchanged.
**Decision ref:** doc/tasks/0075-keep-review-artifacts-outside-repos.md
**Confidence:** Strong

## Decision and confidence

The happy path is a narrow behavioral contract in both host reviewer briefs,
backed by one public-contract regression test and the existing source/install
parity gates. Claude Code starts a custom subagent in the main conversation's
working directory unless worktree isolation is selected, and this reviewer
intentionally retains Bash under ADR-0007. Therefore a prose-only "read-only"
label is insufficiently specific about probes that create files. The reviewer
will keep necessary scratch artifacts under the operating-system temporary
directory, remove them after use, avoid tracked-file changes, and leave
`git status --porcelain` unchanged. Codex already adds a read-only sandbox, but
the matching postcondition remains useful as defense in depth and host parity.
Public reviewer implementations independently use OS temporary files and
read-only sandboxes or explicitly prohibit write-capable shell operations. The
decision is Strong for this small, reversible prompt-contract correction.

## Evidence

### E1 — Tool restrictions and working-directory isolation are distinct controls

**Strength:** High
**Provenance:** A1, C1, D1

Anthropic documents that custom subagents start in the main conversation's
working directory and that their configured tools and permissions determine
their capabilities. It offers worktree isolation as a separate control. The
current Claude reviewer retains Bash by binding ADR design, so a specific
repository-cleanliness postcondition closes a real gap without silently
removing an established review capability.

### E2 — Review artifacts belong in OS temporary storage or nowhere

**Strength:** Medium
**Provenance:** B1, B2, C2, D1

One public Codex review skill creates its handoff and output with `mktemp`, runs
the reviewer in a read-only sandbox, and explicitly forbids file modification.
A public Claude Explore prompt takes the stricter variant and forbids all
write-capable shell operations, including temporary files. Both patterns agree
on the invariant that a read-only reviewer must not leave artifacts in the
target repository. The old PR records the concrete failure this invariant
prevents in this kit.

### E3 — One cross-host contract test is the smallest durable regression gate

**Strength:** High
**Provenance:** C1, C2, D1

The repository already tests bundled reviewer prompts as public contracts and
separately proves canonical-to-installed parity and package inclusion. One
behavior-shaped assertion over both fresh-context reviewer definitions catches
loss of the cleanliness invariant without testing exact prose. Reusing the
existing dogfood and packaging gates avoids duplicating installer tests.

## Source register

- **A1:** Anthropic, [Create custom subagents](https://code.claude.com/docs/en/sub-agents) — custom subagents have explicit tool access and permissions, start in the parent working directory, and may opt into worktree isolation (accessed 2026-09-15 via official web documentation).
- **B1:** Olshansk/agent-skills, [`skills/cmd-codex-review-unstaged/SKILL.md`](https://github.com/Olshansk/agent-skills/blob/main/skills/cmd-codex-review-unstaged/SKILL.md) — a public review workflow using `mktemp`, a read-only Codex sandbox, and an explicit no-modification instruction (accessed 2026-09-15 via GitHub source view).
- **B2:** Piebald-AI/claude-code-system-prompts, [`system-prompts/agent-prompt-explore.md`](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/agent-prompt-explore.md) — a public read-only agent prompt that enumerates forbidden write-capable shell operations (accessed 2026-09-15 via GitHub source view).
- **C1:** `src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md:1` and `src/skills/codex/ad-review/agents/fresh-context-reviewer.toml:1` at base tree `ab8652222331d098e706253e18cdc1ed28c6b734` — the pre-change host contracts retain Bash on Claude and a read-only sandbox on Codex, but do not state the temporary-artifact or unchanged-status postcondition (accessed 2026-09-15 via repository read).
- **C2:** `test/skills.test.js:1282` at base tree `ab8652222331d098e706253e18cdc1ed28c6b734` — the pre-change tests parse bundled subagents and enforce cross-host reviewer behavior, while installer and package tests already cover materialization (accessed 2026-09-15 via repository read).
- **D1:** commit `4594ec5`, the head of PR #126 — prior implementation of the same cleanliness invariant; it remains outside `main` because the PR is conflicting and its publication metadata violates current repository rules (accessed 2026-09-15 via `gh pr diff 126`, `gh pr view 126`, and `git log --all`).

## Limitations and reversal

Prompt text reduces accidental writes but is not a filesystem sandbox. Codex's
read-only sandbox is stronger; Claude Code worktree isolation would be stronger
than the selected postcondition but would change the reviewer's execution model
and is not required to retire this observed scratch-file failure. Reconsider
isolation in a separate decision if reviewers continue dirtying repositories
after this contract and regression gate ship.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0018-ground-reviewer-repository-cleanliness.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
