# GROUND-0027: `PostToolUse` artifact-validator gate on both hosts

**Status:** recorded
**Decision:** Ship `scripts/artifact-gate.mjs` in the `ad-hooks` session-lifecycle tier as a `PostToolUse` command hook matched on `Edit|Write` on both hosts; recover the written path from `tool_input.file_path` on Claude Code and from the `*** Add File:` / `*** Update File:` headers of `tool_input.command` on Codex; route a `doc/research/` file by its first heading (`GROUND-` to `validate-record.mjs`, `PRISM-` to `validate-plan.mjs`, anything else unowned); on a validator failure exit 2 with the validator's message and a reproduction command on stderr; on a pass exit 0 silently; append one JSON evidence line per governed firing under the OS temporary directory keyed by `session_id`.
**Decision ref:** doc/tasks/0083-ship-the-artifact-validator-feedback-gate.md (implements doc/specs/0008-surface-validator-failures-during-the-turn.md under doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md)
**Confidence:** Conditional

## Decision and confidence

The happy path is the one both hosts document and one public implementation already uses: a command hook on `PostToolUse` matched on the write tools, reading the event JSON from stdin, recovering the written path, running a checker, and exiting 2 with the message on stderr so the model sees it after the tool already ran. Claude Code's exit-2 table row for `PostToolUse` reads "Shows stderr to Claude; the tool already ran" (A1); Codex's `PostToolUse` section reads "You can also use exit code 2 and write the feedback reason to stderr" (A2). The matcher string `Edit|Write` is valid on both hosts: Claude Code matches its `Edit` and `Write` tools exactly, and Codex documents that "for file edits through `apply_patch`, matcher values can use `apply_patch`, `Edit`, or `Write`" (A2). The kit's own `handoff-nudge.mjs` and `workflow-checkpoint.mjs` fix the script shape (C1): Node, zero dependencies, `readFileSync(0)`, silent exit 0 on malformed input, env kill switch, OS temporary directory for per-session state, byte-identical in both host trees, contract-tested by spawning the script.

Axis-2 verdict: Conditional, with two named mitigations. First, the exit-2 delivery on `PostToolUse` is documented on both hosts but has never been exercised by the kit; the task's live step on Claude Code raises E1 to Measurement, and the Codex half stays documented-only until the operator's Codex CLI can run (D2). Second, the Codex path recovery parses a patch payload whose grammar is read from a secondary source because the primary file could not be fetched (B2); the parser is limited to the two header lines the grammar makes unambiguous and is covered by offline tests. Both mitigations are reversible: one settings block, one script.

## Evidence

### E1 — On `PostToolUse`, exit 2 shows stderr to the model on both hosts and cannot block the tool, which already ran

**Strength:** Medium
**Provenance:** A1, A2, B1

A1, exit-code-2 table: "`PostToolUse` | No | Shows stderr to Claude; the tool already ran", and the JSON-output section: "To surface a warning to Claude from a `PostToolUse` or `PostToolUseFailure` hook, exit 2 instead so Claude sees the stderr even though the tool already ran." A1 also documents `decision: "block"` with `reason` as an alternative that "adds the `reason` next to the tool result"; exit 2 with stderr is chosen because it is the one path both hosts share verbatim. A2: "For this event, `decision: "block"` doesn't undo the completed Bash command. Instead, Codex records the feedback, replaces the tool result with that feedback, and continues the model from the hook-provided message. You can also use exit code 2 and write the feedback reason to stderr." B1 is a public hook built on exactly this contract. Medium rather than High because the kit has not exercised the event; the task's live step is what raises it.

### E2 — Claude Code delivers the written path as an absolute `tool_input.file_path` for `Write` and `Edit`

**Strength:** High
**Provenance:** A1, B1, C3

A1, `PostToolUse` input: "File-tool `tool_input` paths arrive in the same format as for PreToolUse: always absolute, with the platform's native separators, so backslashes on Windows", with the worked example `"tool_name": "Write", "tool_input": {"file_path": "/path/to/file.txt", "content": "file content"}`. A1 also notes the event does not fire when a `Bash` command rewrites a file, which bounds the gate to the two file tools. B1 reads the same field with `jq -r '.tool_input.file_path // empty'`. C3: the kit's own eval adapter already treats `Write` and `Edit` as the write-tool set for Claude Code streams.

### E3 — Codex reports file edits as `tool_name: "apply_patch"` with the patch text in `tool_input.command`, matchable as `Edit|Write`

**Strength:** Medium
**Provenance:** A2, B2

A2, `PostToolUse` fields: "`tool_input` | JSON value | Tool-specific input. `Bash` and `apply_patch` use `tool_input.command`", and "For file edits through `apply_patch`, matcher values can use `apply_patch`, `Edit`, or `Write`; hook input still reports `tool_name: "apply_patch"`." B2 gives the patch grammar: `AddFile := "*** Add File: " path NEWLINE`, `UpdateFile := "*** Update File: " path NEWLINE [ MoveTo ] { Hunk }`, `MoveTo := "*** Move to: " newPath NEWLINE`, with the rule that paths are relative, never absolute. Path recovery therefore collects every `*** Add File:` and `*** Update File:` path, follows a `*** Move to:` when present, and resolves each against the event's `cwd`. Medium because the grammar was read from a secondary source and no Codex event has been captured by the kit.

