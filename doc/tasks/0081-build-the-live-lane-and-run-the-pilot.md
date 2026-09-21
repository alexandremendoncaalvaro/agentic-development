# Task `0081`: Build the live lane and run the authorized pilot

**Status:** done
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
- [x] A produced live receipt validates against the existing contract, grades through the existing graders, and goes stale by the existing rule when a frozen input changes.
- [~] The pilot runs on both hosts and answers GROUND-0025's two Conditional mappings with observed evidence: whether an implicit Codex activation is recognizable from a `SKILL.md` read, and whether the hosts' declined and denied records appear where the grant-from-policy rule expects.
- [x] GROUND-0025 and ADR-0080 record the pilot's answer for each mapping, upgrading, qualifying, or reversing it with the observation that settled it.

## Plan

- [x] Land this task and ADR-0082 in their own commit, ahead of any implementation, per CV.7.
- [x] Implement the live lane test-first: the argument contract and its refusals, the version probe, trial isolation, the leak gate, the failure terminals, then the receipt write.
- [x] Run the pilot at the smallest scale that answers both questions, expanding only if an answer is ambiguous.
- [x] Record the pilot's findings, then fresh-context review both axes before the pull request.

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

### 2026-09-21 — Fresh-context review, Spec axis: one blocker, three concerns, all accepted

The blocker was the same defect this branch had just criticized elsewhere, now
in its own code. `buildLiveReceipt` filled four of Spec 0007 R5's frozen inputs
with literals: `model` from an environment variable or the string `unrecorded`,
`tools` as an empty array, `permissions` as `operator-supplied`, and
`context_policy` as `bare`. The pilot's own addendum proves the last one false —
the host had twenty-nine tools and the operator's global configuration loaded —
so the harness would have written a receipt asserting a bare context it had
measured to be anything but. A frozen input the harness types is a claim, which
is the standard ADR-0082 decision 2 sets and this code broke.

The fix is `observeEnvironment`: every one of the four is read from the stream,
and a field the host never reported is `null` and named in `unmeasured` rather
than given a plausible value. Claude Code reports tools and permission mode in
its `system/init` record and the model in its assistant messages; when that
record also lists the operator's own commands, subagents, or servers, the
context policy is recorded as `host-configured`, not `bare`. Codex reports none
of it, so a Codex receipt now says so in the open.

The second concern was an auditability claim ADR-0082 made that the code did not
keep: the record said the receipt names each capture's digest, and no digest
existed. The receipt now freezes one per trial under `frozen.captures`.

The third was an acceptance criterion left unchecked with no reason. It is now
satisfied rather than explained: a produced receipt is run through the real
`validateReceipt` and the real `route` and `approval` graders in a test, so the
live lane is provably not a parallel pipeline.

The fourth was that the criterion naming ADR-0080 was checked while ADR-0080 was
never touched, and its item 10 still promised the pilot's captures would replace
the synthetic samples as tracked artifacts — which ADR-0082 reverses. ADR-0080
now carries a dated addendum retiring that sentence and recording both mappings'
outcomes, and `doc/adr/PROJECTION.md` gains its row in the same commit.

One limitation the reviewer named is not fixable here and is stated instead: the
pilot's counts come from a capture that is deliberately untracked, so a second
party cannot re-derive them without re-running the pilot. The receipt's capture
digest makes the claim checkable by whoever holds the capture, which is the most
that the privacy decision and auditability can both have.

### 2026-09-21 — Fresh-context review, Standards axis: two blockers, two concerns, all accepted

The first blocker is the kind a fresh reader finds and an author cannot. The
frozen skill digest was taken over `SKILL.md` alone, while `claimFor` in the
replay lane recomputes it over the skill's whole directory using a different
digest scheme entirely. The two can never agree, so **every live receipt this
code produced would have been reported stale on its first replay**, and Spec
0007 R8's staleness rule would have fired on receipts nothing had invalidated.
`skillIdentity` now digests the directory, and a regression test asserts the two
computations return the same hash rather than trusting that they do.

The second blocker is a document made false by this change. `ARCHITECTURE.md`
enumerates every `eval/` module and every test file by name, and its boundary
rule stated that exactly **one** cross-tree import exists from `src/` into
repo-only tooling. This branch added a second — `loadDenylist` from
`src/leak-guard.js` — and named neither it, nor `lib/live.mjs`, nor the `live`
subcommand, nor `test/eval-live.test.js`. All four are now named, the boundary
sentence describes both imports and why each exists, and `AGENTS.md`'s map
carries the subcommand with the note that it gates nothing.

