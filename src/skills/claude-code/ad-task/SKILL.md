---
name: ad-task
description: Draft a new task tracking file at doc/tasks/NNNN-<short-slug>.md, using a checkbox-toggle + append-only-Notes format optimized for LLM editing. Use when the user wants to create, draft, scaffold, or open a task, ticket, work item, or backlog entry tracked in the repo. Status starts at proposed; the file is the source of truth, not a board.
summary: Draft a new task at `doc/tasks/NNNN-<slug>.md`.
allowed-tools: Read, Write, Glob, Bash
---

# /ad-task

Drafts `doc/tasks/<NNNN>-<short-slug>.md` for one tracked task. Format chosen so status changes via single checkbox toggles and Notes is append-only — cheap, reviewable, idempotent edits.

## Step 0 — Scope preflight

Establish the **current repository** before naming or drafting anything. From
the consumer root, run
`node .claude/skills/ad-task/scripts/scope-anchors.mjs` (substitute the skill
base path when loaded elsewhere). Read its JSON: `cwd` and `gitRoot` identify
the target; `anchors` is the complete allow-list of repository-local sources.
If `unreadable` is non-empty, stop until access is resolved.

A new task requires one exact repository-local **Scope ref**: a repo-relative
path to the PRD roadmap line, an existing feature spec, an accepted ADR, or a
root artifact that already defines the work. A board ticket, a global rule,
or a request remembered from another repository does not qualify. `Spec ref`
remains optional because a small task can be directly grounded in the PRD or
an ADR.

Choose an exact entry from `anchors`, then run the same script with that bare
path as its argument. Proceed only when `verification.valid` is `true`. If no
local scope anchor exists, do not write a task. First create or amend the
product, spec, or decision artifact in this current repository; then create the
task against that artifact. Never use a blank, `<TODO>`, or another
repository's path for `Scope ref`.

## Step 1 — Determine NNNN and slug

Run `node .claude/skills/ad-task/scripts/next-number.mjs doc/tasks` from the consumer root. Use JSON `next` as NNNN; it preserves archived gaps. If `unreadable` is non-empty, stop until access is resolved; if `exhausted` is true, stop for a numbering decision. If loaded elsewhere, substitute the skill base path. Slug: kebab-case, ≤6 words, derived from the user's task title.

## Step 2 — Interview to fill

Ask one question per missing field, in this order:

* **Context:** why this task exists, what problem it solves, any assumption being tested.
* **Acceptance Criteria:** measurable conditions. Each is a checkbox; pass/fail must be observable, not aspirational ("loads in under 2s", not "fast enough").
* **Plan:** concrete sequential steps with file paths where applicable. Each is a checkbox.
* **Scope ref:** require the exact repository-local anchor validated in Step 0, with an optional section or roadmap-tier suffix. It is mandatory; a board reference never replaces it.
* **Owner:** ask.
* **Execution:** `AFK` when the task is specified enough for an agent to execute with bounded context and disjoint write scope; `HITL` when it needs human judgment, taste, external access, or frequent back-and-forth.
* **Spec ref:** ask; leave blank when no spec drives this task. When a feature spec exists at `doc/specs/NNNN-<slug>.md`, link it here so the spec's `Related → Tasks` list reciprocates.
* **Board ref:** ask; leave blank if solo work. It supplements the local Scope ref; it never replaces it.

Status starts at `proposed`. Created: today, ISO format. Notes: empty (filled during execution). Definition of Done section: copy verbatim from the template.

**Do not invent values.** When the user does not know something, leave `<TODO>` and ask. Stop after writing the file — do not start work.

## Interview UX

When the host exposes `AskUserQuestion`, use it for multi-choice prompts (status, owner selection, Spec-ref pick from existing `doc/specs/`) and for confirmation gates with non-trivial branching. Inline text questions are the fallback only when the host lacks a structured-prompt primitive (Codex). Single card per multi-choice gate beats chained text questions.

## Step 3 — Write the file

Path: `doc/tasks/<NNNN>-<short-slug>.md`. Use the template below.

## Step 4 — Editing guidance for later turns

When the user later works on the task, edit the file by:

* Toggling checkboxes (`- [ ]` → `- [x]`).
* Appending to Notes (date each entry, `### YYYY-MM-DD`).
* Never rewriting existing sections.

Status flips to `done` only when every Acceptance Criterion and every Definition of Done item is checked.

A checkbox is checked only after everything it names has actually happened — never in anticipation. Split a bundled step (e.g. "open PR; merge on CI green") into separate items when its parts complete at different moments; a checked box claiming an unfinished step is a false record.

## Template — `doc/tasks/NNNN-<slug>.md`

Use the task template in [references/task-template.md](references/task-template.md) — fill its placeholders; checkbox items stay unchecked until the work actually happens.

## Output contract

A single new file at `doc/tasks/<NNNN>-<short-slug>.md`. Status `proposed`.
Its non-empty `Scope ref` resolves to a repository-local source artifact.
Notes empty. No existing tasks modified. No invented values.

Task files are decision-record artifacts and are **exempt** from the no-dates rule (Documentation Discipline §2): the `**Created:**` field anchors the task in time and the append-only `Notes` log is dated per entry by design. The remaining Documentation Discipline rules (`WORKFLOW.md` §2) apply at write time:

- No emoji anywhere in the file.
- `Context` is the business-context-first section — *why this task exists* and *what would break without it* before *Acceptance Criteria*.
- One scope: one task per file. If the user's request implies multiple deliverables, ask which to write first; the others become follow-up tasks.
- No speculation. Acceptance criteria must be measurable; do not list aspirational items ("loads in under 2s", not "fast enough").
- `Notes` is append-only and dated per entry — that is the auditability primitive, not a violation of Rule 2.

## Next

- Implement. Toggle Acceptance Criteria checkboxes and append to `Notes` as work lands.
- `/ad-review main..HEAD` (or current scope) before merge — the task DoD requires a fresh-context §10 review.
- Flip Status to `done` once every Acceptance Criterion and Definition-of-Done item is checked.
- If the task implements a spec, the spec's `Related → Tasks` list should reciprocate the link.
