# Spec `0002`: `two-axis fresh-context code review (Standards + Spec)`

**Status:** `shipped`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`

## Context

WORKFLOW §10 ("Reviewer With Fresh Context") binds every task's Definition of Done to a code review performed without inherited bias from the session that wrote the code. The original `ad-review` (shipped pre-v0.17) ran a single fresh-context reviewer per diff: one subagent reading AGENTS.md + applicable ADRs + the task's Acceptance Criteria + the diff, returning Blocker / Concern / Note findings.

Field experience surfaced a structural gap: a single reviewer reading both binding-doc context and spec-context simultaneously can rationalize a Spec pass as covering Standards (and vice versa). Matt Pocock's `review` skill (`mattpocock/skills/in-progress/review`, May 2026) addresses this by splitting the review into two independent axes — **Standards** (does the diff conform to documented coding standards?) and **Spec** (does the diff match what the originating issue / PRD / spec asked for?) — and running them as parallel sub-agents that report side-by-side without re-ranking.

What would break without this feature: every kit-shipped review carried hidden cross-axis rationalization risk. Specs that were silently violated could pass review because the same reviewer found enough Standards adherence to feel satisfied (or the inverse — clean implementation against the spec mask binding-doc drift).

This spec was backfilled after the two-axis rewrite shipped in commits `3d45259` (Claude Code, v0.17.0-beta.1, 2026-05-23) and `3fabb92` (Codex, v0.17.2-beta.1, 2026-05-23). The per-host architectural asymmetry is intentional: Claude Code exposes a `Task` subagent primitive that lets the skill spawn two reviewers in parallel; Codex skills cannot programmatically spawn subagents (per `developers.openai.com/codex/subagents` — subagents are user-initiated only), so the Codex variant ships structural schema separation inside a single review pass.

## User Scenarios

- **Scenario 1: Claude Code two-reviewer review**
  - Given the user is in Claude Code with a diff to review (branch ahead of main, working tree, PR, or commit-sha range)
  - When the user invokes `/ad-review <range>` (or asks for "review this branch")
  - Then the skill assembles two axis-bounded handoffs (Standards: AGENTS.md / ARCHITECTURE.md / GUIDELINES.md / CONTEXT.md / accepted ADRs / diff; Spec: task Acceptance Criteria / spec / PRD / commit messages / diff), persists both to `.agentic/reviews/<ISO>-<scope>-{standards,spec}.md`, spawns two parallel `Task` calls to the bundled `fresh-context-reviewer` subagent (each with its axis-bounded handoff), and aggregates findings side-by-side under `## Standards Findings` and `## Spec Findings` headings

- **Scenario 2: Codex single-session two-axis review**
  - Given the user is in Codex with the same scope
  - When the user invokes `/ad-review` (or auto-trigger fires on review-language)
  - Then the skill assembles one combined-context handoff, persists to `.agentic/reviews/<ISO>-<scope>.md`, performs the review inline with classification discipline (each finding routed to exactly one axis before being added to the report), and emits findings under the same two headings with the same per-axis end-line verdicts as the Claude Code variant

- **Scenario 3: no spec source resolves**
  - Given the diff has no task / spec / PRD / issue reference resolvable through the commit messages or branch name
  - When `/ad-review` runs
  - Then the Spec axis emits exactly `Spec: skipped — no spec source provided` and produces no Spec findings; Standards axis runs normally; the aggregate summary notes the skipped axis

## Requirements

### Functional

- R1: Standards axis reads diff + AGENTS.md + ARCHITECTURE.md + GUIDELINES.md + CONTEXT.md (or CONTEXT-MAP.md + per-context files) + every ADR under `doc/adr/` with `Status: accepted` whose subject is touched by the diff + CONTRIBUTING.md when present + tooling-config inventory.
- R2: Spec axis reads diff + first-resolvable spec source (task `Acceptance Criteria` + `Plan` → originating spec → parent PRD → issue body via `gh issue view`). If nothing resolves, marks Spec axis skipped.
- R3: Findings are reported under exactly `## Standards Findings` and `## Spec Findings` headings in that order. Each finding is one line: `file:line: <severity>: <problem>. <fix>.` for Standards; `file:line: <severity>: <problem> (spec: "<quoted-line>"). <fix>.` for Spec. Severity is `Blocker`, `Concern`, or `Note` — no emoji.
- R4: Each axis ends with one of the literal verdicts: `<axis>: ship as-is` / `<axis>: ship with the Concerns logged` / `<axis>: don't ship until Blockers resolved` / `Spec: skipped — no spec source provided`.
- R5: The reply ends with a one-line aggregate: `Aggregate: <N Standards Blockers, M Standards Concerns> / <P Spec Blockers, Q Spec Concerns>. Worst: <quote>. Audit trail: <path>`.
- R6: No "approve" verdict synthesized at the skill level — §10 frames review as adversarial; approval is the user's call after weighing findings.
- R7: Audit-trail handoff(s) persisted at `.agentic/reviews/<ISO-timestamp>-<scope-slug>{,-standards,-spec}.md`; directory created if missing; user advised to `.gitignore` the directory.
- R8: Claude Code variant dispatches both Task calls in a single message (parallel, not sequential).
- R9: Codex variant prints a Step 0 announce line stating the operational shape before any file I/O.
- R10: When the host exposes `AskUserQuestion`, the skill uses it to confirm scope (branch-vs-main / PR / commit-sha / working-tree) instead of inline text.

