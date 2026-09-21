# RESEARCH-0026: Should the kit add an optional runtime layer of deterministic host hooks?

**Status:** concluded
**Created:** 2026-09-21
**Question:** Should Agentic Development add an optional runtime layer that uses the native lifecycle hooks of Claude Code and Codex to run the kit's existing deterministic validators during execution, return structured feedback to the agent, and emit evidence the `eval/` harness can consume, and if so, what is the smallest slice that proves the value?
**Stakes:** medium times reversible
**Confidence:** Conditional

## Conclusion and confidence

Yes, with three conditions, and with one correction to the input brief that removes its largest planned dependency.

The brief's core thesis holds: the kit already owns every ingredient the runtime layer needs except the wiring. It ships deterministic validators as skill scripts (ADR-0057), it ships two agent-lifecycle hooks that prove the delivery mechanism works on Claude Code (ADR-0055, ADR-0074), it owns a receipt contract with five graders (ADR-0080), and it has a live capture lane under construction (ADR-0082, proposed). What does not exist is any hook that observes a tool event, runs a validator, and feeds the result back. The gap is real, narrow, and named as future scope in the kit's own `ad-hooks` skill.

The correction: the brief treats Codex as a later phase reachable only through the Codex App Server. That is stale. Codex ships native lifecycle hooks, enabled by default, with the same event vocabulary as Claude Code (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, and others), the same blocking mechanisms (exit code 2, `decision: "block"`), and a project-scoped `.codex/hooks.json`. The App Server is documented by OpenAI as experimental and unsupported for production. The runtime layer can therefore be dual-host by design from the first slice, with two thin adapters over one shared core, and the App Server leaves the plan entirely. One qualification: the first live pilot (Source D, commit `6f15b62`) could not run its Codex leg because the operator's Codex CLI refuses the account's available models, so the Codex half is designable now but measurable only after that toolchain is upgraded.

The three conditions, each a named mitigation:

1. **The first slice is feedback, not enforcement, by construction.** It hangs off `PostToolUse` on the write tools, runs one existing artifact validator, and surfaces a failure to the model as stderr on exit 2. `PostToolUse` cannot block on either host, which makes the slice structurally consistent with the kit's advisory-first debut rule for novel gates and with ADR-0074's rejection of coercion. A blocking `PreToolUse` guard and any `Stop`-based repair loop are later slices, each behind its own ADR.
2. **No verify-repair loop until a convergence criterion exists.** Both hosts document a `Stop` hook that keeps the turn alive with a reason, and both document a loop guard (`stop_hook_active`). But two accepted kit decisions weigh against it: ADR-0074 rejected blocking the session as coercion, and ADR-0047 recorded that review-until-clean loops were reported non-converging by their own author. The disagreement is genuine and is recorded side by side below; it resolves only with pilot data on a deterministic validator, not with argument.
3. **Gains are measured against the live lane, never asserted.** Task 0081's live capture lane is the baseline instrument, and its first pilot already shows that hook firings appear in the captured Claude Code stream as `system.hook_started` and `system.hook_response` records (C15), so a runtime gate is observable by the same lane without new plumbing. A runtime gate ships with a receipt-shaped evidence record so the same graders that judge a replay can judge a live run with the gate on and off. Two caveats bound that instrument today: the route grader carries a false negative on implicit skill activation (Task 0082, proposed on the same branch), and the receipt schema has no field for a gate verdict (C16). No efficiency or quality claim is published before the comparison exists, which is what the brief itself demands in its cost section.

The bar for Strong at medium stakes and full reversibility is a measurement on the real target. None exists yet, so the verdict is Conditional: proceed with the pilot slice, and let the pilot's receipts decide whether a second gate is justified.

## Question and scope

The input is a first-pass brief (attached to the session that produced this study, dated 2026-09-21) proposing an "Agentic Runtime Layer": keep skills as the reasoning layer, move a bounded set of mechanically checkable invariants into deterministic hooks, observe execution results, validate them with contracts the project already owns, return feedback on failure, and persist evidence the evaluation harness can reuse. The brief explicitly excludes an IDE, a full harness, a model router, a daemon, a database, and any hosted dependency.

The answerable question has three parts, each with a deciding criterion:

