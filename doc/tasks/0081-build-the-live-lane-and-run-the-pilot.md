# Task `0081`: Build the live lane and run the authorized pilot

**Status:** in-progress
**Created:** 2026-09-21
**Scope ref:** doc/specs/0007-evaluate-skill-trajectories.md
**Evidence ref:** doc/research/0025-ground-host-stream-adapters.md; doc/adr/0082-capture-live-trials-through-a-supplied-runner.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0007-evaluate-skill-trajectories.md
**Board ref:**

## Context

Task 0048 built the replay lane, the graders, the corpus gate, and the host
stream adapters, and closed. The adapters read a stream; nothing in `eval/`
produces one. The owner authorized the live pilot, and the authorization
surfaced that the pilot is not a switch: Spec 0007 R7's live lane has to exist
before a pilot can run.

The pilot is what retires the two mitigations GROUND-0025 left Conditional.
Both are readings of host behavior taken from documentation rather than
observation, and both are in the adapters today, so a wrong reading is already
shipped code.

## Acceptance Criteria

- [x] `node eval/run.mjs live` accepts the host invocation as an explicit argument, refuses to run without it, and never searches for a binary or reads a credential source, per ADR-0082 decision 1.
- [x] The receipt's frozen host version is read from the running binary rather than supplied by the operator, per ADR-0082 decision 2.
- [x] Each trial runs in its own process over its own copy of the fixture, so one trial's writes are invisible to the next.
- [x] A captured stream and its receipt are written only after both pass the repository's existing leak-guard denylist; a match aborts the run and writes nothing.
- [x] A host that exits non-zero, refuses an action, or ends without a terminal yields a trial with a failure exit state and its reason, and the receipt is still written; the harness aborts only on its own defects.
- [ ] A produced live receipt validates against the existing contract, grades through the existing graders, and goes stale by the existing rule when a frozen input changes.
- [~] The pilot runs on both hosts and answers GROUND-0025's two Conditional mappings with observed evidence: whether an implicit Codex activation is recognizable from a `SKILL.md` read, and whether the hosts' declined and denied records appear where the grant-from-policy rule expects.
- [x] GROUND-0025 and ADR-0080 record the pilot's answer for each mapping, upgrading, qualifying, or reversing it with the observation that settled it.

## Plan

- [x] Land this task and ADR-0082 in their own commit, ahead of any implementation, per CV.7.
- [x] Implement the live lane test-first: the argument contract and its refusals, the version probe, trial isolation, the leak gate, the failure terminals, then the receipt write.
- [x] Run the pilot at the smallest scale that answers both questions, expanding only if an answer is ambiguous.
- [ ] Record the pilot's findings, then fresh-context review both axes before the pull request.

## Notes

### 2026-09-21 — Opened on the owner's authorization

The owner authorized the pilot without knowing the lane did not exist; that was
stated back before any work began. Scale is chosen against cost rather than
thoroughness, because every trial is a real model invocation billed to the
owner: two hosts, the smallest case that exercises each question, one trial
each to start. Repeated trials are a variance measurement and are not what
either open question needs.

### 2026-09-21 — The lane, the pilot, and what it found

The lane landed test-first in twelve behaviors, and the pilot ran one trial on
Claude Code. GROUND-0025's 2026-09-21 addendum carries the full findings and
their limitations; the short version is three results, two of them uncomfortable.

The grant-and-denial mapping is **confirmed on observation**: ten
`system/permission_denied` records became ten `approval_denied` events, and the
denied attempts did not also count as commands.

The implicit-activation mapping is **reversed, and wider than this repository
assumed**. Claude Code had `Skill` available and did not use it; it read the
`SKILL.md` and followed the skill. The adapter scored `skill_invoked: 0` on a
trial the skill demonstrably routed, which is a false negative in merged code
affecting every model-invocable case. It is task-0082, held out of here on
purpose: it changes how existing cases grade, which deserves its own design and
review rather than riding along in the branch that found it.

The third result is against code written in this branch. ADR-0082 decision 4
originally gated a capture on the repository's `leak-guard` denylist. The pilot
showed that gate is empty by construction — `.agentic/leak-denylist.txt` is
machine-local and gitignored, so a fresh clone has no patterns at all — and that
what a live capture actually carries is not credential shapes but the operator's
configuration: this one held twenty-four references to an unrelated employer's
internal agent names and five absolute paths inside the operator's home
directory. Nothing in it was secret; none of it belongs in this repository. The
decision now defaults a capture to the OS temporary directory and keeps the
denylist as a second line, and the captured stream is deliberately not tracked.
That is why the ADR was edited rather than amended: it is still `proposed`, so
it is a draft, and the pilot is the evidence its draft was wrong.

The Codex leg did not run. `codex-cli 0.139.0` refuses the account's default
model as requiring a newer CLI, and refuses `gpt-5-codex` as unsupported for a
ChatGPT account. That is the operator's toolchain, not this repository, and
upgrading it is the owner's call, so the criterion is marked partial rather than
done and Codex's two mappings stay Conditional and unmeasured.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
