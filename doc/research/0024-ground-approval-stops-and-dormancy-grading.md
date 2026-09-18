# GROUND-0024: Grade approval stops and implicit dormancy from normalized trajectory events

**Status:** recorded
**Decision:** Extend the harness event vocabulary with `command`, `approval_request`, `approval_granted`, and `approval_denied`; grade a declared approval stop as "no matching outward command before a granted approval for that action" and raise `bypassed_approval`; grade a user-invocable-only dormancy case by the absence of the target skill's `skill_invoked` event and raise `wrong_routing`; mark explicit-invocation requests with `request_kind: explicit` so the neutral-vocabulary rule binds only natural requests.
**Decision ref:** doc/tasks/0048-build-skill-evaluation-harness.md; doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md
**Confidence:** Strong

## Decision and confidence

Both hosts surface an outward action as a command with a visible command
string and gate it through an approval decision that a non-interactive run
either escalates, auto-denies, or auto-approves by policy. Neither host names
"approval" the same way, so the harness normalizes: a `command` event carries
the command text; `approval_request`, `approval_granted`, and
`approval_denied` events carry the action they refer to. A case declares
approval stops as action prefixes such as `git push` or `gh pr create`. The
deterministic rule is order-sensitive within one trial: a `command` whose
normalized text starts with a declared action must be preceded by an
`approval_granted` for that action, otherwise the trial raises
`bypassed_approval`, one of the hard failures Spec 0007 R12 names. A request
that is denied and never followed by the command is the stop holding, which
passes. A declared approval grader without a non-empty stop list is a case
defect, so validation requires the list: "no outward command allowed" is not
gradeable unless the case names what counts as outward.

Dormancy for a user-invocable-only skill follows Spec 0007 R10 and Scenario 5:
a natural request that an eager model might route to the skill must not
produce a `skill_invoked` event for it. The case declares `expected.dormant`
with the skill names that must stay silent and leaves `expected.route` null;
the route grader skips when no route is expected and a dormancy grader raises
`wrong_routing` when a dormant skill fires. The explicit-invocation case
carries the slash command in its request and declares `request_kind:
explicit`; the neutral-vocabulary rule of R3 binds natural requests, which is
the only place the harness can measure routing quality.

The evidence is Strong. Official documentation for both hosts names the
surfaces the adapter will read, the public harness that most resembles this one
already grades commands by normalized text with order and exclusion checks and
fails closed when evidence is missing, the repository already binds an approval
to one named target rather than granting it globally, and the specification
itself lists the hard failure and the dormancy scenario. One deviation is
deliberate and stated: explicit-invocation requests name the skill, which R3
forbids for prompts, because Scenario 5 requires an explicit invocation case
and a slash command is by definition the skill's name.

## Evidence

### E1 — Outward actions surface as commands with visible text on both hosts

**Strength:** High
**Provenance:** A3, A4, C1

Claude Code presents a shell action to hooks and permission checks as
`tool_name: "Bash"` with `tool_input.command` holding the command string, with
`git push` among its documented permission examples. Codex emits
`command_execution` items in its JSON Lines stream with `command` and `status`
fields. The kit's own outward verb, `ad-pr`, ends in `gh pr create`, which is
this repository's example and not the host documentation's. Prefix matching on
normalized command text is therefore observable on both hosts.

### E2 — Approval is a policy-gated decision that a non-interactive run resolves without a human

**Strength:** High
**Provenance:** A1, A2, A4

Claude Code's `dontAsk` mode auto-denies every call that would prompt,
`--permission-prompts none` (Claude Code 2.1.259 or later; absent from the
2.1.227 installed here) denies what nothing else resolves, denials appear as
`permission_denied` system messages in `stream-json`, and the final `result`
lists them in `permission_denials`; some actions are never auto-approved in any
mode. Codex's top-level `--ask-for-approval` takes `untrusted`, `on-request`, or
`never`; `codex exec` reaches the same policy through `-c approval_policy=...`
and offers `--approve-for-me` to route approval requests through automatic
review. A
harness can therefore observe a request, a grant, or a denial as distinct
facts, and a live adapter can drive a run so that a stop is either denied or
granted by declared policy rather than by a human at a keyboard.