- **Whether.** Does the kit's own state and doctrine support the layer, or is it already covered, out of scope, or contradicted by an accepted decision? Criterion: coverage against the artifact stack and the ADR projection.
- **How much.** Is the brief's host model current, and which host mechanisms exist with which exact semantics? Criterion: primary host documentation, read on the date of this study.
- **Which first.** Among the kit's existing deterministic checks, which one meets the brief's own selection criteria for a first slice: instruction-dependent today, backed by a reliable validator, capable of failing in real work, able to return actionable feedback, and integrable with the host lifecycle? Criterion: the five conditions applied to the inventory.

Out of scope for this study: the design of the shared core, the receipt extension for runtime events, and any implementation. Those belong to the spec, ADR, and task this study may graduate to.

Stakes are medium. The layer is opt-in and additive, every hook is removable by deleting a settings block, and the skills-only mode stays a valid configuration, so the change is reversible. The cost of being wrong is a pilot that measures no gain, which is an acceptable and informative outcome the brief already names as valid.

## Hypothesis

Falsifiable, and settled by the pilot rather than by this study:

> A `PostToolUse` hook that runs an existing artifact validator on every write to a governed document directory will surface, during the turn, validator failures that today reach a commit or a review, and the agent will correct them within the same turn after reading the hook's stderr.

Prediction that confirms it: over a pilot run on both hosts, the live lane records at least one validator failure surfaced by the hook and corrected before the turn ends, with zero false blocks, because the hook cannot block. Prediction that refutes it: the hook fires on every governed write and surfaces nothing across the pilot, or its stderr is ignored by the model, in which case the kit's existing skill-step invocation of the same validator is already sufficient and the layer should stop at one slice.

## Method

Four-source pass per `WORKFLOW.md` §4-5 and the `ad-ground` Source A / B / C / D contract, run on 2026-09-21.

- **Source A, official documentation.** Claude Code hooks reference and Desktop page; Codex hooks guide, configuration reference, and App Server page. Read through the public web on the study date. The hooks references were queried for per-event blocking semantics, stdin fields, and loop guards specifically, because the brief itself flags that per-event semantics must not be assumed.
- **Source B, validated implementation references.** The openai/codex issue that proposed `PreToolUse` and `PostToolUse` for the Codex hooks engine, used to date when the events landed relative to the brief. GitHub API access from this environment failed on the day, so the repository's own docs directory was not read; the published guide stood in for it.
- **Source C, in-repo patterns.** A read-only inventory of the kit: every shipped hook and its blocking behavior, the installer's hook footprint, the lefthook stages, every deterministic skill script and how each is invoked today, the `eval/` receipt and grader contracts, and the doctrine in `WORKFLOW.md`, `ARCHITECTURE.md`, and the PRD. Findings are cited as `path:line` against the `lagos` worktree at commit `e681a3e`.
- **Source D, git history.** The ADR projection for what binds; ADR-0047, ADR-0055, ADR-0057, ADR-0074, ADR-0078, ADR-0080; and the unmerged `feat/live-evaluation-lane` branch, whose three commits add ADR-0082 and Task 0081 (`d304e7b`), the live lane code (`0ea2d0d`), and the first authorized pilot's findings as a dated addendum to GROUND-0025 plus Task 0082 (`6f15b62`, authored during the session that produced this study and read after a fresh-context review pointed at it).

Grading rule applied to host documentation: a host behavior read from one official page on one date and never exercised by the kit is sealed Medium, not High, because `WORKFLOW.md` §17 reserves E2 for primary documentation joined with a validated reference. A behavior the kit already exercises in shipped code, or one confirmed by the pilot's captured stream, is sealed High.

Each load-bearing claim is graded per `WORKFLOW.md` §17 Axis 1 with its provenance. Where the brief and the kit's accepted decisions disagree, the positions are recorded side by side.

## Evidence

### Claims the brief makes that hold

**C1. Skills are advisory and hooks are the deterministic mechanism; Claude Code documents the boundary.** High. Source A: the Claude Code hooks reference states per event whether a hook can block and by what mechanism. Source C: the kit already records the same fact and acts on it. `doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md:9` quotes Anthropic that skills and `CLAUDE.md` are advisory and a guarantee requires a hook; `WORKFLOW.md` §11 opens with "`AGENTS.md` is advisory. Hooks and CI are deterministic." Nothing new is being claimed; the brief re-derives the kit's own §11.

