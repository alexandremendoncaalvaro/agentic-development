# ADR-0089: Check workflow receipts before landing and outward actions, in shadow first

**Status:** accepted
**Date:** 2026-10-07
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0083, decisions 1 and 7, for receipt gates only: a receipt gate may run before a tool call, and may be proposed while the artifact-validator gate stays the only feedback gate. Every other ADR-0083 decision binds it unchanged.
**Related:** ADR-0047, ADR-0055, ADR-0074 (the decisions a blocking guard must name); ADR-0072 (digest-bound approval precedent); ADR-0088 (the band may display the result)

## Context

RESEARCH-0037 found that the owner's most repeated correction is a check made
just before approving a pull request, a merge or a publication: "did you run
the review, the audit, the publish pipeline?". It matches in 28 of 52
sessions, the most of any gateable theme (a regex upper bound). Nothing in the kit can answer that question for the exact code
state or text about to land. `ad-audit` already writes the audited SHA,
`ad-review` does not, the local gate run leaves no receipt, and `ad-publish`
shows its approval receipt only in chat.

ADR-0083 bounds the runtime layer to post-tool feedback gates that run an
existing validator (decision 1), one measured gate at a time (decision 7), and
Task 0084's measurement supported declining a second validator gate. A receipt
gate is a different class: it runs before the action, checks only that a
receipt exists and is fresh for the current state, and validates no content.
Both hosts can run a script before a tool call (RESEARCH-0037 E4). Prior art
keys approval to the exact state and requires every deny to carry its fix
(E5). A gate that sends the agent back to ask the owner would add stalls, the
owner's second complaint (E6).

## Decision

We will add **receipt gates** that check the owner's required workflow steps
before landing and outward actions, starting in shadow mode.

1. **Receipts first.** Four steps leave a machine-readable receipt keyed to
   what they covered: `ad-review` adds the reviewed target SHA to its verdicts
   file; `ad-audit` adds one summary file per audit with the target SHA and
   each finding's disposition; a gate-run wrapper records the commit SHA, the
   command and its exit code; `ad-publish` records the destination, the
   SHA-256 of the approved normalized body and the approval time. Receipts are
   local working copies under `.agentic/`; the durable record stays the
   tracked task Notes or pull request body (rule CV.5).
2. **One gate script, both hosts, before the action.** `sequence-gate.mjs`,
   byte-identical in both `ad-hooks` trees, runs on `PreToolUse` and checks:
   a review and an audit receipt for `HEAD` before `gh pr create`, `gh pr
   ready` and `gh pr merge`; a gate-run receipt with exit 0 for `HEAD` before
   `git push` and `gh pr create`; a publish receipt whose hash equals the
   outgoing body before a pull request or issue comment and a chat send.
3. **Freshness.** A commit receipt is fresh when its SHA is `HEAD`, or when
   every path changed since it is on the repository's receipt-neutral list in
   `.agentic/gates.json` (default: `doc/tasks/**`). A text receipt is fresh
   only for the identical normalized body.
4. **Shadow mode is the only mode this decision ships.** The gate always
   exits 0 and emits no decision object. On a missing or stale receipt it
   appends a "would block" line to the ADR-0083 evidence file, naming the
   action, the SHA or body hash, the missing receipts and the command that
   would produce each. Nothing reaches the model or the owner. `AD_SEQUENCE_GATE=0`
   disables it.
5. **No judgment.** The gate never checks whether a review was good, whether
   grounding was needed, or whether a question was warranted (ADR-0083
   decision 3).
6. **Flip criterion, preregistered.** The owner set it on 2026-10-07, before
   any shadow run, as a design choice: per check, at least 20 labelled
   would-block events, at most one false block among them, within a window of
   at most four weeks. A check that does not reach 20 events in the window
   stays in shadow. A would-block event is labelled true when the receipt was
   really missing for that state. Enforcing a check is a later ADR that cites
   its measured rate against this criterion, names ADR-0047, ADR-0055 and
   ADR-0074, and specifies a deny message that carries the fix and an override
   the agent cannot forge.
7. **Per-repository requirements.** `.agentic/gates.json` names which checks
   apply. In a repository whose review is done by a review bot or harness, a
   review receipt may be that evidence on the head SHA, read by a local
   command within the hook's time budget; where that read is not possible, the
   check is off for that repository.

## Consequences

Positive:

- The owner's most repeated pre-approval question gets a deterministic answer
  per state, without the owner asking.
- Shadow mode measures the false-block rate before anything can stall a
  session.
- The receipts are useful without the gate: `ad-merge`, the owner and the
  band (Task 0106) can read them.

Negative / trade-offs:

- Four skills and the gate-run wrapper change before the gate has value.
  Accepted: each is a small, contract-tested slice.
- Amends and docs-only commits after a review will produce would-block lines
  until the receipt-neutral list is tuned. Accepted: measuring that is the
  purpose of the shadow run.
- The Codex leg ships with offline tests only; live measurement waits on the
  operator's Codex CLI, as ADR-0083 records.
- A shell command can post text or push in ways the gate's matching misses.
  Accepted for shadow; the enforcement ADR must state its coverage.

Revisit trigger: a shadow window in which most of the owner's pre-approval
checks have no preceding would-block event, or a check whose false-block rate
exceeds the preset threshold.

## Alternatives Considered

- **Stay advisory** (skills and the ADR-0074 checkpoint) — rejected as the
  answer: the prompt-time checkpoint cannot tell whether a step ran for this
  SHA, and the measured reminder persists with it in place.
- **Enforce from the start** — rejected: no false-block rate is measured, and
  a wrong deny adds the stall the owner already complains about.
- **Gate judgment steps** (grounding adequacy, question discipline) —
  rejected: not deterministic; 35 of 35 structured questions already pass the
  only format check available.
- **A Claude Code mod as the gate** — rejected: Claude-Code-only, against
  ADR-0088 item 3. The band may display the result; the gate stays a hook.
- **Amend ADR-0083 in place** — rejected: its decisions bind the validator
  gate; a separate record keeps the new class and its flip criterion visible.
