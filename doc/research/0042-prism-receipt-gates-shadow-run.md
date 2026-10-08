# PRISM-0042: Shadow run of the receipt gates

**Status:** recorded
**Decision ref:** doc/tasks/0110-run-the-receipt-gates-in-shadow.md

## Decision

For each receipt-gate check of ADR-0089 (gate-run, review, audit, publish), choose one disposition at the end of the shadow window: propose enforcement (a later ADR), keep in shadow, or remove.

## Objective

Measure, for each check, whether its would-block events are true (the receipt really was missing for that state) and whether they precede the owner's own pre-approval questions, so that enforcement is proposed only for checks that would answer the owner's repeated reminder without adding false blocks or stalls (RESEARCH-0037, deciding criterion). The window starts at the final freeze of this plan and lasts four weeks; events logged before the final freeze are excluded and listed.

## Evaluation question

Per check, over the window: how many distinct would-block events occur, how many of them are false, and what share of the owner's pre-approval questions about that check were preceded by a would-block event for the same state?

## Claim

Fit for use, per check: a check that reaches the owner's volume with at most one false block, and whose would-block events do not miss most of the owner's matching questions when such questions occur, is fit to be proposed for enforcement in the repositories and on the host where it was measured. It is not a claim of superiority over advisory skills, does not cover Codex sessions, and does not establish how agents behave when a gate denies.

## Evidence

- Would-block events, each labelled true or false against the receipts and the state it named (primary).
- The owner's typed pre-approval questions in the window, each matched to the checks it asks about (secondary, the RESEARCH-0037 hypothesis).
- Guardrails: stalled sessions, `runtime-unavailable` lines, `unreadable_receipts` counts, and lines the gate could not write (ADR-0089 second addendum).

## Tasks

- Normal work during the window in this repository (gate wired as committed at 3671059: `.claude/settings.json`, `.codex/hooks.json`, `.agentic/gates.json` naming `gh` and `ghp`) and in the company repository, bl-platform. There the gate runs machine-locally, with nothing committed to that repository: a `PreToolUse` entry in the owner's `~/.claude/settings.json` (Bash and the Slack send tool) runs `~/.agentic/gates/bl-platform-shadow.mjs`, which calls a copy of the gate pinned at 3671059 (`~/.agentic/gates/3671059/`, byte-identical to the merged source) only for sessions under the owner's bl-platform checkout, worktrees and workspaces (SHA-256 prefixes: wrapper `94e2c453c9ae0b60`, `sequence-gate.mjs` `bbe7fd59349d2ba6`, `gate-run.mjs` `626e30fd66d269d0`, `publish-receipt.mjs` `0d9976d06fa73bef`, `review-receipts.mjs` `6abdbf19cbcdc079`, `artifact-gate.mjs` `87f975c6b6973d11`). In bl-platform the installed kit is the published release, which records no gate-run, review, audit or publish receipt, so every check there would read would-block by construction: bl-platform events are reported, and enter the decision only from the date a kit that records the receipts is installed at user scope there, which the Notes record.
- Retention: `AD_SEQUENCE_GATE_EVIDENCE_DIR` is set in the owner's `~/.claude/settings.json` to `~/.agentic/evidence/sequence-gate/`; one test event through the wrapper from a bl-platform worktree (session `wiring-check-0110`, head 5ecb134, before the freeze, excluded) confirmed it is written, and the same event from this repository and from `/tmp` wrote nothing. Weekly, and at the window's end, the evidence files, each repository's and worktree's receipt directories and the window's transcripts are copied out to a dated folder and hashed, so a removed worktree or an expiring transcript loses nothing; the weekly copy also confirms that bl-platform lines keep arriving (wrapper liveness). Codex sessions do not inherit the evidence directory and are not collected.
- Labelling: after the window, a fresh-context reviewer with no part in this session or the gate's implementation labels each event from its evidence line, the receipt files' own timestamps (gate-run and publish lines carry `at`; review and audit files are named by ISO time) and git history. Receipt files are not deleted during the window. The owner adjudicates every label the reviewer marks uncertain and a random sample of five labelled events per check (all of them when a check has five or fewer); if the owner disagrees with any sampled label, the owner relabels every event of that check.
- Independent unit: one would-block event is one (check, state) pair; the state is the HEAD tree for gate-run, review and audit, and the normalized body hash for publish. Repeated lines for the same pair (a retry, a chained command, a later session on the same state) form one event; a group whose lines would label differently is labelled false and reported as mixed. Only posted bodies reach the gate, so drafts revised before approval produce no events; a body edited after approval and posted is a new state. Owner questions are counted per (session, check); one message naming several checks counts once for each.