### Non-functional

- The combined diff is size-gated: if `git diff <range> --stat` reports >50 files, the skill stops and asks the user to narrow scope before invoking sub-agents — the prompt cost compounds across two axes.
- Codex skill `allow_implicit_invocation: true` is the only such flip in the kit beyond `ad-philosophy`; trigger phrases are scope-bearing forms (`"review this branch"`, `"review main..HEAD"`, `"revisa esse diff <range>"`) to limit auto-trigger blast radius. Ambiguous requests prompt for confirmation before invoking.

## Success Criteria

- A user invoking `/ad-review main..HEAD` on a typical kit-sized diff (≤50 files, ≤2000 diff lines) receives a structured two-axis findings report within 60 seconds on Claude Code (parallel) or 90 seconds on Codex (sequential single-session).
- The Standards axis output and the Spec axis output are reportable independently: a reader can quote one axis without the other and the verdict still makes sense.
- The `.agentic/reviews/` audit trail is sufficient to replay the review against an updated diff or share it with a teammate, without re-deriving the handoff context.
- Zero `approve` verdicts synthesized by the skill across any run.

## Edge Cases

- **Diff has no commits in range:** skill stops with "nothing to review" rather than reviewing an empty diff.
- **Diff >50 files:** skill prompts to narrow scope; does not proceed.
- **`AGENTS.md` / `ARCHITECTURE.md` / `GUIDELINES.md` absent:** Standards axis still runs against whatever standards sources DO exist; missing files reported in the handoff under `--- STANDARDS SOURCES ---` as `<not present>` rather than failing.
- **No ADRs touched by diff subject:** Standards handoff has empty `applicable accepted ADRs` block; reviewer notes this rather than fabricating ADR references.
- **Cross-axis finding ambiguity** (a finding could belong to either axis): routed to the axis whose source defines the constraint. When in genuine doubt, route to Standards. The Spec reviewer treats it as out-of-axis if Standards already picked it up.
- **Codex variant on older Codex without `/clear`:** the skill body explicitly bans `/clear` choreography (was the prior broken pattern); single-session inline review works on every Codex version.

## Out of Scope

- True fresh-context review on Codex — Codex skills cannot programmatically spawn subagents. The Codex variant documents an **optional user-initiated** escalation: the user spawns a subagent manually via natural language (`"spawn an agent to act as a senior code reviewer. Read <audit-path> and report findings under ## Standards Findings and ## Spec Findings only."`). The kit does not automate the escalation.
- Three-axis or N-axis review (e.g., security axis as a third independent reviewer) — out of scope for this spec; would be a separate spec if proposed.
- Reviewing diffs across repositories — single-repo scope only.
- Reviewing non-code artifacts (e.g., reviewing a PRD draft against the project's vision) — out of scope. PRDs / specs / ADRs have their own draft → accepted lifecycle via their respective `ad-*` skills.

## Open Questions

Tracked as work items, not deferred decisions:

- Task 0001 (`doc/tasks/0001-verify-codex-config-toml-agents-syntax.md`) — verify the `~/.codex/config.toml [agents]` block syntax referenced in the Codex variant's "Optional escalation" section against current Codex documentation.
- Task 0002 (`doc/tasks/0002-audit-single-session-axis-bleed.md`) — measure whether the Codex single-session schema-separated review degrades §10 fidelity in practice (vs the Claude Code two-reviewer split). ADR-0007 Addendum conditioned a future ADR on the audit result.

## Related

- ADRs: ADR-0007 (workflow-operational skills category, of which `ad-review` is the canonical instance; Codex consequence stanza superseded by 2026-05-24 Addendum — see `doc/adr/0007-workflow-operational-skills.md`).
- Tasks: `doc/tasks/0001-verify-codex-config-toml-agents-syntax.md`, `doc/tasks/0002-audit-single-session-axis-bleed.md`.
- Supersedes / Depends on: supersedes the original single-axis `ad-review` (pre-v0.17.0-beta.1).
- Adapted from: [mattpocock/skills/in-progress/review](https://github.com/mattpocock/skills/blob/main/skills/in-progress/review/SKILL.md).
- Shipped in:
  - Claude Code variant: commit `3d45259`, release `v0.17.0-beta.1` (2026-05-23).
  - Codex variant rewrite: commit `3fabb92`, release `v0.17.2-beta.1` (2026-05-23).
  - Self-review followups: commits `708d22b` + `83b0c7a`, release `v0.17.3-beta.1` (2026-05-24).
