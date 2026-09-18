# GROUND-0025: Normalize the two host streams into the common receipt through fake runner adapters

**Status:** recorded
**Decision:** Add one adapter module per host under `eval/lib/adapters/`, each exposing `normalize({ lines, request, requestKind, policy })` over the host's JSON Lines output (`claude -p --output-format stream-json --verbose` and `codex exec --json`) and returning `{ events, outcome, native }` in the receipt's trial shape; map host records onto the ADR-0080 item 7 vocabulary by fixed rules, derive an explicit invocation's `skill_invoked` from the request because both hosts expand the slash or dollar mention before the model runs, flatten subagent records into the trial, keep every native record beside its normalized event, and prove both adapters on documented-shape sample streams under `node:test` before any live pilot.
**Decision ref:** doc/tasks/0048-build-skill-evaluation-harness.md; doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md
**Confidence:** Conditional

## Decision and confidence

Both hosts emit one JSON object per line, and the record types the harness
needs are fixed by primary sources: Claude Code's `stream-json` carries
`assistant` messages whose content holds `tool_use` blocks with `id`, `name`,
and `input`, `user` messages whose content holds `tool_result` blocks keyed by
`tool_use_id`, `system` messages with `subtype: "permission_denied"`, and a
final `result` message; Codex's `--json` carries `item.completed` records
whose `item.type` is `command_execution`, `file_change`, `agent_message`, and
others, plus `turn.completed`, `turn.failed`, and `error`. The adapter maps:

- `skill_invoked` from a Claude Code `tool_use` named `Skill` (`input.skill`);
  for a request marked `explicit`, from the request itself on both hosts,
  because both hosts expand `/name` or `$name` before the model runs and the
  stream cannot carry what the model never chose.
- `file_write` from Claude Code `tool_use` named `Write`, `Edit`,
  `MultiEdit`, or `NotebookEdit` (`input.file_path` or `input.notebook_path`);
  from every `changes[].path` of a completed Codex `file_change`.
- `command` from Claude Code `tool_use` named `Bash` (`input.command`); from a
  completed Codex `command_execution` whose `status` is not `declined`
  (`item.command`).
- `approval_denied` from a Claude Code `permission_denied` system message,
  with the action recovered by joining `tool_use_id` back to the denied
  `tool_use` block, because the measured message carries no `tool_input`; from
  a Codex `command_execution` whose `status` is `declined`.
- `approval_granted` from the run policy the adapter is given, one event per
  granted action in policy order, before any command, because neither host
  emits a grant record in a non-interactive run: on Claude Code a grant is an
  `--allowedTools` rule or a permission mode, on Codex it is `approval_policy`
  or `--approve-for-me`.
- `final` from the Claude Code `result` message (`success` when
  `subtype === "success"` and `is_error` is false, otherwise `failure`); from
  Codex `turn.completed` (`success`) or `turn.failed` and top-level `error`
  (`failure`). The outcome's `final_response` is the `result` text or the
  last completed `agent_message`.
- Subagent flattening: Claude Code records with a non-null
  `parent_tool_use_id` are normalized like main-conversation records and the
  parent id stays in `native`; the spawning `Agent` `tool_use` produces no
  event of its own.

The confidence is Conditional, with two named mitigations that the first
authorized live pilot measures. First, implicit Codex skill activation has no
record type in the `--json` stream; the documentation says Codex reads the
full `SKILL.md` when it selects a skill, so the adapter recognizes a
`command_execution` that reads a `SKILL.md` under a skills root as
`skill_invoked`, and the pilot confirms or reverses that reading. Second, the
grant-from-policy rule makes the harness the approver: a live case whose stop
must hold is driven with the action absent from the policy, and one whose stop
is expected to be granted lists the action once per permitted command; the
pilot measures whether the hosts' `declined` and `permission_denied` records
appear where the rule expects them. Everything else maps from primary sources
and a measurement on the installed binary and is High.

