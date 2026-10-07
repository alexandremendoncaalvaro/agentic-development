# RESEARCH-0037: Should the kit check workflow receipts before landing and outward actions?

**Status:** draft
**Created:** 2026-10-07
**Question:** Should the kit add deterministic gates that check, before a pull request is opened, readied or merged, before a push, and before outward text is posted, that the workflow steps the owner requires left a receipt for the exact code state or text, and if so, what is the first slice?
**Stakes:** medium times reversible (shadow mode never denies; enforcement would be high stakes and needs its own measurement)
**Confidence:** Conditional

## Conclusion and confidence

Yes, in shadow mode first. The kit should make four workflow steps leave a
receipt keyed to the exact state they covered: the fresh-context review and the
audit (commit SHA), the local CI-mirror gate run (commit SHA and exit code),
and the outward-text approval (hash of the approved body). It should then add
one script, byte-identical on both hosts, that runs before `gh pr
create|ready|merge`, `git push` and outward posts, and that only logs "would
block" with the missing receipt, never denying. Enforcement of any check comes
later, per check, once its measured false-block rate meets a threshold the
owner sets before the shadow run starts.

The gates check that a step happened for this state, not that it was done
well. Quality, the need for a question, and plain-language reporting stay with
the skills and the owner.

Conditional, with three mitigations: shadow mode only; a preregistered
flip criterion; and an ADR of its own, because ADR-0083 limits the runtime
layer to post-tool feedback (decision 1) and to one measured gate at a time
(decision 7), and Task 0084's measurement supported declining a second gate of
the validator kind.

## Question and scope

The owner's stated problem: nothing guarantees that the steps happened, so the
owner has to repeat "follow the workflow, run the review, the audit, the risk
analysis, the publish pipeline" before each approval. The owner asked for
steps that must happen in sequence before work moves on (research, review,
code, audit; ground, risks, freeze, audit).

Candidate options: (A) keep the steps advisory (skills, the ADR-0074 prompt
checkpoint); (B) receipt-checking gates in shadow, enforced later per check;
(C) blocking gates from the start. Deciding criterion: removes the owner's
repeated pre-approval check without adding stalls or false blocks. Out of
scope: gating judgment (whether grounding was adequate, whether a question was
needed).

## Hypothesis

If receipt gates address the owner's most repeated reminder, then in a shadow
window the sessions in which the owner asks "did you run review, audit,
publish?" will mostly show a would-block event before that question, and the
would-block events will mostly be true (the receipt really was missing).
Refuted if most owner checks have no preceding would-block event, or if the
false-block rate exceeds the owner's preset threshold.

## Method

- **Owner transcripts (primary input).** A sidecar extracted the owner's typed
  messages from the local Claude Code transcripts (150 main-session files,
  2026-08-12 to 2026-10-07; synthetic eval and pilot projects, pasted resume
  prompts, notifications and pastes over 4,000 characters excluded) into 647
  unique messages across 52 sessions, and classified them into 15 themes by
  regular expressions in Portuguese and English. The classification was
  re-run for this study on the frozen extraction and reproduced exactly; the
  extraction itself was not re-run. Messages are summarized, never quoted: the
  corpus is private and names colleagues.
- **In-repo receipts.** The skill files that would produce each receipt were
  read on this branch.
- **Host documentation.** Claude Code and Codex hook documentation, read by
  the sidecar on 2026-10-07.
- **Prior art.** GitHub protected-branch rules, Spec Kit, Superpowers,
  cc-sessions, claude-mods and Storybloq, read on 2026-10-07.
- **Kit decisions.** ADR-0047, ADR-0055, ADR-0072, ADR-0074, ADR-0083 and
  Task 0084.
- Claims graded per WORKFLOW section 17.

## Evidence