**C2. Claude Code Desktop shares hooks, skills, settings, and MCP configuration with the CLI, so no new UI is needed.** Medium: one official page, read once, not exercised by the kit under Desktop. Source A, Desktop page: "Hooks and skills defined in settings apply to both"; "Settings in `~/.claude.json` and `~/.claude/settings.json` are shared." One documented caveat matters for a hook that shells out: the Desktop app reads the shell profile only for `PATH` and a fixed set of variables, so a hook that depends on other exported environment variables may behave differently under Desktop. The kit's existing hooks use `AD_*` environment knobs, so a runtime gate must document this.

**C3. The kit already owns validators, a receipt contract, graders, and a live lane design.** High for existence; Medium for readiness, because the pilot found one grader wrong. Source C: ADR-0057's title states the rule, "deterministic skill steps are bundled `scripts/`; judgment stays text" (`doc/adr/0057-skills-deterministic-steps-as-scripts.md:1`), and its decision items at `:20-27` bind it. Shipped artifact validators include `ad-ground/scripts/validate-record.mjs` (ADR-0070), `ad-prism/scripts/validate-plan.mjs` and `validate-report.mjs`, `ad-drift/scripts/drift-scan.mjs`, and `ad-voice`, `ad-template-tune`, and `ad-release` contract scripts. The receipt schema `agentic-eval-receipt/1` and its five graders (`route`, `effects`, `outcome`, `approval`, `dormancy`) live at `eval/lib/validate.mjs:4-21` and `eval/lib/graders.mjs:169-175`. Source D: ADR-0082 (proposed, unmerged) and Task 0081 (in-progress, unmerged) design the live capture lane with an operator-supplied runner, one process per trial, and, after the pilot, captures that default to the OS temporary directory because a live stream carries the operator's configuration. The readiness caveat: the pilot showed the Claude Code adapter scores `skill_invoked: 0` when the model reads `SKILL.md` instead of calling the `Skill` tool, so the `route` grader currently fails trials the skill did route; the fix is Task 0082 (proposed, unmerged). A runtime gate that reuses the graders inherits that false negative until it lands.

**C4. No validator is wired to an agent-lifecycle event today; `PreToolUse` and `PostToolUse` are named future scope.** High. Source C: `src/skills/claude-code/ad-hooks/SKILL.md:166`, "Other agent events (`PreToolUse` / `PostToolUse`) remain future scope"; `doc/adr/0055-session-lifecycle-handoff-nudge-hook.md:11` records the same deferral. The two shipped agent hooks are `Stop` (handoff nudge, structurally non-blocking) and `UserPromptSubmit` (workflow checkpoint, always exit 0), both in `.claude/settings.json:1-25` pointing at `ad-hooks/scripts/`. The installer writes no hooks at all (`src/lib/install.js` has no settings reference); wiring is a confirmed skill action. Validators reach the agent today only as a skill step, a lefthook stage, or `npm test`.

**C5. The brief's non-goals are consistent with the PRD.** High. Source C: `doc/product/PRD.md:41-42` names "Not a hosted SaaS" and "Not an IDE-integration layer" as non-goals; the brief excludes an IDE, a daemon, a database, and hosted orchestration. The PRD roadmap has no line for a runtime layer, which is a gap to fill if this study graduates, not a conflict.

### Claims the brief makes that are stale or wrong

**C6. Codex has native lifecycle hooks, generally available, with the same event vocabulary and blocking model as Claude Code.** Medium: two official pages agree and a dated issue corroborates the timeline, but the kit has never wired a Codex hook and the pilot's Codex leg did not run, so nothing here is exercised. Source A, Codex hooks guide and configuration reference, read 2026-09-21: events `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, `Stop`, `Interrupt`; "Hooks are enabled by default"; the `features.hooks` flag is stable with `features.codex_hooks` as a deprecated alias; configuration in `~/.codex/hooks.json`, `~/.codex/config.toml`, `<repo>/.codex/hooks.json`, `<repo>/.codex/config.toml`; blocking by exit code 2 with stderr as reason or by `decision: "block"` with `reason`; "Before a non-managed hook can run, Codex requires you to review and trust the exact hook definition." Source B: openai/codex issue 14882 (filed 2026-03-17, closed as duplicate of 14754) proposed `PreToolUse` and `PostToolUse` on top of a hooks engine that then covered only `SessionStart` and `Stop`, which dates the tool events to after March 2026 and explains why the brief's sources did not have them. Consequence: the brief's phase "Codex later via App Server" is unnecessary for gates. Source D qualifies the reach: the pilot addendum records that `codex-cli 0.139.0` refused both models available to the operator's account, so the Codex adapter cannot be measured in this environment until the CLI is upgraded, which is the owner's call.

