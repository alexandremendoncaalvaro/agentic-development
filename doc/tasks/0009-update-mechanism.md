# Task `0009`: Ship `agentic update` and the reviewer-handoff-on-disk

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

The kit installs skill source files into a user's repo at `init` time, but has no way to absorb upstream kit changes once those files are in place. Users on v0.2.0-beta.1 (the deciders' own `agentic-development` repo plus a second repo) need a coherent `update` command. Decision recorded in [ADR-0009](../adr/0009-update-mechanism.md): a Copier-style re-render with a per-agent state file (`.claude/agentic-state.json`, `.agents/agentic-state.json`), a three-way diff, default-skip on user edits, `--force` and `--dry-run` flags, and removal handling for orphan skills. Bundled with this work: the WORKFLOW §10 reviewer handoff is persisted to `.agentic/reviews/<ISO-timestamp>-<scope>.md` so the §10 contract has a real artifact rather than only an in-flight chat fragment.

## Acceptance Criteria

- [x] [`doc/adr/0009-update-mechanism.md`](../adr/0009-update-mechanism.md) exists, status `accepted`, with the Copier-fit rationale, the state-file schema, and the three-way diff matrix.
- [x] [`src/lib/state.js`](../../src/lib/state.js) exposes `loadState(cwd, agent)`, `saveState(cwd, agent, state)`, `STATE_FILE`, `STATE_DIRS`, and `SCHEMA_VERSION`. Refuses to load a state file with a higher schema version.
- [x] [`src/lib/install.js`](../../src/lib/install.js) supports state-aware installs: a `previousStates` map keyed by agent, optional `kitVersion`, optional `dryRun` and `force` flags. Returns `{ actions, nextStates }`. Legacy callers (no state) keep today's byte-compare behavior.
- [x] [`src/lib/install.js`](../../src/lib/install.js) (or a sibling module) exposes `removeOrphanSkills` that takes a previous state plus the current opted skill list and prompts before deleting orphan files (including bundled subagents under `.claude/agents/`). Default keep.
- [x] [`src/commands/update.js`](../../src/commands/update.js) is the `update` orchestrator: detects agents, loads previous states, resolves the new opted skill set with the same TUI as `init`, runs `removeOrphanSkills`, runs `installSkills`, writes the new state files, refreshes the managed-skills section in `AGENTS.md` / `CLAUDE.md`. Honors `--dry-run` and `--force`.
- [x] [`src/index.js`](../../src/index.js) wires the `update` command alongside `init`.
- [x] [`src/commands/init.js`](../../src/commands/init.js) writes the initial state file when `init` runs (so subsequent `update` runs have a baseline).
- [x] [`src/skills/claude-code/agentic-review/SKILL.md`](../../src/skills/claude-code/agentic-review/SKILL.md) writes the assembled handoff to `.agentic/reviews/<ISO-timestamp>-<scope>.md` before dispatching the fresh-context-reviewer subagent. Findings response references the handoff path.
- [x] [`src/skills/codex/agentic-review/SKILL.md`](../../src/skills/codex/agentic-review/SKILL.md) writes the same file and instructs the user to `cat` it into the clipboard before `/clear` and paste.
- [x] [`README.md`](../../README.md) gains an "Updating an existing project" section explaining `agentic update`, the state file, the three-way diff defaults, `--dry-run`, `--force`, and removal handling.
- [x] Tests cover: state load/save round-trip; schema-version refusal; first install writes state; second install (state-aware) detects user-edit-only and kit-change-only; both-changed prompts (default skip); `--force` overwrites; `--dry-run` writes nothing; orphan removal prompt-default-keep; legacy install (no state) falls through to byte-compare.
- [x] Kit version bumped to `0.3.0-beta.1` in [`package.json`](../../package.json).
- [x] `npm test` passes (existing 77 plus new state / update / handoff coverage).

## Plan

- [x] Branch `feat/0008-doc-discipline` continues to host the work; no separate branch — the update mechanism lands as additional commits on the same feature branch since the user has already approved the rollout end-to-end.
- [x] Write [`doc/adr/0009-update-mechanism.md`](../adr/0009-update-mechanism.md) in status `accepted`.
- [x] Write this task file.
- [x] Implement [`src/lib/state.js`](../../src/lib/state.js) — schema validation, load/save, deterministic key ordering for stable diffs.
- [x] Refactor [`src/lib/install.js`](../../src/lib/install.js) — three-way diff, state-aware, `--force` and `--dry-run` plumbing, returns `nextStates`.
- [x] Add `removeOrphanSkills` (in `src/lib/install.js`).
- [x] Implement [`src/commands/update.js`](../../src/commands/update.js) and wire in [`src/index.js`](../../src/index.js).
- [x] Update [`src/commands/init.js`](../../src/commands/init.js) to write state on first install.
- [x] Update [`src/skills/claude-code/agentic-review/SKILL.md`](../../src/skills/claude-code/agentic-review/SKILL.md) and [`src/skills/codex/agentic-review/SKILL.md`](../../src/skills/codex/agentic-review/SKILL.md) — handoff to disk.
- [x] Add "Updating an existing project" to [`README.md`](../../README.md).
- [x] Add tests under [`test/`](../../test/) covering the matrix in Acceptance Criteria.
- [x] Bump version in [`package.json`](../../package.json).
- [x] Run `npm test`. 100/100 green.
- [x] Commit on the same feature branch with Conventional Commits messages, one logical change per commit.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user:

- D1: separate `agentic update` command.
- D2: state file `.claude/agentic-state.json` and `.agents/agentic-state.json`, sibling to `skills/`, committed.
- D3: default-skip on conflict, `--force` and `--dry-run` flags.
- D4: orphan-skill removal prompts with default-keep.
- D5: per-version migration scripts deferred to v0.4.
- D6: slash-command wrapper deferred — no legacy users.
- D7: kit-level version, no per-skill version frontmatter.
- D8: handoff-to-disk bundled into this task.
- D9: `.agentic/reviews/` gitignored, ephemeral.

### 2026-05-09 — close-out

Implementation landed in six commits on `feat/0008-doc-discipline`:

- `b2b22bf` — ADR-0009 + this task file.
- `836b1d9` — `src/lib/state.js` plus the state-aware refactor of `src/lib/install.js` (three-way diff, force, dry-run, orphan removal).
- `017d68d` — `src/commands/update.js`, wiring in `src/index.js`, and `src/commands/init.js` writing state on first install.
- `b82bd75` — agentic-review handoff persisted to `.agentic/reviews/<ts>-<scope>.md` for both Claude Code and Codex.
- `c28b859` — tests covering state load/save, schema-version refusal, three-way diff matrix, orphan-skill removal, end-to-end `agentic update --yes` on fresh and legacy installs.
- `b05b557` — README "Updating an existing project" section + version bump to `0.3.0-beta.1`.

`npm test` 100/100 green at HEAD. `agentic init --agent both --yes` plus `agentic update --agent both --yes --dry-run` exercised against a temp dir as smoke verification — state files written, dry-run reports unchanged across the board.

Fresh-context review per WORKFLOW §10 deferred — task closes pending dispatch via `caveman:cavecrew-reviewer` or natively once `/agentic-review` is exercised against this branch.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
