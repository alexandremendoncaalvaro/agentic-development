# ADR-0083: Bound the runtime layer to feedback gates on native host hooks

**Status:** proposed
**Date:** 2026-09-21
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0055 — its Codex-out-of-scope stanza only: the record deferred Codex because context-injection parity was undocumented and named its documentation as the revisit trigger; Codex now documents lifecycle hooks with that parity, so the session-lifecycle tier extends to Codex. The `Stop` nudge mechanism and its non-looping contract are unchanged.
**Amends:** ADR-0074 — its Codex-out-of-scope stanza only, on the same trigger. The static, exit-0, kill-switch decisions and the rejection of blocking as coercion are unchanged.

## Context

The kit is a skill kit: skills and rules are advisory, the host owns the agent
loop, and the kit's deterministic pieces reach the agent as a skill step, a
git hook, or `npm test`. The owner's brief of 2026-09-21 proposed an optional
runtime layer that would move a bounded set of mechanically checkable
invariants into the hosts' lifecycle hooks, feed failures back to the agent,
and record evidence the evaluation harness can grade. RESEARCH-0026 graded
the brief and concluded Conditional: the ingredients exist, the gap is the
wiring, and three questions need a decision before the first line of code.

The first is where the layer stops. Both hosts document hooks that can deny a
tool call before it runs, return text after it ran, and keep a turn alive
after the model tries to stop. Each of those is a different relationship
between the kit and the user. ADR-0074 already rejected blocking the session
as coercion, ADR-0047 recorded review-until-clean loops as non-converging, and
the `ad-hooks` skill debuts every novel gate warn-only. A layer that starts
with the strongest mechanism would contradict all three.

The second is how many hosts. The brief assumed Codex could only be reached
later, through the Codex App Server. That is stale: Codex ships native hooks,
enabled by default, with the same event vocabulary and blocking model as
Claude Code, and OpenAI documents the App Server as experimental and
unsupported for production. ADR-0055 and ADR-0074 both scoped the
session-lifecycle tier to Claude Code because Codex parity was undocumented,
and both named its documentation as their revisit trigger. That trigger has
fired.

The third is what a gate leaves behind. The first live pilot showed that hook
firings appear in a captured Claude Code stream, that the receipt schema has
no field for a gate verdict, and that a live capture carries the operator's
configuration and therefore stays outside the tree by default. A gate's
evidence has to be designed with the same facts in view.

Numbering: this record takes 0083 rather than the directory's next slot
because the unmerged `feat/live-evaluation-lane` branch already holds
ADR-0082; a collision at merge is a worse defect than a gap that the branch's
landing closes.

## Decision

We will build the runtime layer as a set of **feedback gates on the hosts'
native lifecycle hooks**, bounded as follows.

1. **Feedback first.** A gate runs an existing deterministic validator after a
   tool call completes and returns the validator's own message to the model.
   It never blocks a tool call, never emits a host decision object, and never
   keeps a turn alive. A blocking guard or a repair loop is a later gate, each
   behind its own ADR that names ADR-0047, ADR-0055, and ADR-0074 as the
   decisions it qualifies and carries a measured convergence or false-block
   rate from the pilot.
2. **Both hosts through native hooks, one core.** Each gate is one Node script,
   byte-identical across the Claude Code and Codex skill trees, that reads the
   host event from standard input and writes to standard error and an exit
   code. Host differences live in the hook configuration each host reads and
   in how the written path is recovered from that host's tool input. The
   Codex App Server and the Claude Agent SDK are not integration surfaces for
   gates.
3. **No judgment in a gate.** A gate invokes the same script a skill invokes
   as a step and adds nothing. Where a verdict needs interpretation, the gate
   does not exist and the skill text remains the mechanism, per ADR-0057.