The sample streams that prove the adapters are authored from the documented
record shapes, not captured from live runs, because no live run is authorized
in this block. That is a deliberate deviation from the word "captured" in
ADR-0080 item 5: the seam is proved against the schema the hosts publish, the
samples carry `origin: synthetic`, and the pilot replaces them with captured
streams that become the first live receipts.

## Evidence

### E1 — Claude Code stream-json exposes tool calls, results, denials, and the result as typed lines

**Strength:** High
**Provenance:** A1, A2, A7

The headless documentation names the three output formats, requires
`--verbose` with `stream-json`, states that the last line is a `result`
message with the final text, cost, and session metadata, and states that
denials appear as `permission_denied` system messages and are listed in the
result's `permission_denials`. The TypeScript reference types the lines:
`SDKAssistantMessage` with `message.content` blocks of type `tool_use`
(`id`, `name`, `input`) or `text`, `SDKUserMessage` with `tool_result` blocks
(`tool_use_id`, `content`), and `SDKResultMessage` with `subtype`, `is_error`,
`result`, `num_turns`, `total_cost_usd`, and `permission_denials`. The
installed binary (Claude Code 2.1.227) serializes the denial system message
with `subtype:"permission_denied"`, `tool_name`, `tool_use_id`, `agent_id`,
`decision_reason_type`, `decision_reason`, `message`, `uuid`, and
`session_id`, and no `tool_input`; the denied action must therefore be joined
to the `tool_use` block by id.

### E2 — Codex exec --json has a closed item vocabulary fixed in source

**Strength:** High
**Provenance:** A4, A5, A8

`exec_events.rs` defines `ThreadEvent` as `thread.started`, `turn.started`,
`turn.completed` (`usage`), `turn.failed` (`error`), `item.started`,
`item.updated`, `item.completed`, and `error`; `ThreadItem` flattens `id` with
`ThreadItemDetails` whose serde names are `agent_message` (`text`),
`reasoning`, `command_execution` (`command`, `aggregated_output`,
`exit_code`, `status` in `in_progress`, `completed`, `failed`, `declined`),
`file_change` (`changes[]` of `path` and `kind` in `add`, `delete`, `update`,
plus `status`), `mcp_tool_call`, `collab_tool_call`, `web_search`,
`todo_list`, and `error` (`message`). The JSONL processor maps protocol
`ItemStarted` and `ItemCompleted` notifications onto those records and
produces `turn.completed` or `turn.failed` from the turn status. No variant
relates to approvals or skills.

### E3 — Explicit invocations are expanded before the model on both hosts

**Strength:** High
**Provenance:** A2, A3, A6

Claude Code documents that user-invoked skills work in `-p` mode: "include
`/skill-name` in the prompt string and Claude Code expands it before running",
and the skills page states that a slash invocation bypasses the model's choice
while a model-chosen skill is a `Skill` tool call. Codex documents explicit
activation as a `$skill-name` mention in the prompt. In both cases the stream
records the expanded content, never a selection the model made, so an
explicit case's `skill_invoked` is a fact about the request. The R3
neutral-vocabulary rule already binds only natural requests (GROUND-0024), so
this derivation adds no new exception.

### E4 — Implicit Codex activation is observable only as the read of SKILL.md

**Strength:** Medium
**Provenance:** A4, A6

The Codex skills documentation states that Codex starts with each skill's
name and description and "still reads the full `SKILL.md` instructions for
that skill" when it selects it, and lists the skills roots (`$CWD/.agents/skills`,
`$REPO_ROOT/.agents/skills`, `$HOME/.agents/skills`, `/etc/codex/skills`). The
`--json` schema has no skill record. Whether that read surfaces as a
`command_execution` the stream shows, or as an injection the stream hides, is
not documented; the adapter takes the former reading and the pilot measures
it. The strength is Medium because the documentation describes behavior, not
the stream.

### E5 — Subagent records carry parent_tool_use_id and are forwarded by default

**Strength:** High
**Provenance:** A2