### E4 — A `doc/research/` artifact's owning validator is identified by its first heading, and a `RESEARCH-` study has no validator

**Strength:** High
**Provenance:** C2, C4

C2: `validate-record.mjs` accepts only `doc/research/NNNN-ground-<slug>.md` paths (`RECORD_PATH`) and returns `valid: false` with "record must be a doc/research/NNNN-ground-<slug>.md path" for `0026-runtime-layer-deterministic-host-hooks.md`; `validate-plan.mjs` returns `valid: true` for `PRISM-0022` and `valid: false` for the study. C4: the directory holds twenty `GROUND-`, one `PRISM-`, and four `RESEARCH-` titles, and the `ad-prism` skill states a plan under `doc/research/` keeps its numbered `PRISM-NNNN` title. The heading is the deterministic discriminator; a `GROUND-` heading on a file whose name lacks `-ground-` is a real validator failure the gate surfaces, and a `RESEARCH-` study is unowned and silent. The `ad-report` validator has no path or heading convention under `doc/research/` and is left out of the owner map.

### E5 — Matchers, timeouts, and configuration locations on both hosts

**Strength:** High
**Provenance:** A1, A2, A3

A1 matcher table: a value with only letters, digits, `_`, `-`, spaces, `,`, and `|` is "Exact string, or list of exact strings separated by `|`", so `Edit|Write` matches either tool exactly; default `timeout` is 600 seconds for `command` hooks on `PostToolUse`. A2: Codex matchers are regular expressions applied to `tool_name` and matcher aliases, with `Edit|Write` listed among the examples; project hooks live in `<repo>/.codex/hooks.json` or inline `[hooks]` tables in `.codex/config.toml`; "Hooks are enabled by default"; "Before a non-managed hook can run, Codex requires you to review and trust the exact hook definition", through `/hooks` in the CLI. A3: Claude Code Desktop shares hooks and settings with the CLI, but reads the shell profile only for `PATH` and a fixed set of variables, so an `AD_*` kill switch set in the profile may not reach a Desktop session; the gate documents that.

### E6 — Script shape, per-session state, tests, and byte-parity follow the two shipped hook scripts

**Strength:** High
**Provenance:** C1, D1

C1: `handoff-nudge.mjs` reads stdin with `readFileSync(0, 'utf8')`, exits 0 silently on empty, malformed, or non-object input, honors an env kill switch, keys per-session state on a sanitized `session_id` under `tmpdir()` with an env override, and ships byte-identical in both host trees; `test/skill-scripts.test.js` spawns both hook scripts with mock stdin per shape. D1: the two prior tier members each landed as script, tier documentation, tests, and dogfood wiring in one task, which is the shape Task 0083 repeats.

### E7 — Hook firings are visible in a captured Claude Code stream, so the gate's evidence is joinable with the live lane

**Strength:** High
**Provenance:** D2

D2: the first authorized live pilot's `unmapped` population included one `system.hook_started` and one `system.hook_response` record from the kit's own `UserPromptSubmit` checkpoint. The same lane can therefore observe the gate; the evidence line carries `session_id` and a sequence number so a later grader can join the two.

## Source register