## Measures

- Primary, per check: labelled events (count) and false events (count), with their ratio stated as arithmetic, not as an estimate; false events also grouped by cause.
- Secondary, per check: share of the owner's question units for that check preceded in the same session by a would-block event for the same state, and, reported separately, the share followed by one at the next gated attempt in that session.
- Every measure is reported per repository as well as combined. The decision rule reads the combined count of events that are in the decision: all of this repository's, and bl-platform's only once its kit records receipts (see Tasks). In bl-platform nothing records a gate-run receipt even then (no CI-mirror wrapper calls `gate-run.mjs` there), so its gate-run events stay out of the gate-run decision.
- Guardrails, per check: stalled sessions (a tool call held until the hook's timeout, from host error lines in the transcripts or the owner's report), `runtime-unavailable` lines by reason, `unreadable_receipts` (lower bound, as Task 0110 states), unlabelled events, and events excluded as unparsed forms.
- Labelling rules carried from Task 0110's Notes: a line for `gh pr ready <n>` or `gh pr merge <n>` while another branch is checked out is false; a covering receipt older than the newest 20 that reads as missing is false; a later action's missing line in a chained command is covered by the first; unparsed forms (`bash -c`, quoted verbs, glued flags, other chat tools) are counted neither way and listed; a `runtime-unavailable` publish line is reported apart from would-block.
- Question codebook: a question unit is an owner message, in a session whose directory is one of the wired repositories, that asks whether a step ran or tells the agent to run it for the current work: review (fresh-context review, `/ad-review`), audit (`/ad-audit`), gate-run (the local gate, tests or `npm run verify`), publish (the approved text or the publication pipeline). It is preceded when a would-block line for that check appears earlier in the same session, and followed when one appears at the next gated attempt; the state compared is the one that line names. The labelling reviewer codes the questions; the owner's sample adjudication covers them too.

## Data sources

- Gate evidence: one JSONL file per session in `~/.agentic/evidence/sequence-gate/` (`AD_SEQUENCE_GATE_EVIDENCE_DIR`), lines with `gate: "sequence-gate"`; each line's `head` and `tree` name the repository state, and the session's transcript names its directory.
- Receipts: `.agentic/receipts/gate-run.jsonl`, `.agentic/receipts/publish.jsonl`, `.agentic/reviews/*-verdicts.md`, `.agentic/reviews/*-summary.json`, all gitignored and local.
- Owner questions: the local Claude Code session transcripts for the window. No `cleanupPeriodDays` is set; the oldest transcript retained on 2026-10-07 dates from 2026-09-09, so a four-week window is near the retention edge, hence the copy-out at the window's end. Transcripts are private: the read-out summarizes and does not quote them.
- Git history of each repository for the trees and commits each event names.

## Decision rule

Set before any counted event. The volume (at least 20 labelled events), false-block (at most one) and window (four weeks) thresholds are the owner's, recorded in ADR-0089 decision 6 on 2026-10-07. Removal for more than one false event is RESEARCH-0037's preregistered reversal, applied at the owner's volume. That reversal also ends a check whose would-block events miss most owner questions; this plan escalates that case to the owner instead (rule 2), because one or two questions would otherwise decide it. Applied once, at the end of the window:

1. Remove the check if it has at least 20 labelled events and more than one of them is false. Below 20 a check stays in shadow whatever its false count (ADR-0089 decision 6, the binding record, over RESEARCH-0037's reversal), and its false events are reported to the owner.
2. If the owner's question units for the check are mostly (more than half) not preceded by a would-block event for the same state, do not propose enforcement: report the check to the owner with both secondary shares, and the owner chooses remove or keep in shadow (with one or two question units the share is reported but decides nothing).
3. Otherwise, propose enforcement if the check has at least 20 labelled events and at most one false, and if counting every unlabelled event as false still leaves at most one false.
4. Otherwise, keep the check in shadow.

Any stalled session is reported to the owner whatever the counts (a design choice following ADR-0089's purpose of adding no stalls). If every check is removed, option A of RESEARCH-0037 (advisory only) stands.

## Next gate

A check proposed for enforcement goes to a new ADR that cites these counts against ADR-0089 decision 6, names ADR-0047, ADR-0055 and ADR-0074, and specifies a deny message that carries the fix and an override the agent cannot forge. The read-out is recorded in Task 0110's Notes and in a research record that succeeds RESEARCH-0037.

## Limits

- One owner, the repositories in the window and the Claude Code host only; Codex sessions are excluded from the claim, since Codex documents that some tool paths may skip hooks.
- The label "true" means the receipt was missing for that state, not that the step was skipped.
- A shadow gate never denies, so the window measures false blocks, not how an agent behaves under a deny or what stalls a deny would cause.
- The chat check sees only the Slack connector's send tool, and no live Slack send has been observed through the hook.
- Counts are lower bounds: a line the gate cannot write is lost (ADR-0089 second addendum).
- Twenty events and one false block are the owner's thresholds, not a power calculation; the sample of five and "more than half" are design choices of this plan.
- A labelling reviewer who reads the same receipts as the gate can share its blind spots; the owner's sample adjudication is the check against that.
- The secondary measure cannot tell a missed event from an agent that had not yet attempted a gated action; the next-attempt share is reported for that reason.

## Sources

### M1 — Goal/Question/Metric
- Source: NASA, Goal/Question/Metric paradigm, https://ntrs.nasa.gov/api/citations/19920010178/downloads/19920010178.pdf (accessed 2026-10-07 via the ad-prism source catalog)
- Supports: deriving the per-check question and measures from the decision (propose, keep, remove)
- Contribution: a traceable chain from goal to question to metric
- Adaptation: one question per check, with the primary and secondary measures tied to RESEARCH-0037's two-part hypothesis
- Retained limit: it structures the questions; it does not supply thresholds

### M2 — Evidence-Centered Design
- Source: ETS, Evidence-Centered Design, https://www.ets.org/Media/Research/pdf/TC-10-07.pdf (accessed 2026-10-07 via the ad-prism source catalog)
- Supports: tying the fit-for-use claim to the evidence a labelled event can carry
- Contribution: separates the claim, the evidence and the task that produces it
- Adaptation: the event, its label and the owner question are the evidence; normal work in the repository is the task
- Retained limit: built for assessment design, used here only for the claim-evidence link

### M3 — Agent evaluation vocabulary
- Source: Anthropic, Demystifying evals for AI agents, https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents (accessed 2026-10-07 via the ad-prism source catalog)
- Supports: treating the gate's evidence lines as traces and the labels as a grader output, with human calibration of the grader
- Contribution: separates trials, traces, graders and outcomes, and calls for human checks of automated grading
- Adaptation: the fresh-context reviewer grades events and the owner adjudicates a sample
- Retained limit: it does not set sample sizes or acceptance thresholds

### M4 — Proportionate assurance and fit for purpose
- Source: UK Government, The Aqua Book, https://www.gov.uk/guidance/the-aqua-book (accessed 2026-10-07 via the ad-prism source catalog)
- Supports: freezing this plan, a skeptical review, and separate verification and fit-for-purpose verdicts before the read-out
- Contribution: proportionate analytical assurance with explicit responsibilities
- Adaptation: the plan is frozen before counted events and audited by a fresh-context reviewer
- Retained limit: it governs process quality, not the content of the decision rule