Messages from subagents appear as `assistant` and `user` messages whose
`parent_tool_use_id` is the id of the spawning tool call, `null` for the main
conversation; by default the subagent's `tool_use` and `tool_result` blocks
are emitted, and skills that run in a subagent appear the same way. Flattening
by ignoring the parent id, while preserving it in `native`, is the ADR-0080
item 7 rule that a dormant skill cannot hide behind a delegation.

### E6 — Public harnesses normalize these streams into flat tool-call lists with parent ids and skill calls

**Strength:** Medium
**Provenance:** B1, B2

promptfoo's Claude Agent SDK provider collects every tool call into
`response.metadata.toolCalls` with `id`, `name`, `input`, `output`,
`is_error`, and `parentToolUseId` (`null` for top level), and normalizes
`Skill` invocations into `response.metadata.skillCalls`. The closest public
skill harness drives `claude -p --output-format stream-json`, keeps the raw
stream as `trace.jsonl`, and derives `events.json` for process assertions
through `run-claude` and `run-codex` adapters. Both keep raw beside normalized,
which is the shape this record adopts. Medium because both are practitioner
implementations.

### E7 — Approval grants are policy, not events, in non-interactive runs on either host

**Strength:** High
**Provenance:** A2, A4, A5

Claude Code resolves a would-be prompt through `--allowedTools`,
`permissions.allow` rules, the permission mode, or a `PermissionRequest`
hook, and denies what nothing resolves; the stream records the denial, not the
grant. Codex takes the policy through `approval_policy` or
`--approve-for-me`, and its `--json` schema has no approval record; a command
the sandbox refuses completes with `status: declined`. A grant therefore has
no observable record on either host, which is why the adapter takes grants
from the policy it is handed. GROUND-0024 recorded this as the open mapping;
this record closes it with a rule and a pilot measurement.

### E8 — The repository already parses then validates JSON Lines-like inputs in dependency-free scripts

**Strength:** High
**Provenance:** C1, C2, C3, C4

`validate.mjs` fails closed on every event field the graders read, so an
adapter's output is checked at the same boundary as a hand-written receipt.
The `ad-prism` scripts read a file, parse, and validate before use, and
`test/prism-scripts.test.js` spawns them under `node:test`; the harness suite
already exercises the replay lane through its public interface. The
Codex-shaped receipt shows the trial the adapter must produce.

### E9 — No prior host-stream parsing exists in this repository

**Strength:** High
**Provenance:** D1, D2, D3

Content searches for `stream-json` and `item.completed` across `origin/main`
return nothing. The commits whose subjects mention "adapter" are the Prism
domain adapters, a different sense of the word. The adapters are new and owned
by the harness.

## Source register