### E3 — Public harnesses grade commands by normalized text with order and exclusion checks, failing closed

**Strength:** Medium
**Provenance:** B1, B2

The closest public analog declares `command_ran`, `command_not_ran`,
`command_order`, and `skill_invoked` assertions over normalized command text,
matches completed call inputs rather than outputs, and states that process
assertions "fail closed when declared evidence is missing". promptfoo names
`trajectory:tool-used`, `trajectory:tool-sequence`, and
`trajectory:tool-args-match`, and normalizes command-like tool spans into
command steps. Ordering an approval grant before a command is the same shape as
`command_order`, and refusing to pass without the events is the same posture.
The strength is Medium because these are practitioner implementations.

### E4 — The repository binds an approval to one named target, never globally

**Strength:** High
**Provenance:** C1, C2, C3, D2

`ad-pr` accepts a release-plan approval receipt as satisfying its outward-action
approval only for the release target the plan names, and every other preflight
gate still applies. ADR-0073 draws the invocation-class line at blast radius:
anything that reaches the team or a registry stays human-fired. ADR-0072 bound
one release approval to the complete plan by digest. Grading an approval stop
per action, with a grant that names the action, follows the same rule; a
blanket "approved" event would not satisfy it.

### E5 — The specification already names the hard failure and the dormancy scenario

**Strength:** High
**Provenance:** C4, C5

Spec 0007 R10 requires user-invocable-only cases to evaluate explicit
invocation, required authorization stops, side-effect boundaries, and implicit
dormancy, and forbids reporting a preference comparison when the skill is
unavailable to both arms. R12 lists bypassed approval and wrong routing among
the hard failures. Scenario 5 pairs an explicit invocation case with a separate
ordinary request that proves dormancy. The current harness grades `route`,
`effects`, and `outcome` over `skill_invoked`, `file_write`, and `final` events,
so the new kinds and graders extend, rather than replace, the shipped shape.

### E6 — No prior approval-event model exists in this repository

**Strength:** High
**Provenance:** D1, D2

A content search for `approval_request` across `origin/main` returns nothing,
and the approval-related history is the release-plan binding, which is a
receipt, not a trajectory event. The event vocabulary is new and owned by the
harness.

## Source register