- **E0. The owner states the need directly.** The owner asked for gates that
  guarantee the steps happened in sequence, because without them the owner
  must ask before every approval whether review, audit and publish ran.
  **Strength: High** (the owner's own request, the subject of this study).
- **E1. The owner's most repeated reminder is a pre-approval process check
  (exploratory).**
  The theme "did you run the review, audit, risk analysis, publish?" matches
  61 unique messages in 28 of 52 sessions, the highest of the gateable themes;
  naming the audit (22 sessions) and the review (20) overlap it. The counts are regex matches, an upper bound on true
  checks. Two precision readings exist and both are exploratory, since their
  per-match labels were not retained: the sidecar's hand inspection (about
  73% of messages) and a 15-match spot-check for this study (8 true). They
  inform the size of the problem only. Exploratory: the corpus is private and
  the extraction and classification scripts are not retained in a durable
  channel, so a reviewer cannot reproduce the counts from this repository;
  they carry no weight in the decision, which rests on E0 and on the shadow
  run. **Strength: Low** (exploratory; classification re-run once in the
  author's session).
- **E2. Four steps can leave a machine-checkable receipt; one does today.**
  `ad-audit` already writes `target=<SHA>` in each group file and its gate
  line (`src/skills/claude-code/ad-audit/SKILL.md` lines 69-93). `ad-review`
  records a `Range:` line and one entry per commit, but no single target SHA (`ad-review/SKILL.md` line 26).
  The local gate run leaves no receipt outside an audit. `ad-publish` shows an
  exact-text approval receipt in chat and says any change invalidates it
  (`ad-publish/SKILL.md` lines 188-200), but persists nothing. `ad-release`'s
  digest-bound plan approval (ADR-0072) is the in-kit precedent for a
  hash-keyed receipt. **Strength: High** (read on this branch).
- **E3. Some steps cannot be gated.** Grounding, the risk register and a
  frozen evaluation each leave a file, but whether the step was needed is a
  judgment; the question discipline and plain-language reporting are
  judgment entirely. In the same exploratory corpus, every structured question counted (35)
  put a recommended option first, which suggests a format gate on questions
  would catch little. **Strength: Low** for the count (exploratory, as E1);
  Medium for the classification of the rest.
- **E4. Both hosts can run a script before a tool call.** Claude Code
  `PreToolUse` can deny or pass, matches Bash with permission-rule syntax and
  MCP tools by name. Codex `PreToolUse` fires for Bash, `apply_patch` and MCP
  tools, accepts deny but not ask, skips new hooks until trusted, and its
  documentation calls hooks a guardrail, not a complete enforcement boundary.
  **Strength: Medium** (official documentation, single read; the Codex leg
  cannot be exercised on this machine, as ADR-0083 records).
- **E5. Prior art converges on state-keyed approval and a fix in every
  deny.** GitHub dismisses stale approvals on new commits and can require
  approval of the latest push. claude-mods' merge gate states that a deny must
  carry the fix and that a gate must never block when there is no way
  through. Spec Kit states that completion claims are not evidence, and
  Superpowers requires fresh verification evidence before a completion claim;
  both enforce it in skill text, not hooks. **Strength: Medium** (documentation
  and README reading; no third-party gate was run).
- **E6. Gates can worsen the owner's second complaint.** The theme "stalls
  or unneeded approval requests" appears in 12 sessions (precision low; it
  mixes app hangs). A deny that sends the agent back to ask the owner would
  trade a reminder problem for a stall problem. **Strength: Low-Medium.**

Contested: whether a second runtime gate should be proposed now.

- Position A, ADR-0083 decision 7 and Task 0084: one gate at a time; the
  second on-versus-off comparison of the artifact-validator gate supports
  declining a second gate, though its per-observation artifacts are
  machine-local, so it informs the decision without closing it. Holds for
  another post-tool validator gate.
- Position B, this study: a receipt gate is a different class. It runs before
  the action, checks existence and freshness rather than validating content,
  and answers a measured owner reminder (E1) that a post-tool validator cannot
  reach. Holds if the shadow run shows would-block events preceding the
  owner's checks.
- Both hold under different conditions. The proposal must therefore name
  ADR-0083 decisions 1 and 7, and Task 0084, as what it qualifies.

## Limitations and what would reverse the conclusion

- The corpus over-weights one company repository and lacks older sessions of
  this repository (missing, cause unverified). Theme precision beyond the two
  hand-checked themes was spot-checked only.
- The real false-block rate of SHA-keyed freshness is unknown. The largest
  predicted source is an amend, rebase or docs-only commit after the review or
  audit; a receipt-neutral path list is the planned mitigation, and the shadow
  run exists to measure it.
- Reading the company repository's review bot results from a local hook
  within the hook time budget is unverified.
- Reversal: a shadow window in which most owner pre-approval checks have no
  preceding would-block event, or a false-block rate above the owner's
  threshold for a check, ends that check; if all three end, the gates end and
  option A stands.

## Provenance and artifacts

Owner transcripts under `~/.claude/projects/`, extracted and classified on
2026-10-07 by scripts kept in the session scratchpad (`mine/extract.py`,
`classify2.py`, `dedupe_report.py`, `tools.py`); the classification was
re-run on 2026-10-07 for this study and the counts above are its output. The
sidecar report (`research-D-sequence-gates.md`) holds the full gate-point
table and design notes; neither is committed, because the corpus is private.
Host documentation: code.claude.com/docs/en/hooks and learn.chatgpt.com Codex
hooks documentation, WebFetch 2026-10-07. Prior art, read 2026-10-07: GitHub
docs "About protected branches" (WebFetch); github/spec-kit at 62b6fcf,
obra/superpowers at 8ca22db, GWUDCAP/cc-sessions at c981825,
yash-gadodia/claude-mods at f4c1c75, Storybloq/storybloq at d5274b0 (gh api).
In-repo files read on branch `docs/evidence-gates-study`.

## Derived decision

None yet. A binding decision needs an ADR that qualifies ADR-0083 decisions 1
and 7, sets the shadow contract, and names the flip criterion the owner sets;
the first slice is then planned as tasks for the receipt producers and the
shadow gate.