- **A1:** Claude Code, Hooks reference, sections "PostToolUse input", "PostToolUse decision control", "Exit code 2 behavior per event", "Matcher patterns", "Common fields", https://code.claude.com/docs/en/hooks (accessed 2026-09-21 via `curl -sL https://code.claude.com/docs/en/hooks.md` and grep of the downloaded markdown)
- **A2:** Codex, Hooks guide, sections "PostToolUse", "Matchers", "Tool coverage", "Review and trust hooks", "Hooks are enabled by default", https://developers.openai.com/codex/hooks redirecting to https://learn.chatgpt.com/docs/hooks (accessed 2026-09-21 via `curl -sL` of the page and text extraction)
- **A3:** Claude Code, Desktop, "Shared configuration" and "Local sessions environment", https://code.claude.com/docs/en/desktop (accessed 2026-09-21 via official web documentation)
- **B1:** Paul Schick, "Claude Code Hooks: PreToolUse & PostToolUse Tutorial", 2026-02-28, `lint-on-change.sh` reading `.tool_input.file_path`, running a linter, and exiting 2 with output on stderr, wired under `"PostToolUse"` with `"matcher": "Edit|Write"`, https://paul-schick.com/posts/claude-code-hooks-pretooluse-posttooluse/ (accessed 2026-09-21 via official web documentation)
- **B2:** Daniel Vaughan, "The V4A Diff Format: How Codex CLI's apply_patch Actually Edits Your Code", 2026-03-31 updated 2026-09-21, the patch grammar and the relative-path rule, https://codex.danielvaughan.com/2026/03/31/codex-cli-apply-patch-v4a-diff-format/ (accessed 2026-09-21 via web fetch after the primary file at openai/codex `codex-rs/apply-patch/apply_patch_tool_instructions.md` returned 404 through both raw and blob URLs)
- **C1:** `src/skills/claude-code/ad-hooks/scripts/handoff-nudge.mjs:99-160` (stdin read, silent exits, `stop_hook_active` guard, `tmpdir()` state keyed on `session_id`, env override) and `workflow-checkpoint.mjs`; `test/skill-scripts.test.js:221-300` spawning both with mock stdin (accessed 2026-09-21 via repository read)
- **C2:** `src/skills/claude-code/ad-ground/scripts/validate-record.mjs:20` (`RECORD_PATH`) and its output on `doc/research/0026-runtime-layer-deterministic-host-hooks.md` (`valid: false`, path error) and on `0025-ground-host-stream-adapters.md` (`valid: true`); `src/skills/claude-code/ad-prism/scripts/validate-plan.mjs` on `0022-skill-trajectory-evaluation-contract.md` (`valid: true`) and on the study (`valid: false`) (accessed 2026-09-21 via `node <script> <path>` from the repository root)
- **C3:** `eval/lib/adapters/claude-code.mjs:18` write-tool set and `eval/lib/adapters/codex.mjs` `file_change` item handling (accessed 2026-09-21 via repository read)
- **C4:** `grep -n "^# " doc/research/*.md` yielding twenty `GROUND-`, one `PRISM-`, four `RESEARCH-` titles; `src/skills/claude-code/ad-prism/SKILL.md:32-35` on the `PRISM-NNNN` title under `doc/research/` (accessed 2026-09-21 via repository read)
- **D1:** `git log --branches --remotes --oneline -- src/skills/claude-code/ad-hooks/scripts/` and `git log --branches --remotes --oneline -S"PostToolUse"`: the two tier members landed with ADR-0055 and ADR-0074 as script plus documentation plus tests; no prior `PostToolUse` attempt found in any branch (accessed 2026-09-21 via git in the `lagos` worktree; the `--all` form is polluted by workspace checkpoint refs and was not used)
- **D2:** `git show 6f15b62 -- doc/research/0025-ground-host-stream-adapters.md` on branch `feat/live-evaluation-lane`: the 2026-09-21 pilot addendum listing `system.hook_started` and `system.hook_response` among unmapped records, and the Codex leg blocked by `codex-cli 0.139.0` refusing the account's models (accessed 2026-09-21 via git in the `lagos` worktree)

## Limitations and reversal

The record establishes the documented contracts and the in-repo shape, not observed host behavior: no `PostToolUse` event has been captured by the kit on either host, the Codex patch grammar comes from a secondary source, and Codex cannot run in the operator's environment today. Reversal evidence: a live Claude Code trial in which exit-2 stderr from the gate does not appear in the model's context reverses E1 and moves the gate to `decision: "block"` with `reason`; a captured Codex `apply_patch` event whose `tool_input.command` does not carry the header lines B2 describes reverses E3 and requires a different path recovery; a host release that removes exit-2 feedback on `PostToolUse` reverses the decision.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0027-ground-artifact-validator-gate.md`, then reopen every source in the register. Structural validity proves the map, not the source content.

## Addendum 2026-09-21: the live observation on Claude Code

After the gate was wired in this repository's `.claude/settings.json`, the session that built it wrote a deliberately incomplete `GROUND-0099` record under `doc/research/` with the `Write` tool. The host fired the `PostToolUse` hook without a restart and returned the gate's stderr to the model as a "PostToolUse:Write hook blocking error" carrying the eight validator messages and the reproduction command; the gate's evidence file at `<tmpdir>/agentic-artifact-gate/338e5ec2-cd42-440d-9eaa-dfbd159ee04e.jsonl` holds the matching line (`seq` 1, `state` `validator-failed`, `host_tool` `Write`), SHA-256 prefix `f105cd09a712a9f2`. The probe file was deleted in the same turn. E1 therefore holds at Measurement strength for Claude Code (host `claude-code` as run by the Conductor workspace on 2026-09-21); it stays Medium for Codex, and the record's Confidence stays Conditional until a Codex event is observed. The evidence file is machine-local by design and is not tracked; the line is quoted verbatim in Task 0083's Notes ("Built, wired, observed live"), which is the durable record a reader without this machine verifies against, and the host-surfaced text was observed by the session itself.

The Codex wiring idiom is also documented, which a fresh-context review asked to be shown rather than assumed: the Codex hooks guide (A2) writes its own command-hook examples as `"/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py\""` and states "Commands run with the session cwd as their working directory. For repo-local hooks, prefer resolving from the git root instead of using a relative path". This repository's `.codex/hooks.json` follows that idiom. Codex exposes no project-root variable comparable to Claude Code's `${CLAUDE_PROJECT_DIR}`, so the `ad-hooks` scaffold resolves an absolute path at scaffold time for an installed skill and uses the git-root idiom only for a repository-local script.

Later on the same day `feat/live-evaluation-lane` merged into `main` as pull request 145, so D2's "unmerged" qualifier describes the branch as read for this record; the live lane and its addendum are now on the default branch.
