# Spec `0008`: Surface artifact validator failures during the turn

**Status:** draft
**Created:** 2026-09-21
**Owner:** Alexandre Alvaro

## Context

The kit ships deterministic validators for the artifacts its skills write: a
ground receipt has `validate-record.mjs`, an evaluation plan and report have
`validate-plan.mjs` and `validate-report.mjs`, and the decision layers have
`drift-scan.mjs`. Each validator is a pure check over a file, and each is
reached today in one of three ways: the agent runs it as a skill step, a
lefthook stage runs it at commit or push, or `npm test` runs it. The first path
is the one the skills rely on, and it is advisory: an agent that forgets the
step writes an invalid record and nothing tells it so until a later commit, a
review, or a drift audit. Task 0079 closed a set of record-level drift items
that had reached `main` by exactly that route.

Both supported hosts document a lifecycle event that fires after a tool call
completes and lets an external command return text the model sees. That is the
gap between "the validator exists" and "the validator runs whenever the
artifact is written". RESEARCH-0026 graded the case for closing it and
concluded Conditional: proceed with a feedback-only gate, keep blocking and
repair loops behind their own decisions, and measure gains on the live lane.

This feature is that first slice. It is the PRD's Next-tier runtime layer
reduced to one invariant: a governed artifact that fails its validator is
reported to the agent inside the turn that wrote it, with the validator's own
message and a command that reproduces the verdict, and every firing leaves a
machine-readable evidence line the skill evaluation harness can read. Without
it the runtime layer stays a proposal; with it the kit has one measured
example of an advisory rule made deterministic, which is the evidence the
second slice needs.

## User Scenarios

- **Scenario 1: An invalid record is corrected in the same turn**
  - Given the gate is wired for the host session and a skill writes a governed
    artifact that fails its validator
  - When the host fires its post-tool event for that write
  - Then the agent receives the validator's message and a reproduction command
    before its next step, and can correct the file before the turn ends.

- **Scenario 2: A valid record costs nothing**
  - Given the gate is wired and a skill writes a governed artifact that passes
    its validator
  - When the post-tool event fires
  - Then the agent receives no text, no context is consumed, and the evidence
    record shows a pass.

- **Scenario 3: An ungoverned write is ignored**
  - Given the gate is wired and the agent writes a file no validator owns
  - When the post-tool event fires
  - Then the gate exits without output and without running any validator.

- **Scenario 4: Skills-only mode is unchanged**
  - Given the gate is not wired, or its kill switch is set
  - When the agent writes any governed artifact
  - Then the session behaves exactly as it does today, with no gate output and
    no evidence record.

- **Scenario 5: A broken gate is visible, never a silent pass**
  - Given the gate is wired and its validator cannot run (missing script,
    unsupported Node, unreadable file)
  - When the post-tool event fires for a governed write
  - Then the agent receives a message classified as a runtime failure, distinct
    from a validator verdict, and the evidence record carries that class.

- **Scenario 6: The same behavior on both hosts**
  - Given the gate is wired on Claude Code and on Codex through each host's
    native hook configuration
  - When the same governed write happens on each host
  - Then both sessions receive the same validator message and both evidence
    records carry the same gate identifier, status, and reproduction command.

- **Scenario 7: A gate firing is observable by the evaluation lane**
  - Given an authorized live trial runs with the gate wired
  - When the captured host stream and the gate's evidence record are read
    together
  - Then each gate firing in the evidence record corresponds to a hook record
    in the stream, so a later grader can join the two.

## Requirements

### Functional

- R1: The gate maps the path of a completed write to the validator that owns
  that artifact kind. A path with no owner is out of scope and produces no
  output and no validator run. The owner map is declared in one place and is
  the single source for both hosts.
- R2: The gate reads the host's post-tool event from standard input, extracts
  the written path from the host's tool input, and tolerates an event that
  carries no path by exiting silently. It never prompts, never blocks, and
  never emits a host decision object.
- R3: On a validator failure the gate exits with the code the host documents
  for surfacing text to the model after a completed tool, and writes to
  standard error the gate identifier, the validator's own message, and a
  command that reproduces the verdict from the repository root.
- R4: On a validator pass the gate exits successfully and writes nothing to
  standard output or standard error.
- R5: The gate distinguishes four terminal states and records each: the
  validator failed, the validator passed, the gate could not run its validator,
  and the event was malformed or unsupported. Only the first and third reach
  the model.
- R6: Every firing on a governed path appends one machine-readable line to an
  evidence file that lives outside the repository by default, keyed by the
  host session, carrying the gate identifier, terminal state, path, validator,
  the validator's output, the text surfaced to the model, the reproduction
  command, and a sequence number. An operator may redirect the file; the gate
  never writes it inside the working tree unless told to.
