---
name: ad-review
description: Two-axis fresh-context code review per WORKFLOW §10. Splits the review into Standards (does the diff conform to AGENTS.md / ARCHITECTURE.md / GUIDELINES.md / CONTEXT.md / accepted ADRs?) and Spec (does the diff match the originating task / spec / PRD?), runs them as parallel sub-agent passes so neither axis masks the other, then aggregates findings side-by-side. Use when the user wants to review a diff, branch, PR, or recent commits against the project's spec, audit for bugs / coupling / edge cases / spec drift, or run a §10 senior-reviewing-junior pass. Adversarial framing — never emits an "approve" verdict.
summary: Two-axis code review per WORKFLOW §10. Claude Code uses fresh-context subagents; Codex writes an audit trail, reviews inline by default, and ships a reviewer subagent for explicit escalation.
allowed-tools: Read, Glob, Grep, Bash, Task
---

# /ad-review

Implements WORKFLOW §10 (Reviewer With Fresh Context). The current session is biased about the code it produced — the same reasoning that wrote it defends it. This skill assembles **two** clean handoffs (Standards-axis, Spec-axis), delegates each to a sub-agent that starts with no history, and aggregates the findings side-by-side. The two axes are deliberately separate so a Spec pass cannot mask a Standards fail (and vice versa) — the dichotomy is borrowed from [`mattpocock/skills/review`](https://github.com/mattpocock/skills/blob/main/skills/in-progress/review/SKILL.md) and bound to this kit's six-layer artifact stack.

## Step 0 — Scope the review

Confirm what to review. Default scopes, in priority order:

1. User-named ref or PR (`/ad-review main..HEAD`, `/ad-review PR#42`, `/ad-review <commit-sha>`).
2. Current branch vs `main` (`git diff main...HEAD`).
3. Working-tree changes (`git diff` plus `git diff --staged`).

If no diff exists, stop and tell the user — there's nothing to review.

When the host exposes `AskUserQuestion`, use it at Step 0 to confirm the review scope as a multi-choice card (`branch vs main / PR#NN / commit-sha / working-tree`) instead of asking inline text. Falls back to numbered text on hosts without the primitive (Codex).

Capture the diff command once: `git diff <range>` (use `...` three-dot for ref-vs-ref so the comparison is against the merge-base). Note the commit list with `git log <range> --format=%B`.

**Handoff-integrity gate.** Compute the commit count: `git rev-list --count <range>`. Bind it to `N`. The handoff header must include the literal line `Range: <range> (N commits)`. The `## Spec slice — commit messages` section must contain exactly `N` `### <sha> <subject>` entries. If your body has fewer, you mis-bounded the range — stop and re-scope. The subagent's review signal is bounded above by handoff fidelity; a quiet count mismatch produces silently-incomplete reviews.

## Step 1 — Identify Standards sources

Anything in the repo that documents how code should be written. Read what exists; do not fabricate references.

- `AGENTS.md` at the repo root.
- `ARCHITECTURE.md` at the repo root.
- `GUIDELINES.md` at the repo root.
- `CONTEXT.md` at the repo root, or `CONTEXT-MAP.md` plus per-context `CONTEXT.md`s.
- Every ADR under `doc/adr/` with `Status: accepted` whose subject is touched by the diff. When in doubt, include rather than skip.
- `CONTRIBUTING.md` if present.
- Machine-enforced standards (`.editorconfig`, `eslint.config.*`, `biome.json`, `prettier.config.*`, `tsconfig.json`) — note their presence, but instruct the Standards sub-agent to skip what tooling already enforces.

## Step 2 — Identify the Spec source

In this order, take the first that resolves:

1. Task references in the diff or recent commit messages (`Task NNNN`, `0NNN-`, `Closes task-0042`) → read the file's Acceptance Criteria and Plan sections.
2. An originating spec under `doc/specs/` whose filename matches the branch name or the dominant feature touched by the diff.
3. A parent PRD under `doc/product/` referenced by the spec.
4. Issue references in commit messages (`#123`, `Closes #45`) — fetch via `gh issue view` if the kit has `gh` available.

If nothing resolves, mark the Spec axis as `no spec source provided` and the Spec sub-agent will skip with a one-line note rather than fabricate findings.

## Step 3 — Build two axis-bounded handoffs

Each sub-agent will receive **only** the slice for its axis. Do not paste the Spec slice into the Standards handoff or vice versa — that's the bias the split exists to prevent.

**Standards handoff** (`<scope>-standards.md`):

```
=== AGENTIC-REVIEW HANDOFF — STANDARDS AXIS ===

Axis: Standards. Report only findings that violate documented standards or
introduce bugs / coupling / edge-case gaps. Skip what tooling enforces.
Skip Spec-axis findings (missing requirements, scope creep) — a separate
sub-agent covers those.

--- DIFF ---
<git diff output>

--- STANDARDS SOURCES ---
<AGENTS.md, ARCHITECTURE.md, GUIDELINES.md, CONTEXT.md / CONTEXT-MAP.md,
applicable accepted ADRs (full text), CONTRIBUTING.md if present>

--- TOOLING NOTE ---
<list of machine-enforced configs found — eslint.config.*, biome.json,
.editorconfig, tsconfig.json, etc. The sub-agent must NOT re-check what
tooling already enforces.>

=== END HANDOFF ===
```

**Spec handoff** (`<scope>-spec.md`):

```
=== AGENTIC-REVIEW HANDOFF — SPEC AXIS ===

Axis: Spec. Report only:
  (a) requirements the spec asked for that are missing or partial;
  (b) behaviour in the diff that wasn't asked for (scope creep);
  (c) requirements that look implemented but where the implementation
      looks wrong against the spec line.
Quote the spec line for each finding. Skip Standards-axis findings — a
separate sub-agent covers those.

--- DIFF ---
<git diff output>

--- SPEC SOURCES ---
<task file Acceptance Criteria + Plan, originating spec (full text),
parent PRD (full text), recent commit messages for the range, originating
issue body if fetched>

=== END HANDOFF ===
```

If Step 2 found no spec, write the Spec handoff as a single block: `no spec source provided — report exactly that and stop`.

## Step 4 — Persist both handoffs to disk

Write both files to `.agentic/reviews/<ISO-timestamp>-<scope-slug>-{standards,spec}.md` at the repo root. Create the directory if it does not exist. The `<scope-slug>` encodes the review target (`branch-vs-main`, `pr-42`, `commit-abc1234`, `working-tree`).

After write, print `wc -l <path>` alongside each handoff path so the user has a sanity-check value. Verify the handoff-integrity gate from Step 0 still holds: the commit-message section must have exactly `N` `### <sha>` entries where `N = git rev-list --count <range>`. If it doesn't, do not dispatch — re-scope and rebuild.

Advise the user to add `.agentic/reviews/` to their `.gitignore` if it is not already — handoffs are ephemeral per-review artifacts, not committed history.

If the combined diff spans >50 files, ask the user to narrow scope before invoking the sub-agents — the prompt cost compounds across two passes.

## Step 5 — Spawn both sub-agents in parallel

Send a single message with two `Task` tool calls, both routing to the bundled `fresh-context-reviewer` subagent. Each call receives its own axis-specific handoff as the prompt. Parallel dispatch is critical — sequential would cost 2× wall time for no rigor gain.

If the Spec axis was marked `no spec source provided`, dispatch only the Standards Task call. Note the skipped axis in the final report.

## Step 6 — Aggregate

Present the two sub-agents' reports verbatim, under explicit headings, in this order:

```
## Standards Findings

<verbatim output from the Standards sub-agent>

## Spec Findings

<verbatim output from the Spec sub-agent, or "Spec: skipped — no spec source provided">
```

Do **not** merge or rerank findings — the two axes are deliberately separate so the user can see them independently. Do **not** synthesize an overall "approve" verdict.

End with a one-line aggregate summary:

```
Aggregate: <N Standards Blockers, M Standards Concerns> / <P Spec Blockers, Q Spec Concerns>. Worst: <one-line quote of the highest-severity finding from either axis>.
```

Reference both persisted handoff paths in your reply so the user can audit what was sent to each axis.

## Output contract

- Two persisted handoff files at `.agentic/reviews/<ISO>-<scope>-standards.md` and `.agentic/reviews/<ISO>-<scope>-spec.md` (the latter may be a single-line "no spec source provided" stub).
- Two parallel `Task` invocations of `fresh-context-reviewer`, each with its axis-bounded handoff (or one invocation if Spec was skipped).
- Aggregated reply under `## Standards Findings` and `## Spec Findings` headings, verbatim, no cross-axis re-ranking.
- One-line aggregate summary at the end with counts per axis and the worst single finding.
- Both persisted handoff paths cited.
- No "approve" verdict, no defending of the code, no rewrite of the diff. Empty axis result is reported explicitly.

## Next

- Address every Standards Blocker before merge — that's the code-quality hard gate. Re-run `/ad-review` on the fix to confirm it cleared.
- Address Spec Blockers next — implementation-vs-spec drift is the second hard gate.
- Each Concern (from either axis) becomes a follow-up `/ad-task`; do not let them silently accumulate.
- Notes are informational; close them out in the original task's `Notes` log if relevant.
- If the Spec axis was skipped, decide whether a `/ad-spec` is overdue — work without a spec means future reviews are Standards-only.
- Once both axes are clear: merge per project conventions.
