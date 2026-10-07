# ADR-0089: Check workflow receipts before landing and outward actions, in shadow first

**Status:** accepted
**Date:** 2026-10-07
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0083, decisions 1 and 7, decision 3's validator clause and decision 5's every-state-is-recorded clause, for receipt gates only: a receipt gate may run before a tool call, may be proposed while the artifact-validator gate stays the only feedback gate, checks a receipt's existence and freshness instead of invoking a skill's validator, and may lose an evidence line it cannot write (second addendum). Every other ADR-0083 decision binds it unchanged.
**Related:** ADR-0047, ADR-0055, ADR-0074 (the decisions a blocking guard must name); ADR-0072 (digest-bound approval precedent); ADR-0088 (the band may display the result)

## Context

RESEARCH-0037 found that the owner's most repeated correction is a check made
just before approving a pull request, a merge or a publication: "did you run
the review, the audit, the publish pipeline?". In an exploratory count over the owner's private transcripts it was the most frequent gateable theme; the decision rests on the owner's stated need and on the shadow run, not on that count. Nothing in the kit can answer that question for the exact code
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
   tracked task Notes or pull request body.
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

## Addendum 2026-10-07: what the first slice keys and logs

Task 0107 refined two details, within decision 1's rule that a receipt is
keyed to what it covered. The gate-run receipt is keyed to the git tree of the
working copy, with the commit SHA kept for display: the CI-mirror command runs
before the commit that lands the tested change, so that commit's tree, not its
SHA, is what the run covered (GROUND-0038). Freshness in decision 3 is
therefore "its tree is `HEAD^{tree}`, or only receipt-neutral paths differ".
The evidence file also records `clear` and `runtime-unavailable` lines, so
coverage can be measured; the false-block count of decision 6 is taken over
`would-block` lines only.

## Addendum 2026-10-07: evidence file, lost lines, and decision 3

From the audit of the first slice. The receipt gate writes its own evidence
file, `<tmpdir>/agentic-sequence-gate/<session_id>.jsonl`, with its own
sequence numbers, beside the artifact gate's rather than inside it (decision
4 said "the ADR-0083 evidence file"). Each line counts the receipts it could
not read. If the evidence file cannot be written, shadow mode loses that line
and still exits 0: it never reports a pass, and a lost line can only lower the
counts decision 6 reads, which the shadow read-out (Task 0110) states as a
limit. ADR-0083 decision 3 binds receipt gates in its no-judgment clause; its
clause that a gate invokes the validator a skill invokes does not apply, since
a receipt gate checks existence and freshness only, so the amendment header
now names that clause.

## Addendum 2026-10-07: review and audit receipts

From Task 0108 and its audit. Decision 3's commit receipts are compared by
tree, as the first addendum does for the gate-run receipt: the review or
audit SHA is resolved to its tree, so a commit reworded or amended without a
code change keeps its review and audit (GROUND-0040 E2), the rule GitHub and
Gerrit apply to approvals. `.agentic/reviews/` joins `.agentic/receipts/` as
always receipt-neutral, for every check, so a committed review or audit file
never makes the receipts stale. Decision 7's bot-review read is a command in
`.agentic/gates.json`, an argument list run without a shell within at most 20
seconds, for the review only. It runs a program the repository names, as the
repository's own hook configuration already does, and this addendum records
it as the exception to GUIDELINES 12.5's fixed argument lists. When that read
times out or its setting is invalid, the check logs `runtime-unavailable`
instead of switching off, so a broken read is counted rather than hidden;
switching it off stays `"review": false`. A chained command runs each check
once, logged against the first landing action that needs it. `gh pr ready
<n>` and `gh pr merge <n>` are compared with the local `HEAD`, and each check
reads only the newest 20 receipt files; Task 0110 labels the events both
limits can produce.

With the addenda above, three phrases no longer bind as written: decision 3's
"when its SHA is `HEAD`" (a receipt is fresh by tree), decision 4's "the
ADR-0083 evidence file" (the gate writes its own), and decision 7's "the
check is off for that repository" (an impossible read logs
`runtime-unavailable`). Everything else in those decisions binds.

## Addendum 2026-10-07: publish receipt and GitHub CLI wrappers

From Task 0109 and its review. The publish receipt holds the SHA-256 of the
approved body normalized to LF line endings without trailing whitespace or
trailing newlines; `ad-publish` records it through `ad-hooks`'
`publish-receipt.mjs` and posts from the same file (GROUND-0041). A body the
gate cannot read before the command runs (a shell expansion, standard input,
an editor, a path resolved after a `cd` or under `~`, a non-regular or
oversized file) logs `runtime-unavailable`. Decision 2's "chat send" is, in
this slice, the Slack connector's `slack_send_message`; another chat tool
logs nothing until it is added. That is a coverage limit of this slice, not
a retirement: decision 2 binds unchanged. The Slack hook rests on both hosts'
documentation and simulated events; a live send has not been observed. `githubCommands` in `.agentic/gates.json`
names the wrappers a repository runs `gh` under, for every pull request and
comment check; this repository sets `gh` and `ghp`, so Task 0110's shadow
window starts after this slice merges.