- R7: The gate is opt-in. It is wired by `ad-hooks` as a member of the
  session-lifecycle tier on each host, the installer writes no hook, and one
  documented environment variable disables it without editing configuration.
- R8: The gate script is byte-identical across the Claude Code and Codex skill
  trees; host differences are confined to the hook configuration each host
  reads and to how the written path is extracted from that host's tool input.
- R9: `ad-hooks` documents the gate on both hosts with the same key-facts shape
  it uses for the existing two members, and its Codex text states the Codex
  session-lifecycle surface as the host documents it today.
- R10: A validator that the gate invokes is the same script the skill invokes
  as a step; the gate adds no second implementation and no judgment.

### Non-functional

- The gate's core has offline, credential-free tests that exercise every
  terminal state through the script's public interface, and those tests run
  inside `npm test` on the supported Node.js and operating-system matrix.
- A governed write on a repository of the kit's own size returns the gate's
  verdict inside the host's default post-tool hook timeout, measured on the
  pilot and recorded with the evidence.
- The evidence file contains no credentials and is not tracked; the capture
  privacy rule of the live lane applies to it.
- Skill sources, installed dogfood copies, and host trees remain equivalent
  where the installer contract requires it.

## Success Criteria

- An offline test feeds the gate a post-tool event for an invalid governed
  artifact and observes the documented exit code, the validator's message and a
  reproduction command on standard error, and an evidence line with the failed
  state.
- An offline test feeds a valid governed artifact and observes a successful
  exit, empty output, and an evidence line with the passed state.
- An offline test feeds an ungoverned path, a malformed event, and an event
  with no path, and observes a silent successful exit for each.
- An offline test removes or breaks the owning validator and observes a
  surfaced message classified as a runtime failure, not a verdict.
- With the kill switch set, every test above observes a silent successful exit
  and no evidence line.
- The parity test proves the gate script is byte-identical across both host
  skill trees.
- One authorized live trial on Claude Code with the gate wired captures a hook
  record in the stream for a governed write and an evidence line that names the
  same firing; the same is recorded for Codex once the operator's Codex CLI can
  run a trial.
- The complete local gate, dual-host parity checks, dogfood refresh, fresh
  two-axis review, and package dry run pass with the gate included, and the
  skills-only mode test suite is unchanged.

## Edge Cases

- The host event names a tool that edits many files in one call, or a tool the
  owner map does not recognize.
- The written path is relative, absolute, outside the repository, or a symlink
  that escapes it.
- The file was written and then removed before the hook ran.
- The validator exits non-zero without a message, or prints its verdict on
  standard output rather than standard error.
- The validator itself is slow enough to approach the host's hook timeout.
- Two governed writes fire in the same turn and their evidence lines must stay
  ordered.
- The evidence directory is unwritable.
- The gate is wired in both the user scope and the project scope of one host
  and fires twice for one write.
- Codex delivers the write as a patch payload rather than a path argument.
- The host runs under Claude Code Desktop, where the shell environment is only
  partially inherited.

## Out of Scope

Blocking any tool call, a `PreToolUse` guard of any kind, a `Stop`-based
repair loop, extending the evaluation receipt schema with a gate event kind,
grading a gate's evidence in the corpus lane, a second governed artifact family
beyond the validators the kit already ships, the Codex App Server, the Claude
Agent SDK, and any hosted or daemon component are not part of this feature.

## Open Questions

- **Codex path extraction.** Codex's write tool delivers a patch payload; the
  gate needs a deterministic way to recover the written paths from it. Settled
  by the four-source pass before code.
- **Which validator governs a research study.** `validate-record.mjs` was
  written for ground receipts; whether it also owns the `RESEARCH-` study shape
  or a study needs its own check is settled before the owner map is declared.
- **Evidence line to receipt trial event.** The evidence line is designed to be
  joinable with a captured stream; whether it becomes a receipt event kind or
  stays a sidecar is a follow-up decision in the evaluation harness, not here.

## Related

- Product scope: `doc/product/PRD.md`, Next tier: Optional runtime layer of
  deterministic host hooks
- Evidence: `doc/research/0026-runtime-layer-deterministic-host-hooks.md`
- ADRs: `doc/adr/0055-session-lifecycle-handoff-nudge-hook.md`,
  `doc/adr/0057-skills-deterministic-steps-as-scripts.md`,
  `doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md`,
  `doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md`
- Tasks: `doc/tasks/0083-ship-the-artifact-validator-feedback-gate.md`
- Depends on: `doc/specs/0007-evaluate-skill-trajectories.md` for the live
  lane that measures the gate