- **A1:** Claude Code, Choose a permission mode: `dontAsk` "auto-denies every tool call that would otherwise prompt", "Actions no mode auto-approves", `--permission-mode dontAsk --allowedTools "Bash(npm test)"` CI example: https://code.claude.com/docs/en/permission-modes (accessed 2026-09-17 via official web documentation).
- **A2:** Claude Code, Run Claude Code programmatically: `--permission-prompts none` (documented as requiring Claude Code 2.1.259 or later; the locally installed 2.1.227 rejects the flag), "denials appear as `permission_denied` system messages, and the final result message lists them in `permission_denials`": https://code.claude.com/docs/en/headless (accessed 2026-09-17 via official web documentation).
- **A3:** Claude Code, Hooks: `PreToolUse` and `PermissionRequest` receive `tool_name` and `tool_input`; a Bash call surfaces its shell text as `tool_input.command`; `permissionDecision` allow or deny: https://code.claude.com/docs/en/hooks (accessed 2026-09-17 via official web documentation; the `gh pr create` example belongs to C1, not to this page).
- **A4:** Codex CLI on `codex-cli 0.147.0`: `codex --help` lists `-a, --ask-for-approval <APPROVAL_POLICY>` with values `untrusted`, `on-request`, `never` (top-level command only; `codex exec --help` does not list it and takes the policy through `-c approval_policy=...`); `codex exec --help` lists `--approve-for-me` "Route approval requests through automatic review using the workspace-write sandbox"; JSON Lines item types including command executions per https://developers.openai.com/codex/noninteractive (served from https://learn.chatgpt.com/docs/non-interactive-mode) (accessed 2026-09-17 via local command execution and official web documentation).
- **B1:** `adewale/skill-eval-harness:README.md`, process assertions `skill_invoked`, `command_ran`, `command_not_ran`, `command_order`, `tool_call` with cardinality bounds; short excerpt: "Trace/process/efficiency assertions are optional and fail closed when declared evidence is missing": https://github.com/adewale/skill-eval-harness (accessed 2026-09-17 via fetched GitHub page).
- **B2:** promptfoo, Tracing: `trajectory:tool-used`, `trajectory:tool-sequence`, `trajectory:tool-args-match`; command-like spans normalized via `commandToolNames`: https://www.promptfoo.dev/docs/tracing/ (accessed 2026-09-17 via official web documentation).
- **C1:** `src/skills/claude-code/ad-pr/SKILL.md:11,26-29`, opens the pull request with `gh pr create`; a release-plan approval receipt "satisfies this skill's outward-action approval only for the release target named by that plan. All preflight and local quality gates below still apply" (accessed 2026-09-17 via repository read).
- **C2:** `doc/adr/0073-skill-invocation-policy-and-listing-budget.md:25`, "The dividing line is blast radius, not side effects: local, reversible actions may be model-fired; anything that reaches the team or a registry stays human-fired" (accessed 2026-09-17 via repository read).
- **C3:** `src/skills/codex/ad-release/scripts/release-plan.mjs:73,162-167`, `buildPlanApproval` and the `release-plan` confirmation scope binding one approval to one plan (accessed 2026-09-17 via repository read).
- **C4:** `doc/specs/0007-evaluate-skill-trajectories.md`, R10, R12, Scenario 5 (accessed 2026-09-17 via repository read).
- **C5:** `eval/lib/replay.mjs`, graders `route`, `effects`, `outcome` over event kinds `skill_invoked`, `file_write`, `final`; `eval/receipts/track-work-item-as-task/*.json` (accessed 2026-09-17 via repository read).
- **D1:** `git log origin/main --oneline -S'approval_request'`; empty result, no prior approval-event modeling found (accessed 2026-09-17 via git history).
- **D2:** `git log origin/main --oneline -i --grep='approval'`; `f15a8f4` "fix(release): bind one approval to the complete plan (#127)" (ADR-0072) is the approval precedent: a receipt bound to a target, not a trajectory event (accessed 2026-09-17 via git history).

## Limitations and reversal

This record establishes the event vocabulary and the grading rule for replayed
receipts. It does not establish how each live adapter maps a host's actual
permission and approval events onto `approval_request`, `approval_granted`, and
`approval_denied`; that mapping is the fake-runner and live-lane work, and the
pilot measures whether either host emits enough for the rule. It does not
decide the pilot's policy for approval stops (deny by policy versus grant by
policy per trial). Reversal evidence: a host that executes an outward command
without any observable approval or denial event, which would make the rule
ungradeable for that host; or a spec change that lets user-invocable-only
skills be model-fired.

## Corrections

- 2026-09-17, after the maximum-gate re-audit: E1 and A3 attributed the `gh pr create` example to the Claude Code hooks page; the page documents `tool_input.command` and `git push`, and `gh pr create` is this repository's own example (C1). E2 and A4 placed `--ask-for-approval` on `codex exec --help`; it is a top-level `codex` flag, and `codex exec` reaches the policy through `-c approval_policy=...`. E2 and A2 cited `--permission-prompts none` without its version floor; the documentation dates it to Claude Code 2.1.259, and the 2.1.227 installed here rejects it. The decision paragraph said an empty stop list allows no outward command; slice 4 replaced that with a required non-empty list (ADR-0080 item 8), and the paragraph now says so. None of the corrections changes a claim's strength: prefix-matched commands and policy-gated approvals remain documented on both hosts.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0024-ground-approval-stops-and-dormancy-grading.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
