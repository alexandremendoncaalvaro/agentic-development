---
name: ad-hooks
description: "Scaffold deterministic quality gates: pre-commit (lint, format, secret-scan) and pre-push (build, tests) with a hook runner fitted to the stack, plus session hooks: a Stop handoff nudge, a UserPromptSubmit workflow checkpoint, and a PostToolUse artifact-validator gate. Use to wire hooks, set up quality gates, or prevent --no-verify bypass."
summary: Scaffold deterministic quality gates per WORKFLOW §11 — pre-commit + pre-push, runner detected from stack signals — plus a session-lifecycle tier (a Stop handoff nudge, a UserPromptSubmit workflow checkpoint, and a dual-host PostToolUse artifact-validator gate).
allowed-tools: Read, Write, Glob, Bash
---

# /ad-hooks

Scaffolds the deterministic gates `WORKFLOW.md` §11 names. The skill writes config files for a hook runner and updates `AGENTS.md` Quality Gates; it does not execute install scripts. The user is responsible for the runner's one-time bootstrap (e.g., `npx husky init`, `lefthook install`, `pre-commit install`) — the skill says exactly which command to run.

## Step 0 — Confirm the gates the user wants

`WORKFLOW.md` §11 names two tiers:

* **Pre-commit (fast):** lint, format, secret-scan. Runs on every commit. Slow pre-commits push devs to `--no-verify`; keep it under ~5s.
* **Pre-push (thorough):** build, unit tests, integration tests. Runs on every push. Acceptable to be slow; the cost is paid less often than commit.
* **Pre-commit review gate (opt-in third tier — ADR-0047):** wire `/ad-review` — or `/ad-audit` for team-bound work — to run over the staged work before it commits, confirmed findings blocking the commit. The trade-off is real and belongs to the user: it front-loads the fixing (fits parallel, queue-several-agents workflows) but bottlenecks a frequent committer. Offer it; never scaffold it unasked, never as a default.

**Advisory-first debut for heuristic gates.** Deterministic toolchain gates (lint, format, build, test) may block from day one — their verdicts are reproducible. Heuristic or novel gates (secret-scan patterns, the review gate above) debut **warn-only**, with an explicit flip-to-block criterion stated at scaffold time (e.g. "two weeks without a false positive"). A gate that blocks before it has earned trust trains the user to bypass gates in general — the opposite of what it exists for.

Confirm both tiers are in scope for this project. If the user wants only one tier, scaffold only that tier — do not add gates the user did not ask for.

Visual / E2E for UI projects (Cypress, Playwright, Claude in Chrome) are mentioned by §11 but live in CI, not pre-push. Out of scope for this skill.

## Step 1 — Detect the runner

Run the deterministic detector from the consumer repository root:

```bash
node .claude/skills/ad-hooks/scripts/detect-hooks.mjs
```

If this skill was loaded from a different base directory, substitute that base; the bundled script is `scripts/detect-hooks.mjs`. Execute it; do not read it as prose. Its JSON reports `stacks`, `runners`, `prePush` (`files`, gate `commands`), `ci` (`files`, gate `commands`, `matrices`), raw textual `drift.ciOnlyCommands`, and `unreadable`. A non-empty `unreadable` means the scan is partial; name those paths instead of treating them as absent.

Use its facts in this order:

1. **Existing runner.** `.husky/` → Husky present. `lefthook.yml` or `.lefthook.yml` → lefthook present. `.pre-commit-config.yaml` → pre-commit present. `.git/hooks/` with non-sample scripts → native hooks present.
2. **Stack signals (if no runner present).** `package.json` → Node-rooted; recommend Husky (most common in Node ecosystem) or lefthook (cross-language fit). `pyproject.toml` → Python-rooted; recommend pre-commit. `go.mod` → Go-rooted; recommend lefthook. `Cargo.toml` → Rust-rooted; recommend lefthook. Multiple stacks → recommend lefthook (cross-language by default).
3. **No signals.** Recommend native `.git/hooks/` only as fallback. Warn the user that native hooks are not portable across clones (every contributor has to run a setup script).

If multiple runners are present, surface the conflict and ask the user before scaffolding. Never silently pick.

## Step 2 — Recommend the per-stack commands

For the chosen runner, propose the per-tier command set. The per-stack command catalog — Node, Python, Go, and Rust, with the lint / format-check / secret-scan / build / test command per tier — is in [references/hook-commands.md](references/hook-commands.md). For a **mixed / other** stack not in the catalog, ask the user for the per-tier command list. Do not invent.