- **A1:** Claude Agent SDK, TypeScript reference: `SDKAssistantMessage` (`message.content` `tool_use` blocks with `id`, `name`, `input`; `parent_tool_use_id`), `SDKUserMessage` (`tool_result` with `tool_use_id`), `SDKResultMessage` (`subtype`, `is_error`, `result`, `num_turns`, `total_cost_usd`, `permission_denials`), `SDKSystemMessage` init: https://code.claude.com/docs/en/agent-sdk/typescript (accessed 2026-09-17 via official web documentation).
- **A2:** Claude Code, Run Claude Code programmatically: `--output-format stream-json` with `--verbose`, "The last line of the stream is a `result` message", "denials appear as `permission_denied` system messages, and the final result message lists them in `permission_denials`", "Follow subagent messages" (`parent_tool_use_id`, `null` for the main conversation, `tool_use` and `tool_result` forwarded by default), "include `/skill-name` in the prompt string and Claude Code expands it before running": https://code.claude.com/docs/en/headless (accessed 2026-09-17 via official web documentation).
- **A3:** Claude Code, Skills: the `Skill` tool, permission rule syntax `Skill(name)`, a user-typed `/skill-name` invokes the skill directly while a model-chosen skill is a `Skill` tool call, `context: fork` skills run in a subagent: https://code.claude.com/docs/en/skills (accessed 2026-09-17 via official web documentation).
- **A4:** `openai/codex:codex-rs/exec/src/exec_events.rs`, `ThreadEvent`, `ThreadItem`, `ThreadItemDetails`, `CommandExecutionStatus` (`in_progress`, `completed`, `failed`, `declined`), `PatchChangeKind` (`add`, `delete`, `update`), `FileUpdateChange` (`path`, `kind`), `Usage`: https://raw.githubusercontent.com/openai/codex/main/codex-rs/exec/src/exec_events.rs (accessed 2026-09-17 via fetched source file).
- **A5:** Codex, Non-interactive mode: `codex exec --json` JSON Lines examples (`thread.started`, `turn.started`, `item.completed`, `turn.completed`), `--output-schema`, `--ephemeral`; `codex exec --help` on `codex-cli 0.147.0` lists `--json`, `--approve-for-me`, `-s, --sandbox`, `-C, --cd`, `--skip-git-repo-check`: https://developers.openai.com/codex/noninteractive (served from https://learn.chatgpt.com/docs/non-interactive-mode) (accessed 2026-09-17 via official web documentation and local command execution).
- **A6:** Codex, Build skills: skills roots `$CWD/.agents/skills`, `$REPO_ROOT/.agents/skills`, `$HOME/.agents/skills`, `/etc/codex/skills`; explicit activation by `$skill-name`; "When Codex selects a skill, it still reads the full SKILL.md instructions for that skill"; `allow_implicit_invocation`: https://learn.chatgpt.com/docs/build-skills (redirect target of https://developers.openai.com/codex/skills) (accessed 2026-09-17 via official web documentation).
- **A7:** Claude Code 2.1.227, the public Homebrew cask `claude-code@latest`, installed at `/opt/homebrew/Caskroom/claude-code@latest/2.1.227/claude`: `grep -ao 'subtype:"permission_denied"[^}]\{0,250\}'` (or the `perl` form in Corrections) prints the serialized fields `tool_name`, `tool_use_id`, `agent_id`, `decision_reason_type`, `decision_reason`, `message`, `uuid`, `session_id`, with no `tool_input`; the version is from `claude --version` (accessed 2026-09-17 via local command execution).
- **A8:** `openai/codex:codex-rs/exec/src/event_processor_with_jsonl_output.rs`, `collect_thread_events` maps `ServerNotification::ItemStarted` and `ItemCompleted` onto `ThreadEvent::ItemStarted` and `ItemCompleted`, and `TurnStatus::Completed` or `Failed` onto `turn.completed` or `turn.failed`; no skill or approval mapping: https://raw.githubusercontent.com/openai/codex/main/codex-rs/exec/src/event_processor_with_jsonl_output.rs (accessed 2026-09-17 via fetched source file).
- **B1:** promptfoo, Claude Agent SDK provider: "captures all tool calls made during the agentic session and exposes them in `response.metadata.toolCalls`" with `id`, `name`, `input`, `output`, `is_error`, `parentToolUseId` ("null for top-level"); "normalizes Claude `Skill` tool invocations into `response.metadata.skillCalls`": https://www.promptfoo.dev/docs/providers/claude-agent-sdk/ (accessed 2026-09-17 via official web documentation).
- **B2:** `adewale/skill-eval-harness:README.md`, `run-claude` and `run-codex` adapters: "Drive `claude -p --output-format stream-json`, capturing real per-run cost + token usage AND the full tool-use stream as the run's trace (`trace.jsonl`/`events.json`)"; implementation in `skill_benchmark.py`: https://github.com/adewale/skill-eval-harness (accessed 2026-09-17 via fetched GitHub page).
- **C1:** `eval/lib/validate.mjs:109-135`, event validation requiring `kind`, `path` on `file_write`, `command` on `command`, `action` on approval events, and a trial `outcome` with an `artifact_manifest`; `eval/lib/graders.mjs:47,107`, graders reading `skill_invoked` (accessed 2026-09-17 via repository read).
- **C2:** `src/skills/claude-code/ad-prism/scripts/validate-plan.mjs`, `validate-report.mjs`, `freeze-artifact.mjs`, dependency-free read-parse-validate scripts (accessed 2026-09-17 via repository read).
- **C3:** `test/prism-scripts.test.js:5,55`, `spawnSync('node', [join(PRISM_SCRIPTS, name), ...args])` under `node:test`; `test/eval-harness.test.js:1-17`, the harness suite importing the public `evaluateReplay`, `loadCorpus`, `evaluateCorpus`, `coverageReport` (accessed 2026-09-17 via repository read).
- **C4:** `eval/receipts/independent-look-before-merge-positive/healthy-codex.json`, a Codex-shaped trial (`host: codex`, tools `shell` and `apply_patch`, permissions `workspace-write`) with `skill_invoked`, `command`, `file_write`, `final` events (accessed 2026-09-17 via repository read).
- **D1:** `git log origin/main --oneline -S'stream-json'`; empty result, no prior attempt found (accessed 2026-09-17 via git history).
- **D2:** `git log origin/main --oneline -S'item.completed'`; empty result, no prior attempt found (accessed 2026-09-17 via git history).
- **D3:** `git log origin/main --oneline -i --grep='adapter'`; `4a264be` "fix(prism): ignore out-of-scope domain adapters" and `8b1043a` "feat(prism): add generic evaluation methodology" are Prism domain adapters, not host-stream adapters (accessed 2026-09-17 via git history).

