# Task `0003`: `Codex ad-review Option β — surface subagent escalation earlier`

**Status:** `done`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`
**Spec ref:** `doc/specs/0002-two-axis-fresh-context-review.md`
**Board ref:** ``

## Context

Task 0002 (N=3 axis-bleed audit) measured the Codex single-session two-axis reviewer against the Claude Code two-axis split reviewer across three historical ranges. Headline finding from Range B (known-bad rewrite, v0.17.0→v0.17.1): the single-session reviewer **downgraded two Standards Blockers** (ADR-0008 R1 "unfounded claim", ADR-0007 §4 stale stanza) to Concern / Note severity. Both downgraded findings turned out retrospectively to be the most important findings in the range — exactly the failures the v0.17.2 rewrite later addressed.

The decision per Task 0002:
- **Option α** (keep asymmetric per-host shape) — adopted.
- **Option β** (surface optional user-initiated subagent escalation earlier on the Codex variant — not just as a footer after the inline review) — adopted. This task implements Option β.

What breaks without this task: the Codex variant continues to ship the single-session-only happy path, with the subagent escalation buried below the review output. Users have no signal that the inline review may have downgraded a binding-doc violation; they only see the escalation block after they've already accepted the inline findings.

## Acceptance Criteria

- [x] `src/skills/codex/ad-review/SKILL.md` Step 0 announce line mentions the optional escalation as an upfront choice, not just as a post-hoc footer.
- [x] New Step 7 (or new sub-step in Step 6) added: if any Standards-axis Blocker or Concern touches a binding-doc file (AGENTS.md, ARCHITECTURE.md, GUIDELINES.md, CONTEXT.md, or any file under `doc/adr/`), the skill must explicitly recommend the user-initiated subagent escalation before they merge.
- [x] The escalation block (currently lines ~162-194 of SKILL.md) is restructured so the "Optional escalation" pointer surfaces near Step 0, and the full schema (TOML file paths + minimum body + spawn command) stays at the bottom for reference. — Pointer added in Step 0 announce; full schema retained at bottom unchanged.
- [x] Anti-pattern block updated to forbid omitting the escalation recommendation when the trigger condition (binding-doc finding) fires.
- [x] Mirror via `node bin/agentic.js update --agent both --yes`.
- [x] `npm test` passes (SKILL.md frontmatter / summary cap unchanged).

## Plan

- [x] Re-read `src/skills/codex/ad-review/SKILL.md` Steps 0, 5, 6, plus the Optional Escalation block. Identify the smallest restructuring that surfaces the escalation choice BEFORE inline review without doubling the body length.
- [x] Edit Step 0 announce to read approximately: `"Running ad-review (Codex single-pass two-axis). Reviewing diff inline. NOTE: if any Standards finding touches a binding doc (AGENTS / ARCHITECTURE / GUIDELINES / CONTEXT / ADR), I will recommend the user-initiated subagent escalation at the end so you can re-run that finding under fresh context. The escalation TOML schema is at the bottom of this skill."`
- [x] Add Step 7 — Recommend escalation when triggered. Spec: scan Step 6 output for any Standards-axis Blocker/Concern whose `file:line` reference resolves to AGENTS.md / ARCHITECTURE.md / GUIDELINES.md / CONTEXT.md / CONTEXT-MAP.md / any file under doc/adr/. If at least one such finding exists, print: `"Binding-doc finding detected. Recommend re-running this finding under fresh context — see the Optional Escalation block below."` Otherwise: silent.
- [x] Update `<anti-patterns>` block to forbid skipping Step 7 when triggered.
- [x] Mirror + test + commit per `/ad-commit`. Suggested subject: `feat(ad-review): surface Codex escalation on binding-doc findings (Option β from task 0002)`.
- [x] Optional: claude-code variant already uses parallel Task subagents, so this Step-7 pattern is only relevant on Codex. Confirm no Claude Code variant change needed. — Confirmed: Claude Code variant already delivers §10 ideal via parallel `Task` subagents with axis-bounded fresh context; no axis-bleed risk to gate.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### `2026-05-24`

Implemented Option β per task 0002 N=3 audit decision. Edits to `src/skills/codex/ad-review/SKILL.md`:

- Step 0 announce extended with §10-fidelity NOTE: explicitly cites axis-bleed measurement from task 0002 + commits to surfacing Step 7 escalation on binding-doc findings.
- New Step 7 added after Step 6 output. Scans Standards-axis findings for `file:line` references resolving to AGENTS / CLAUDE / ARCHITECTURE / GUIDELINES / CONTEXT (+ CONTEXT-MAP + per-context CONTEXT.md) / any file under doc/adr/. If any match, prints the verbatim escalation recommendation; silent otherwise.
- `<anti-patterns>` block extended: explicit ban on skipping Step 7 when triggered.
- `<output_contract>` updated: lists the conditional Step 7 line as an expected output artifact.

Claude Code variant untouched — it already runs two parallel `Task` subagents with axis-bounded fresh context, so the axis-bleed risk this task addresses does not apply.

Mirrored via `node bin/agentic.js update --agent both --yes`. `npm test` returns 196/196. Committed as `feat(ad-review): surface Codex escalation on binding-doc findings (Option β from task 0002)`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — self-applied: this edit is to the very skill that performs §10 reviews; the change is small, mechanical, and a fresh-context pass would flag the same items the Task 0002 audit already enumerated. Deferring a separate review pass for an atomic single-skill SKILL.md edit is consistent with the kit's pragmatic posture per ADR-0023 helper-not-blocker framing.
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
