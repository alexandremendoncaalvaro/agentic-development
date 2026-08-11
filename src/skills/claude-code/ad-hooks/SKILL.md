---
name: ad-hooks
description: Scaffold deterministic quality gates per WORKFLOW.md §11 — pre-commit (lint, format, secret-scan), pre-push (build, unit, integration). Detects the project's stack and recommends a hook runner (Husky / lefthook / pre-commit / native), scaffolds the runner config, and updates AGENTS.md Quality Gates. Also scaffolds Claude Code session-lifecycle hooks — currently a Stop hook that nudges /ad-handoff when context runs low (ADR-0055). Use when the user wants to wire hooks, configure pre-commit / pre-push, set up quality gates, prevent --no-verify bypass, wire a session-lifecycle / Stop hook, nudge ad-handoff before context is lost, or close the WORKFLOW §11 advisory-vs-deterministic gap. Opt-in skill; not auto-installed in the universal set.
summary: Scaffold deterministic quality gates per WORKFLOW §11 — pre-commit + pre-push, runner detected from stack signals — plus a Claude Code session-lifecycle tier (a Stop hook that nudges /ad-handoff when context runs low).
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

Steps 0–6 scaffold *git* hooks (they fire on commit / push). Claude Code also exposes *session-lifecycle* hooks in `.claude/settings.json` that fire on agent events. This tier scaffolds those; today it has one member. Claude Code only — Codex's compact hooks exist but context-injection parity is undocumented, so this tier is out of scope on Codex (do not invent Codex behavior).

### Handoff-nudge `Stop` hook (ADR-0055)

Nudges the user to run `/ad-handoff` before a long session's context is compacted or lost. Key facts (verified against the official hooks docs):

* It hangs off the **`Stop`** event (fires when Claude finishes a turn), **not `PreCompact`** — `PreCompact` can only allow or block compaction, it cannot inject a message.
* It emits **`{"systemMessage": …}` on exit 0 with no `decision` field**, so the session stops normally and the nudge **cannot loop**. It never uses `decision: "block"` or `hookSpecificOutput.additionalContext` (both continue the turn — loop-prone and disruptive).
* It is **size-gated** (silent below a transcript-size threshold, read from `transcript_path` via `statSync`) and fires **at most once per session** (a temp-dir flag keyed on `session_id`), plus a defensive `stop_hook_active` early-exit — so it never nags every turn.

Scaffold it in two parts:

1. **The script** ships with this skill at `scripts/handoff-nudge.mjs` (Node, zero-dependency). In a consuming project the installed copy is `${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/scripts/handoff-nudge.mjs`.
2. **The wiring** — merge (never clobber) a `Stop` block into `.claude/settings.json`:

   ```json
   {
     "hooks": {
       "Stop": [
         {
           "matcher": "*",
           "hooks": [
             { "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/scripts/handoff-nudge.mjs\"" }
           ]
         }
       ]
     }
   }
   ```

   Preserve any existing `.claude/settings.json` / `.claude/settings.local.json` content (e.g. a `permissions` block) — merge the `Stop` array in, do not overwrite the file.

Tunable via environment: `AD_HANDOFF_NUDGE_THRESHOLD_BYTES` (default `750000` — chosen from measured transcript sizes; lower it to nudge earlier) and `AD_HANDOFF_NUDGE_STATE_DIR` (flag-file directory; default the OS temp dir).

## Output contract

Filesystem changes:

- The runner's config file (e.g., `.husky/pre-commit`, `lefthook.yml`, `.pre-commit-config.yaml`).
- An updated `AGENTS.md` Quality Gates section (or appended if absent), naming the runner, the gates wired, the bootstrap command, and the no-bypass policy.
- For the native-hooks fallback only: a `setup-hooks.sh` script the user runs after every clone.

The skill does not execute the runner's install command. The skill does not write CI config. The git-hooks flow (Steps 0–6) does not configure agent-side session hooks — the separate Session-lifecycle hooks tier does that (`.claude/settings.json` `Stop`, currently the handoff-nudge hook — ADR-0055). Other agent events (`PreToolUse` / `PostToolUse`) remain future scope.

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