## Limitations and reversal

This record maps documented and measured record shapes; it does not prove
that a live run emits them in the documented order or at all, and it does not
fix the pilot's approval policy per case. The sample streams are authored, so
a field the hosts emit but the documentation omits is invisible until the
pilot captures real streams. Reversal evidence: a Codex pilot in which an
implicitly selected skill leaves no `command_execution` reading its
`SKILL.md`, which would make Codex routing unobservable in `--json` and send
implicit Codex cases to another observation channel; a Claude Code stream in
which a `permission_denied` message cannot be joined to its `tool_use` block;
or a host that starts emitting a grant record, which would retire the
grant-from-policy rule in favor of the observed event.

## Corrections

- 2026-09-17, after the slice 6 fresh-context review: the decision paragraph said the sample streams "carry `origin: synthetic`"; `origin` is a receipt field, so the receipts built from those streams carry it and the streams themselves do not. The Codex skill-read mapping as first coded matched only the `.agents/skills` roots; A6 also documents `/etc/codex/skills`, and the adapter now matches every documented root, which is what E4 always claimed. The design entry in Task 0048 said a record the adapter does not know fails closed; both hosts emit legitimate records with no event kind (a file read, a reasoning item, a retry notice), so the adapters count those under `unmapped` and fail closed only on a malformed recognized record or a missing terminal record. None of the corrections changes a claim's strength.
- 2026-09-18, after the maximum-gate re-audit: A7 named only a local path, and its `grep` pattern used a repetition count BSD `grep` rejects ("maximum repetition exceeds 255"). The artifact is the public Homebrew cask `claude-code@latest` at version 2.1.227, so anyone can install the same binary; the portable command is `grep -ao 'subtype:"permission_denied"[^}]\{0,250\}' <binary>` or `perl -ne 'print "$1\n" while /(subtype:"permission_denied"[^}]{0,250})/g' <binary>`. One auditor reproduced the field list independently with the `perl` form. D3 said the commits whose "subjects mention" adapter; the command matches subject and body and returns five commits (`4a264be`, `8b1043a`, `1f45039`, `59ea66f`, `348989e`): the first two concern the Prism domain adapter, the other three quote the WORKFLOW §8 vocabulary list. None is a host-stream adapter, so E9 stands; the register now states the exact output.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0025-ground-host-stream-adapters.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