Offer to swap any default. Confirm before writing.

## Step 3 — Scaffold the runner config

Write the runner-specific config file. The canonical config shapes per runner — Husky, lefthook, pre-commit, and native `.git/hooks/`, each with its file paths and one-time bootstrap command — are in [references/hook-commands.md](references/hook-commands.md); adapt them to the user's tier choices.

## Step 4 — Update `AGENTS.md` Quality Gates section

Append (or refresh, if a Quality Gates section already exists) the following content:

```
## Quality Gates

Deterministic enforcement — agent cannot skip.

- Pre-commit hook (fast): <stack-specific lint, format, secret-scan commands>
- Pre-push hook (thorough): <stack-specific build, unit, integration commands>
- Hook runner: <Husky | lefthook | pre-commit | native>; config at <path>
- Bootstrap: <one-line setup command>
- CI blocks on: <list — skip if CI not yet wired>
- Never bypass: no `--no-verify`, no skipped hooks, no deleted failing tests. WORKFLOW §11 is binding.
```

Honor the existing managed-skills / managed-quality-gates markers if `ad-bootstrap` already wrote a Quality Gates section. The skill refreshes the section in place; user content outside the markers is preserved.

## Step 5 — Mirror CI locally (drift check)

Local gates must mirror what CI runs — same commands, same matrix. WORKFLOW §11: "CI failure is a local gate gap." The detector already performed the deterministic scan; do not re-derive it in prose.

1. **CI surface and commands.** `ci.files` is the detected CI surface; when it is empty, note the gap and stop this step. `ci.commands` contains test / lint / typecheck / build-like `run:` / `script:` commands; `prePush.commands` contains the corresponding local gate commands.
2. **Matrix.** `ci.matrices` contains inline CI matrix dimensions. Compare them with the actual local runtime the pre-push hook uses; a script cannot infer a developer's installed version. For each meaningful missing dimension, warn: `CI matrix <dim>=<values>, pre-push runs <value>. Failures under <missing-value> will only surface in CI.`
3. **Command drift.** `drift.ciOnlyCommands` is an exact-text diff. For each command with no wrapper evidence, warn: `CI runs <cmd> — pre-push does not. Add to pre-push or CI will catch what local won't.` A wrapper may be semantically equivalent while spelling the command differently; inspect and state that evidence rather than claiming a gap from raw text alone.
4. **Offer to close the gap.** If gaps exist, propose specific edits to the runner config (extra commands, matrix loop via `Node --version` iteration, feature-flag pass). Ask the user before writing — matrix mirroring can be expensive; the user picks.

The mirror check runs after Step 4 wrote the config, so gap edits layer on top of a working scaffold. If the CI surface is absent, note: "No CI config detected — pre-push is the only gate. Add CI so contributors cannot bypass via `--no-verify` and re-run this skill to re-mirror."

## Step 6 — Tell the user what to run

After writing the config, output exactly the bootstrap command the user must run (e.g., `npm install` for Husky, `lefthook install` for lefthook, `pre-commit install` for pre-commit). The skill does not execute the bootstrap — that is the user's call.

If the user is wiring CI alongside hooks (GitHub Actions / GitLab CI / Circle), point them at the existing `.github/workflows/`, `.gitlab-ci.yml`, or `.circleci/` directory. CI scaffolding is a separate skill's responsibility (deferred — not this one).

## Session-lifecycle hooks (Claude Code only)

Steps 0–6 scaffold *git* hooks (they fire on commit / push). Claude Code also exposes *session-lifecycle* hooks in `.claude/settings.json` that fire on agent events. This tier scaffolds those; it has three members. The first two are wired on Claude Code only (their Codex extension is a follow-up under ADR-0083); the third, the artifact-validator gate, is wired on both hosts because Codex documents the same `PostToolUse` contract (GROUND-0027).

### Handoff-nudge `Stop` hook (ADR-0055)

Nudges the user to run `/ad-handoff` before a long session's context is compacted or lost. Key facts (verified against the official hooks docs):