4. **Evidence outside the tree, joinable with the stream.** Every firing on a
   governed path appends one machine-readable line to a file under the OS
   temporary directory, keyed by host session, carrying the gate identifier,
   terminal state, path, validator output, the text surfaced to the model, a
   reproduction command, and a sequence number. An operator may redirect it;
   a gate never writes inside the working tree unless told to. The line is
   designed to be joined with the hook records the live lane captures;
   whether it becomes a receipt event kind is the evaluation harness's
   decision, not this one.
5. **Four terminal states, two of them surfaced.** A gate distinguishes
   validator failed, validator passed, gate could not run, and event malformed
   or unsupported. The first and third reach the model; all four reach the
   evidence file. A gate that cannot run never reports a pass.
6. **Opt-in, owned by `ad-hooks`.** A gate is a member of the `ad-hooks`
   session-lifecycle tier on both hosts. The installer writes no hook. One
   documented environment variable disables each gate. Skills-only remains a
   valid configuration and its behavior is unchanged when a gate is absent.
7. **One gate at a time, measured.** The first gate is the artifact-validator
   gate of Spec 0008. A second gate is proposed only after the first has run
   on the live lane with a recorded on-versus-off comparison, and the brief's
   stop criteria (hooks already sufficient, native experience degraded, no
   measurable gain, complexity over gain, cross-host duplication) are checked
   in that proposal.

## Consequences

Positive:

- The kit gains a deterministic delivery path for its validators without
  changing who owns the agent loop, which is the split ADR-0074 already named
  as correct.
- One script per gate serves both hosts, so the kit's byte-parity discipline
  holds and the Codex tree stops carrying hook scripts as dead weight.
- The evidence line gives the evaluation harness a measurable signal for the
  layer's value before any second gate is argued for.
- The App Server and the Agent SDK leave the plan, which removes an
  experimental dependency and a proprietary one.

Negative / trade-offs:

- A feedback gate cannot prevent the write it reports; an invalid artifact
  exists on disk until the agent corrects it. Accepted: the commit-time gates
  remain the backstop, and preventing the write is the blocking-guard
  decision this record defers.
- The Codex half is designable now but not measurable in the owner's current
  environment, because the operator's Codex CLI refuses the account's models.
  Accepted: the Codex hook wiring ships with offline tests and its live
  measurement waits on a toolchain upgrade that is the owner's call.
- Two gates in two host scopes can fire twice for one write. Accepted for the
  first gate; the evidence file makes the duplication visible.
- Evidence outside the tree is not reviewable from a diff. Accepted for the
  same reason the live lane accepted it: the line may quote operator paths.

Revisit trigger: a host removes the post-tool feedback path, or the pilot's
on-versus-off comparison shows the first gate surfaces nothing.

## Alternatives Considered

* **Start with a `PreToolUse` deny guard** (for example, refusing `--no-verify`)
  because it is the cheapest deterministic invariant. Rejected as the first
  gate: it exercises no feedback and no evidence path, and a blocking debut
  contradicts the advisory-first rule until a false-block rate is measured.
  It is the natural second gate.
* **A `Stop`-hook verify-repair loop** as the brief's headline capability.
  Deferred, not rejected: the mechanism and its loop guard are documented on
  both hosts, but ADR-0047 and ADR-0074 weigh against it until a deterministic
  failure is shown to converge on the pilot.
* **Codex through the App Server.** Rejected: experimental and unsupported for
  production per OpenAI, and unnecessary once native Codex hooks exist.
* **Claude Code through the Agent SDK.** Rejected: a proprietary dependency the
  harness decision (ADR-0080) already declined, and unnecessary for a gate.
* **Extend the receipt schema now** so a gate writes receipt events directly.
  Rejected here: that is an evaluation-harness decision with its own review;
  the evidence line is designed to be joinable so the extension can follow.
* **Evidence inside `.agentic/`** in the working tree. Rejected: the pilot
  showed live captures carry operator configuration, and the same applies to
  validator output that quotes paths.
* **A daemon, database, or hosted component.** Rejected by the brief and by
  the PRD's non-goals; nothing in the first gate needs process state beyond a
  file.
