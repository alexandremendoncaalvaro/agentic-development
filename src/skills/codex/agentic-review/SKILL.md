---
name: agentic-review
description: Fresh-context code review per WORKFLOW §10 — assemble the diff plus the relevant spec slice (AGENTS.md, applicable ADRs, the task's Acceptance Criteria), perform a /clear handoff to a clean session, return a structured findings list. Use when the user wants to review a diff, branch, PR, or recent commits against the project's spec, audit for bugs / coupling / edge cases / spec drift, or run a §10 senior-reviewing-junior pass. Adversarial framing — never emits an "approve" verdict.
---

<background_information>
Implements WORKFLOW §10 (Reviewer With Fresh Context). The current session is biased about the code it produced — the same reasoning that wrote it defends it. This skill assembles a clean handoff and re-loads it into a fresh context so the review reads as adversarial.

Codex has no native subagent primitive. Parity with §10 is preserved via `/clear` + handoff orchestration, at the cost of one extra UX step. Documented in [ADR-0007](workflow-operational-skills) decision item 4.
</background_information>

<instructions>
Step 0 — scope the review. Confirm what to review. Default scopes, in priority order:
1. User-named ref or PR (e.g. `agentic-review main..HEAD`, `agentic-review <commit-sha>`).
2. Current branch vs `main` (`git diff main...HEAD`).
3. Working-tree changes (`git diff` plus `git diff --staged`).

If no diff exists, stop and tell the user — there's nothing to review.

Step 1 — assemble the handoff. The fresh session will get only what you assemble here. No conversation history, no prior context.
- Diff for the chosen scope (`git diff <range>`). Use `--stat` first; if it spans >50 files, ask the user to narrow.
- `AGENTS.md` at the repo root, if present.
- `ARCHITECTURE.md` at the repo root, if present.
- Every ADR under `doc/adr/` with `Status: accepted` whose subject is touched by the diff. When in doubt, include rather than skip.
- Relevant task file under `doc/tasks/` — if the diff or recent commit messages reference `Task NNNN`, read its Acceptance Criteria and Plan.
- Recent commit messages for the range (`git log <range> --format=%B`).

Write the handoff to a temp file at `.agentic-review-handoff.md` (gitignored or untracked) so the fresh session can re-load it. Body: one short framing paragraph (what's being reviewed, what spec applies), then the diff and the spec slice. No prose summary of what you think the diff does.

Step 2 — fresh-context handoff.
1. Tell the user: "Run `/clear` to drop the current context, then re-invoke me with `agentic-review --resume`. The handoff is at `.agentic-review-handoff.md`."
2. Stop. Do not proceed.

Step 3 — on resume (`agentic-review --resume`).
1. Read `.agentic-review-handoff.md`. If absent, stop and tell the user to start over from Step 0.
2. Adopt the reviewer posture: senior engineer reviewing a junior PR, no inherited trust in the author's intent. The handoff and the spec are the only evidence.
3. Review focus, in priority: bugs (null/undefined paths, off-by-one, unhandled errors, race conditions, broken invariants); spec drift (does the diff contradict AGENTS.md, an accepted ADR, or the task Acceptance Criteria?); coupling; edge cases; test coverage.
4. Skip formatting, naming opinions, and stylistic preferences unless they change meaning. Skip praise.

Step 4 — output findings. Group by severity:
- Blocker — must fix before merge. Bug, spec violation, security issue.
- Concern — worth a follow-up task. Real issue, not blocking the current change.
- Note — informational, no action expected.

Each finding: one line, `file:line: <emoji> <severity>: <problem>. <fix>.` Use 🚨 for Blocker, ⚠️ for Concern, ℹ️ for Note.

End with a one-line bottom-line: `Ship as-is`, `Ship with the Concerns logged as follow-up tasks`, or `Don't ship until Blockers resolved`.

Do NOT synthesize an "approve" verdict. Do NOT rewrite the diff for the author. Do NOT defend the code. Do NOT pad with stylistic nits.

After writing findings, delete `.agentic-review-handoff.md`.
</instructions>

<output_contract>
A structured findings list grouped Blocker / Concern / Note, each finding `file:line: <emoji> <severity>: <problem>. <fix>.`. No "approve" verdict, no defending of the code, no rewrite of the diff. Empty result is reported explicitly. Handoff temp file cleaned up at the end.
</output_contract>