* It hangs off the **`Stop`** event (fires when Claude finishes a turn), **not `PreCompact`** — `PreCompact` can only allow or block compaction, it cannot inject a message.
* It emits **`{"systemMessage": …}` on exit 0 with no `decision` field**, so the session stops normally and the nudge **cannot loop**. It never uses `decision: "block"` or `hookSpecificOutput.additionalContext` (both continue the turn — loop-prone and disruptive).
* It is **size-gated** (silent below a transcript-size threshold, read from `transcript_path` via `statSync`) and fires **at most once per session** (a temp-dir flag keyed on `session_id`), plus a defensive `stop_hook_active` early-exit — so it never nags every turn.

Scaffold it in two parts:

1. **The script** ships with this skill at `scripts/handoff-nudge.mjs` (Node, zero-dependency).
2. **The wiring** — merge (never clobber) a `Stop` block into `.claude/settings.json` (see *Resolving the script path* below for `<ad-hooks-dir>`):

   ```json
   {
     "hooks": {
       "Stop": [
         {
           "matcher": "*",
           "hooks": [
             { "type": "command", "command": "node \"<ad-hooks-dir>/scripts/handoff-nudge.mjs\"" }
           ]
         }
       ]
     }
   }
   ```

   Preserve any existing `.claude/settings.json` / `.claude/settings.local.json` content (e.g. a `permissions` block) — merge the `Stop` array in, do not overwrite the file.

Tunable via environment: `AD_HANDOFF_NUDGE_THRESHOLD_BYTES` (default `750000` — chosen from measured transcript sizes; lower it to nudge earlier) and `AD_HANDOFF_NUDGE_STATE_DIR` (flag-file directory; default the OS temp dir).

### Workflow-checkpoint `UserPromptSubmit` hook (ADR-0074)

Puts the kit's pipeline in front of the model on every prompt. Skills and `AGENTS.md` are advisory; this hook is the deterministic delivery that replaces the owner repeating "follow the workflow" by hand. Key facts (verified against the official hooks docs):

* It hangs off **`UserPromptSubmit`**, one of the events whose plain-text stdout on exit 0 is added as context the model can act on. The event has no matcher and fires on every prompt.
* The checkpoint is **static** (about 700 characters, imperative): skip when trivial; open with a three-line summary and a checklist roadmap without reciting the rules; `/ad-derisk` or `/ad-grill-me` for unknowns; `/ad-ground` before code; `/ad-tdd` (or `/ad-tdg`); `/ad-review` after each slice and `/ad-audit` after each large block; `/ad-commit` to land; `/ad-handoff` at the end for a chip or a fresh-session prompt.
* It **always exits 0** and never emits a JSON decision, so it cannot block or erase a prompt. Empty or malformed stdin is silent. `AD_WORKFLOW_CHECKPOINT=0` silences it.

Scaffold it in two parts:

1. **The script** ships with this skill at `scripts/workflow-checkpoint.mjs` (Node, zero-dependency, byte-identical across hosts).
2. **The wiring** — merge a `UserPromptSubmit` block into `.claude/settings.json`, beside any existing `Stop` block:

   ```json
   {
     "hooks": {
       "UserPromptSubmit": [
         {
           "hooks": [
             { "type": "command", "command": "node \"<ad-hooks-dir>/scripts/workflow-checkpoint.mjs\"" }
           ]
         }
       ]
     }
   }
   ```

### Artifact-validator `PostToolUse` gate (ADR-0083, Spec 0008)

Runs the kit's own artifact validator after a skill writes a governed record, and shows a failure to the model inside the same turn. Skills tell the agent to run `validate-record.mjs` or `validate-plan.mjs` as a step; this gate is the deterministic delivery of that step. Key facts (verified against both hosts' hooks references, GROUND-0027):

* It hangs off **`PostToolUse`** matched on **`Edit|Write`**. On Claude Code that is an exact match on the two file tools; on Codex the same string is a documented alias for `apply_patch`. `PostToolUse` cannot block on either host: a failure is shown by **exit 2 with the message on stderr** ("shows stderr to the model; the tool already ran"), a pass is a silent exit 0.
* It **routes by the file's first heading** under `doc/research/`: `GROUND-NNNN` to `ad-ground/scripts/validate-record.mjs`, `PRISM-NNNN` to `ad-prism/scripts/validate-plan.mjs`. A `RESEARCH-` study, any other path, an event without a path, and malformed stdin are silent. On Codex the written paths are recovered from the patch's `*** Add File:` / `*** Update File:` / `*** Move to:` headers.
* It distinguishes **four terminal states**: `validator-failed` and `runtime-unavailable` (the validator could not run) reach the model with a reproduction command; `validator-passed` and unowned events do not. A gate that cannot run never reports a pass.
* Every governed firing appends one JSON line to `<tmpdir>/agentic-artifact-gate/<session_id>.jsonl`, **outside the working tree**; `AD_ARTIFACT_GATE_EVIDENCE_DIR` redirects it. `AD_ARTIFACT_GATE=0` silences the gate. `AD_ARTIFACT_GATE_SKILLS_ROOT` points at the skills root when `ad-ground` and `ad-prism` are not installed beside `ad-hooks`.
* It is **feedback, not enforcement** (ADR-0083): no decision object, no `PreToolUse` deny, no `Stop` continuation.