**C7. The Codex App Server is not a production integration surface.** High. Source A, App Server page: "The app-server command and WebSocket transport are experimental and aren't supported for production workloads." It is open source (`openai/codex/codex-rs/app-server`), JSON-RPC 2.0 over stdio or WebSocket, with `turn/steer` and `turn/interrupt`. It remains the right surface only for a future macro-loop question, which this study does not need to answer.

**C8. The kit's own `ad-hooks` skill carries stale Codex text.** High. Source C: `src/skills/claude-code/ad-hooks/SKILL.md:93` says "Codex's compact hooks exist but context-injection parity is undocumented, so this tier is out of scope on Codex". Per C6, Codex now documents `UserPromptSubmit` and `Stop` with `additionalContext`. This is a drift item independent of the runtime proposal and should be corrected regardless of the verdict here.

### Per-event semantics that bound the design

**C9. `PostToolUse` cannot block on Claude Code; exit 2 surfaces stderr to the model after the tool ran.** Medium: official pages on both hosts, read once, never exercised by the kit. This is the claim the first slice rests on, so the slice's first offline test and its first live capture are what raise it. Source A, Claude Code hooks reference: the exit-code table marks `PostToolUse` as unable to block, and the text advises "To surface a warning to Claude from a `PostToolUse` or `PostToolUseFailure` hook, exit 2 instead so Claude sees the stderr even though the tool already ran." JSON output supports `systemMessage` and `hookSpecificOutput.additionalContext`. Stdin carries `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `session_id`, `cwd`. On Codex, `PostToolUse` with `decision: "block"` "doesn't undo the completed Bash command. Instead, Codex records the feedback, replaces the tool result with that feedback, and continues the model from the hook-provided message." Both hosts therefore deliver post-write feedback to the model; the Codex form is stronger because it replaces the tool result.

**C10. `PreToolUse` can deny on both hosts, with tool-name matchers and, on Claude Code, an `if` field using permission-rule syntax.** Medium: the deny fields were read twice on Claude Code (here and in GROUND-0024 A3 on 2026-09-17), but the `if` syntax and the Codex form are single-read and unexercised. Source A: Claude Code, `permissionDecision: "deny"` or exit 2; matchers such as `Edit|Write`; `"if": "Bash(git *)"` with each subcommand checked and leading assignments stripped. Codex, `permissionDecision: "deny"` in `hookSpecificOutput` or exit 2. This is the surface for a later blocking guard such as refusing `--no-verify`, which `WORKFLOW.md` §11 bans in text only today; the lefthook `pre-push` branch guard covers pushes to `main` but nothing deterministic covers the bypass flag.

**C11. `Stop` can keep the turn alive on both hosts and both document a loop guard.** High for Claude Code, because the kit already exercises the event and its guard in shipped code (`src/skills/claude-code/ad-hooks/scripts/handoff-nudge.mjs:128` returns on `stop_hook_active`); Medium for Codex, single-read and unexercised. Source A: Claude Code, exit 2 "Prevents Claude from stopping, continues the conversation"; `decision: "block"` with `reason` does the same; stdin carries `stop_hook_active` and `last_assistant_message`, and the reference warns to check `stop_hook_active` to avoid an infinite loop. Codex: `decision: "block"` "tells Codex to continue and automatically creates a new continuation prompt that acts as a new user prompt, using your `reason` as that prompt text"; `stop_hook_active` is "Whether this turn was already continued by `Stop`". The mechanism for a verify-repair loop exists; whether the kit should use it is the contested question below.

**C12. Hooks can be declared in skill frontmatter and persist for the session.** Medium. Source A, Claude Code: "Claude Code registers them when you or Claude invoke the skill and keeps running them for the rest of the session"; `once: true` removes a hook after its first successful run and is honored only in skill frontmatter. Medium rather than High because the session-lifetime behavior was read from one page on one date and the kit has not exercised it. It matters because it offers a third wiring path beside settings files and the installer: a skill that arms its own gate when invoked.

