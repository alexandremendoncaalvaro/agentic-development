---
name: ad-review
description: Fresh-context code review per WORKFLOW §10 — assemble the diff plus the relevant spec slice (AGENTS.md, applicable ADRs, the task's Acceptance Criteria), perform a /clear handoff to a clean session, return a structured findings list. Use when the user wants to review a diff, branch, PR, or recent commits against the project's spec, audit for bugs / coupling / edge cases / spec drift, or run a §10 senior-reviewing-junior pass. Adversarial framing — never emits an "approve" verdict.
summary: Fresh-context code review per WORKFLOW §10 — assemble handoff, return structured findings.
---

<background_information>
Implements WORKFLOW §10 (Reviewer With Fresh Context). The current session is biased about the code it produced — the same reasoning that wrote it defends it. This skill assembles a clean handoff and the user re-loads it into a fresh context so the review reads as adversarial.

Codex has no native subagent primitive. Parity with §10 is preserved through a manual handoff: this skill prints the assembled handoff, then the user runs `/clear` and pastes the handoff back into the empty session. One extra UX step versus Claude Code's bundled subagent.
</background_information>

<instructions>
Step 0 — scope the review. Confirm what to review. Default scopes, in priority order:
1. User-named ref or PR (e.g. `ad-review main..HEAD`, `ad-review <commit-sha>`).
2. Current branch vs `main` (`git diff main...HEAD`).
3. Working-tree changes (`git diff` plus `git diff --staged`).

If no diff exists, stop and tell the user — there's nothing to review.

Step 1 — assemble the handoff. The fresh session will get only what you print here. No conversation history, no prior context.
- Diff for the chosen scope (`git diff <range>`). Use `--stat` first; if it spans >50 files, ask the user to narrow.
- `AGENTS.md` at the repo root, if present.
- `ARCHITECTURE.md` at the repo root, if present.
- Every ADR under `doc/adr/` with `Status: accepted` whose subject is touched by the diff. When in doubt, include rather than skip.
- Relevant task file under `doc/tasks/` — if the diff or recent commit messages reference `Task NNNN`, read its Acceptance Criteria and Plan.
- Recent commit messages for the range (`git log <range> --format=%B`).

Step 2 — write the handoff to disk. Save the assembled handoff at `.agentic/reviews/<ISO-timestamp>-<scope-slug>.md` at the repo root. Create the directory if missing. The slug encodes the scope (`branch-vs-main`, `pr-42`, `commit-abc1234`, `working-tree`). The file body is exactly the block below — no prose summary of what you think the diff does, the reviewer reads the diff itself.

```
=== AGENTIC-REVIEW HANDOFF ===

You are a senior engineer reviewing a junior PR with no prior context. The diff and the spec below are the only evidence. Do not infer history or trust the author's intent.

Review focus, in priority order:
1. Bugs — null/undefined paths, off-by-one, unhandled errors, race conditions, broken invariants.
2. Spec drift — does the diff contradict AGENTS.md, an accepted ADR, or the task Acceptance Criteria?
3. Coupling — modules that shouldn't know about each other, leaked abstractions.
4. Edge cases — empty inputs, large inputs, concurrent access, missing files, permission errors.
5. Test coverage — does any new behavior have a corresponding test?

Skip formatting, naming opinions, stylistic preferences. Skip praise.

Output: group findings by severity (Blocker / Concern / Note). Each finding one line: `file:line: <severity>: <problem>. <fix>.` Severity is the literal word `Blocker`, `Concern`, or `Note` — no emoji.

End with a one-line bottom-line: "Ship as-is", "Ship with the Concerns logged as follow-up tasks", or "Don't ship until Blockers resolved". Do NOT synthesize an "approve" verdict.

--- DIFF ---
<paste git diff output here>

--- SPEC SLICE ---
<paste AGENTS.md, ARCHITECTURE.md, applicable ADRs, task file Acceptance Criteria + Plan, recent commit messages>

=== END HANDOFF ===
```

Advise the user to add `.agentic/reviews/` to their `.gitignore` if it is not already — handoffs are ephemeral per-review artifacts, not committed history.

Step 3 — instruct the user. After writing the handoff, output exactly this and stop:

```
Handoff saved at <path>.

Load it into a fresh Codex session:

  cat <path> | pbcopy        # macOS
  xclip -selection clipboard < <path>   # Linux

Then in Codex: run `/clear`, paste from the clipboard, send. Codex will produce the structured findings.
```

Do not proceed past this point in the current session.
</instructions>

<output_contract>
A handoff file at `.agentic/reviews/<ISO-timestamp>-<scope-slug>.md`, plus a short instruction telling the user how to load it into a fresh Codex session via `/clear` and paste. The current session does not produce findings — the fresh session does, after the user re-loads the handoff. This honors WORKFLOW §10 by enforcing context isolation through `/clear` rather than via a subagent primitive Codex lacks; the persisted file replaces the chat-scroll copy step that previously made the round-trip fragile.
</output_contract>

## Next

- Address every Blocker before merge. Re-run `/ad-review` on the fix to confirm it cleared.
- Each Concern becomes a follow-up `/ad-task`; do not let them silently accumulate.
- Notes are informational; close them out in the original task's `Notes` log if relevant.
- Once Blockers are clear: merge per project conventions.