Scaffold it in two parts:

1. **The script** ships with this skill at `scripts/artifact-gate.mjs` (Node, zero-dependency, byte-identical across hosts).
2. **The wiring**, merged beside the existing blocks. Claude Code, in `.claude/settings.json`:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Edit|Write",
           "hooks": [
             { "type": "command", "command": "node \"<ad-hooks-dir>/scripts/artifact-gate.mjs\"" }
           ]
         }
       ]
     }
   }
   ```

   Codex, in `<repo>/.codex/hooks.json` (or an inline `[hooks]` table in `.codex/config.toml`); the hook runs only after the operator reviews and trusts it through `/hooks`, and only when the project `.codex/` layer is trusted:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Edit|Write",
           "hooks": [
             { "type": "command", "command": "node \"<ad-hooks-dir>/scripts/artifact-gate.mjs\"", "timeout": 30 }
           ]
         }
       ]
     }
   }
   ```

Claude Code Desktop shares this wiring with the CLI but inherits only `PATH` and a fixed set of variables from the shell profile, so set `AD_ARTIFACT_GATE*` variables where Desktop sessions can see them, not only in `.zshrc`.

### Resolving the script path

Both hooks run from `.claude/settings.json`, which is read at session start; the command needs a path that exists wherever the kit was installed. Do not hard-code `${CLAUDE_PROJECT_DIR}/.claude/skills/...`: the installer defaults to the user scope (`~/.claude/skills/ad-hooks`), where that path does not exist. Resolve `<ad-hooks-dir>` from the base directory stated at the top of this skill load and write it as an absolute path (or `${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks` only when the skill actually loaded from the project install). Scaffold a session-lifecycle hook only when the user asked for that hook: show the exact merged JSON and the target file, and write only after the user approves. Hook edits take effect in the next session.

## Output contract

Filesystem changes:

- The runner's config file (e.g., `.husky/pre-commit`, `lefthook.yml`, `.pre-commit-config.yaml`).
- An updated `AGENTS.md` Quality Gates section (or appended if absent), naming the runner, the gates wired, the bootstrap command, and the no-bypass policy.
- For the native-hooks fallback only: a `setup-hooks.sh` script the user runs after every clone.

The skill does not execute the runner's install command. The skill does not write CI config. The git-hooks flow (Steps 0–6) does not configure agent-side session hooks — the separate Session-lifecycle hooks tier does that (`.claude/settings.json` `Stop` handoff nudge — ADR-0055 — `UserPromptSubmit` workflow checkpoint — ADR-0074 — and the `PostToolUse` artifact-validator gate on both hosts — ADR-0083). A `PreToolUse` guard and any `Stop`-based repair loop remain future scope behind their own decisions (ADR-0083).

A narrative document, so the documentation discipline rules apply at write time:

- No emoji anywhere in the scaffolded config or in the AGENTS.md update.
- No version stamps or DRAFT markers.
- The Quality Gates section opens with the operational rule (gates are deterministic) before listing the gates themselves.
- One scope: Quality Gates. Do not duplicate ARCHITECTURE.md or ADR rationale here.
- No commented-out scripts. No orphan TODO / FIXME — every deferred command references a tracked task or GitHub Issue.

## Next

- Run the runner's bootstrap command (cited in Step 6 — e.g., `npm install`, `lefthook install`, `pre-commit install`).
- Verify a deliberately-failing edit (e.g., a known lint violation) gets blocked at commit. The gate is real only when it actually fires.
- Add a redundant CI gate (`.github/workflows/`, GitLab CI, or equivalent) so contributors cannot bypass via `--no-verify`. WORKFLOW §11 binding.
- `/ad-drift` periodically to confirm hooks stay wired as the project evolves.