### Contested: a `Stop`-based verify-repair loop

**Position A, the brief.** The hosts support it (C11), a deterministic validator failure is reproducible with actionable feedback, and a bounded retry count prevents runaway. The brief itself conditions the loop on reproducibility, actionable feedback, a real chance of a different result, and an explicit limit.

**Position B, the kit's accepted decisions.** `doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md:48` rejected "Blocking with exit 2 until the pipeline is acknowledged" because "It fights the user, and the kit's posture (ADR-0047, ADR-0055) is deterministic delivery, not coercion." `doc/adr/0047-absorb-team-practices-determinism-reaudit.md:42` recorded review-to-zero-findings loops as "reported non-converging on the current frontier model by their own author". `doc/adr/0055-session-lifecycle-handoff-nudge-hook.md:58` rejected `decision: "block"` and `additionalContext` on `Stop` for the nudge because both continue the turn and are loop-prone.

**When each holds.** Position B's rejections were made for heuristic or advisory content: a workflow reminder and a review loop whose verdict is a model judgment. Position A's case is a deterministic validator whose failure has a mechanical fix, which is a different class. The rejections therefore do not bind the runtime case by their letter, but they do by their spirit until data shows a deterministic-failure loop converges. Resolution: not in this study. A `Stop` gate is a later slice, behind its own ADR that names ADR-0047, ADR-0055, and ADR-0074 as the decisions it qualifies, and behind a measured convergence rate from the pilot. Graded Medium for the mechanism, Insufficient for the decision.

### The first slice, selected against the brief's own criteria

The brief's section 18 asks for one invariant that is instruction-dependent today, has a reliable validator, can fail in real work, yields actionable feedback, and integrates with the host lifecycle. Applied to the inventory:

| Candidate | Instruction-dependent today | Reliable validator | Fails in real work | Actionable feedback | Host event | Verdict |
|---|---|---|---|---|---|---|
| Research and plan records must pass their validator before the turn ends | Yes: `/ad-ground`, `/ad-prism` run the script as a skill step the agent may skip | Yes: `validate-record.mjs`, `validate-plan.mjs`, `validate-report.mjs`, offline | Yes: the drift audit closed by Task 0079 found record-level gaps that reached `main` | Yes: the validator's own message | `PostToolUse` on `Write|Edit` filtered to `doc/research/**` and evaluation plan paths | **First slice.** Feedback-only by construction on Claude Code; dual-host |
| Never bypass hooks (`--no-verify`) | Yes: `WORKFLOW.md` §11 text only | Trivial: argument match | Yes | Deny reason | `PreToolUse` with `if: Bash(git *)` | Second slice: a blocking guard, needs the advisory-first flip criterion or a rationale for blocking from day one as a toolchain gate |
| Leak denylist on write | No: `pre-commit` already blocks fail-closed | Yes: `findViolations` | Yes | Yes | `PreToolUse` on write tools | Later: moves an existing gate earlier; marginal value is time-to-feedback, not coverage |
| ADR, task, spec structure and numbering | Partly: `drift-scan.mjs` runs on `/ad-drift` | Yes, but numbering collides across branches and cannot be checked locally | Yes: this study's sibling branch consumes ADR-0082 and Task 0081 concurrently | Partial | `PostToolUse` | Later: needs a scope decision on what a local hook can know |
| Changelog entry with shipped content | No: `pre-commit` warns already | Yes | Yes | Yes | Not needed | Out: already covered at the right stage |

The first slice is the artifact-validator feedback gate. It exercises the whole path the brief names (host event, deterministic check, pass or fail, structured feedback, evidence record) without any blocking, on both hosts, with an existing validator and an existing skill (`ad-hooks`) as the wiring owner. Graded High on fit; the value it delivers is the hypothesis above and is not yet measured.

### The brief's own tests, applied to the first slice