The first concern is a defect the pilot never exercised, because the pilot
invoked the CLI directly rather than through `runLive`. The runner appended the
request as the last argument, after every operator flag; the pilot's own
documented invocation ends in `--disallowedTools Write Edit`, and appending a
prompt after a variadic flag feeds it to that flag instead of to the model. The
runner now requires a `{request}` placeholder and refuses an invocation without
one, so the operator says where the prompt goes and a silent swallow is not
reachable.

The second concern: the trial-isolation test used the real filesystem, a
hardcoded POSIX path, and no cleanup — the reviewer ran it and found the
directories it left behind on this machine, and the assertion would fail on
Windows, which ADR-0080 names as the measurement of exactly this family of
code. It now injects the copy and the directory creation and asserts the plan
rather than the filesystem.

One note is recorded rather than acted on: `GUIDELINES.md` §12.5 bans spawning
with user-controlled arguments, and the live lane does precisely that by design
under Spec 0007 R7. The section reads as governing the shipped `src/` CLI, and
`eval/` is repo-only, so the rule is very likely out of scope — but the text does
not say so, and a one-line scope clarification belongs to whoever next edits
that section rather than to this branch.

A process failure of my own, which the reviewer caught and reported as a
possible concurrent session: the working tree changed under it mid-review,
because I applied the Spec axis's fixes while the Standards axis was still
reading. The reviewer anchored to the static diff and an isolated worktree at
the reviewed commit, so its findings hold, but the lesson is the review's and
not the reviewer's: apply one axis's findings only after both axes have
reported, or re-diff and re-review.

### 2026-09-21 — Re-review after remediation: five concerns, no blockers, all applied

The re-review ran against a quiescent tree, which is what the previous round
could not have. It confirmed by direct execution that the three substantive
remediations hold — the two skill digests agree, the placeholder substitution is
total, the environment observation is honest — and then found that two of the
things meant to *keep* them holding did not.

The regression test for the digest was tautological. It re-derived
`freezeArtifact` on the same path `skillIdentity` hashes internally, so it
asserted a thing true by construction and would not have noticed the replay lane
drifting. It now builds a receipt through the real `skillIdentity` and
`buildLiveReceipt` and runs it through `evaluateReplay`, asserting the claim the
staleness rule actually computes. Proved non-vacuous the only way that counts:
the old defect was reintroduced, the test failed, and it passed again once the
defect was removed.

The boundary validator never looked at any of the live environment fields this
branch added. A receipt could declare `context_policy: 'bare'` while also naming
`context_policy` unmeasured, or carry a capture digest that was not a digest, and
`validateReceipt` accepted it — in the one module ADR-0080 item 6 names as the
boundary. The validator now requires each of the four fields to be either
measured and well formed or `null` and named in `unmeasured`, never both and
never neither, and requires one well-formed digest per capture. The shared live
receipt fixture in `test/eval-harness.test.js` was updated to satisfy the
contract it claims, which is the honest consequence of the contract changing.

Three document concerns, all applied. `ARCHITECTURE.md`'s boundary sentence
claimed a dual-host byte-parity test pins the cross-tree import; that is true of
`freezeArtifact` and false of `src/leak-guard.js`, which has no per-host copy and
which no parity test scans, so the sentence now describes each import's actual
guard. The same file cited ADR-0082 as a recorded decision while ADR-0082 is
`proposed`, which no other ADR citation in that document does; it now reads
"proposed ... binding once accepted", the phrasing this repository already uses
for a decision awaiting the owner. And `doc/adr/PROJECTION.md`'s enumeration of
self-amendments still named two records after this branch made ADR-0080 a third.

### 2026-09-21 — The Windows leg failed, and it was a production defect

The pull request's matrix went red on both Windows legs while both Ubuntu legs
passed. Two tests of `resolveCaptureDir` used POSIX path literals, which is the
shallow reading; underneath them the function itself decided repository
containment with a hardcoded `/` separator, so on Windows a capture written
*inside* the repository would have been reported as outside and the
`inRepository` flag — the thing that marks a capture as having left the private
default — would have been silently wrong on the one platform this repository
runs CI on precisely to catch that.

Containment is now decided by `relative` plus `isAbsolute`, which carries no
separator assumption. Verified by running both the old and the new logic under
`node:path`'s `win32` semantics: the old one answered `false` for
`C:\repo` plus `eval\receipts`, the new one answers `true` there and `false`
for a sibling directory and for a `..` escape. The tests now build their paths
with the platform's own joiner and assert equality against it rather than a
prefix, and a third case pins the outside-the-repository answer.

This is the local gate gap WORKFLOW §11 describes: the gate was closed here
rather than iterated against red CI, and the defect was a real one the Windows
leg existed to find.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