**The section 6 promotion test.** The brief allows moving a rule from prompt to runtime only when it is objectively evaluable, a wrong execution has a real consequence, enforcement is more reliable than interpretation, and no open semantic reasoning is needed. For the artifact-validator gate: the validators are pure functions over a file, so the verdict is objective; an invalid record that reaches `main` is the consequence Task 0079 measured; the validator is already the authority the skills instruct the agent to run, so a hook that runs it unconditionally is at least as reliable as an instruction the agent may skip; and no judgment is involved because the hook reports the validator's own message. All four hold. Graded High on the first, second, and fourth; Medium on the third until the pilot measures how often the skill step is actually skipped.

**The section 17 criteria for not continuing.** The brief names five reasons to stay at skills plus a light runtime. This study's verdict is already the light runtime, so the criteria apply to the second gate and beyond, not to the first slice: hooks and scripts solving the relevant problems is the hypothesis under test; the native UI staying the better experience is preserved by construction because the slice adds no UI; a macro-harness not improving results measurably is exactly why the App Server and Agent SDK stay out; operational complexity is bounded to one script and one settings block per host; and cross-host duplication is avoided by one shared core with two adapters that only translate stdin and exit codes. Each criterion is carried into the Derived decision as a stop condition a later ADR must check before adding a gate.

**The section 19 architectural requirements, against the kit today.**

| Requirement | Kit today | Carried forward as |
|---|---|---|
| Optionality | Both shipped agent hooks are opt-in skill actions; the installer writes none (C4) | Acceptance criterion: skills-only mode unchanged with the gate absent |
| Host adapters thin | Existing hook scripts are byte-identical across host trees and read stdin JSON only | Acceptance criterion: adapter code translates events and exit codes; validation lives in the shared script |
| Offline testability | `npm test` is offline and credential-free; the live lane is never part of a gate | Acceptance criterion: the gate's core has offline tests; live capture stays a separate lane |
| Fail visibly | Existing hooks are silent on malformed stdin by design (ADR-0074); no runtime distinguishes gate-failed from runtime-unavailable | Design item for the spec: the four failure classes the brief names must be distinguishable in the evidence record |
| No semantic pretending | ADR-0057 already draws the line | Acceptance criterion: the gate runs an existing validator and adds no judgment |
| Evidence first | This study, plus Task 0079's drift count as the observed problem | Acceptance criterion: the task names the observed problem, the measure, and the evidence that would remove the gate |

### What the pilot already measured

**C15. Hook firings are visible in the captured Claude Code stream.** High, E1. Source D, the GROUND-0025 addendum in `6f15b62`: the pilot's `unmapped` population included one `system.hook_started` and one `system.hook_response` record among nine unmapped host shapes. The kit's own `UserPromptSubmit` checkpoint was the hook that fired. Consequence: a runtime gate's firings and verdicts can be captured by the live lane as it exists, and a receipt can carry them once the event vocabulary names them.

**C16. The receipt schema has no field for a gate verdict.** High. Source C: `eval/lib/validate.mjs:4-21` defines trial events as `skill_invoked`, `file_write`, `command`, `approval_request`, `approval_granted`, `approval_denied`, and `final`; nothing carries the brief's `gate`, `status`, `evidence`, `feedback`, `reproduction` shape. The brief's section 8 reuse is therefore a schema extension, not a free reuse: either a new event kind or a sidecar record beside the receipt. The pilot's capture-privacy decision (ADR-0082 decision 4 as revised) applies to that record too, since a gate's evidence may quote the operator's paths.

### Efficiency and cost

**C13. No efficiency or quality gain can be claimed today.** Very-low for any gain; High for the statement that none is measured. The brief says so itself. The pilot changed what the instrument can see (C15) and where it writes (captures default to the OS temporary directory), not what it has measured: one trial, one host, one model, with no gate present. ADR-0082 decisions 3 and 6 keep the captured stream beside the receipt and treat a failing host as data, which is what an on-versus-off comparison needs.

### Jev and decision engines

**C14. Jev is excluded from the first architecture by the brief, and nothing in this study changes that.** Low on Jev's current delivery model (service or API, not self-hosted), because it was not independently verified here; irrelevant to the verdict, because the brief already excludes it and the kit's YAGNI posture would exclude an abstraction with zero consumers regardless.

## Limitations and what would reverse the conclusion

- Host documentation was read through a summarizing fetch on one date. The per-event semantics in C9 through C11 were cross-checked against two queries each, but a reader implementing the slice must reopen the pages, as the brief and `ad-ground` both require.
- The Codex hooks guide does not enumerate which Codex surfaces (CLI, IDE extension, cloud) honor hooks. The dual-host claim in C6 is about the CLI, which is the surface the kit's Codex adapter targets, and that CLI could not run in the pilot's environment.
- The pilot is one trial on one host under the operator's global configuration, not the `bare` context policy the receipts declare. Its addendum says the activation finding should be re-measured bare before it is generalized; the same applies to C15.
- GitHub API access failed during the study, so the openai/codex repository docs were not read directly.
- The evidence that validator failures reach `main` today (Task 0079) is a count of drift items, not a count of skipped validator runs. The pilot's first job is to measure the actual base rate.

The conclusion reverses to "stop at skills-only" if the pilot shows the `PostToolUse` gate surfaces nothing over a representative run on both hosts, or if the model ignores the surfaced stderr. It reverses toward a larger runtime if the pilot shows the hosts lack an event the kit needs, which the brief's section 16 already names as the trigger to look at the Agent SDK and the App Server.

## Provenance and artifacts

Source A, official documentation, all accessed 2026-09-21 through the public web:

- Claude Code, Hooks reference: https://code.claude.com/docs/en/hooks
- Claude Code, Desktop: https://code.claude.com/docs/en/desktop
- Codex, Hooks guide: https://developers.openai.com/codex/hooks (redirects to https://learn.chatgpt.com/docs/hooks)
- Codex, Configuration reference: https://developers.openai.com/codex/config-reference (redirects to https://learn.chatgpt.com/docs/config-file/config-reference)
- Codex, App Server: https://developers.openai.com/codex/app-server (redirects to https://learn.chatgpt.com/docs/app-server)

Source B, implementation references, accessed 2026-09-21:

- openai/codex issue 14882, "Proposal: add PreToolUse/PostToolUse lifecycle hooks to Codex hooks engine", filed 2026-03-17, closed as duplicate of 14754: https://github.com/openai/codex/issues/14882

Source C, in-repo, worktree `lagos` at commit `e681a3e`:

- `src/skills/claude-code/ad-hooks/SKILL.md:21`, `:93`, `:166`
- `src/skills/claude-code/ad-hooks/scripts/handoff-nudge.mjs:128`, `workflow-checkpoint.mjs`; `.claude/settings.json:1-25`
- `eval/lib/validate.mjs:4-21`, `:155-171`; `eval/lib/graders.mjs:169-175`; `eval/lib/adapters/claude-code.mjs:12-16`; `eval/lib/adapters/codex.mjs:14-21`
- `doc/product/PRD.md:22`, `:37-43`, `:68`; `ARCHITECTURE.md:23`, `:27`; `WORKFLOW.md` §11, §13
- `lefthook.yml:37-68`; `package.json:19-25`

Source D, git history:

- `doc/adr/0047:42`, `0055:11` and `:58`, `0057:1` and `:20-27`, `0074:9` and `:48`, `0078:25-41`, `0080`; `doc/adr/PROJECTION.md`; `doc/research/0024:135`
- Branch `feat/live-evaluation-lane`, commits `d304e7b` (ADR-0082 proposed, Task 0081 in-progress), `0ea2d0d` (`eval/lib/live.mjs`), and `6f15b62` (GROUND-0025 addendum "the first authorized live pilot", ADR-0082 decision 4 revised, Task 0082 proposed), all unmerged on the study date
- The input brief, attached to the session that produced this study, dated 2026-09-21

## Derived decision

None yet. If the conclusion is accepted, the graduation path is: a PRD roadmap line for the runtime layer; a feature spec for the first slice inheriting from it, carrying the section 19 table above as acceptance criteria and the section 17 criteria as the stop conditions for any later gate; an ADR that records the runtime layer's boundary (feedback-first, dual-host through native hooks, one shared core, gate evidence as a receipt extension per C16, App Server excluded) and names the `Stop`-loop question as deferred behind its own decision; a task for the `PostToolUse` artifact-validator gate; and the correction of the stale Codex text in `ad-hooks` (C8) as a separate drift fix. Two prerequisites: the ADR and task must be written after re-reading the GROUND-0025 pilot addendum, since it is the only measured evidence in this area and it moved during this study; and numbering must be taken after `feat/live-evaluation-lane` lands, which consumes ADR-0082 and Tasks 0081 and 0082.
