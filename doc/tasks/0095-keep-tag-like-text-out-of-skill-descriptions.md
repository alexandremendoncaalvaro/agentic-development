# Task `0095`: Keep tag-like text out of skill descriptions

**Status:** done
**Created:** 2026-10-06
**Scope ref:** src/skills/claude-code/ad-skill/SKILL.md (Step 2); test/skills.test.js (description caps)
**Evidence ref:** doc/research/0032-reference-skill-repos-delta.md (E1)
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The Agent Skills field requirements forbid XML tags in a skill's
`description`, and dotnet/skills had to strip the same pattern on 2026-10-05
after Claude rejected it (RESEARCH-0032 E1). Twelve kit descriptions carry
`<slug>` or `<name>` in a path: `ad-adr`, `ad-research`, `ad-skill`,
`ad-spec`, `ad-subagent` and `ad-task`, on both hosts. Local Claude Code
loads them, so nothing breaks today for an installer user; the exposure is an
upload to claude.ai or the API, or a marketplace sync. No test stops the
pattern, and `/ad-skill` does not tell an author about the rule, so it would
come back.

The fix rewrites the twelve paths without angle brackets, adds a test that
rejects tag-like text in every description while still allowing a plain
comparison such as `a < b`, and adds the rule to `/ad-skill` Step 2 on both
hosts.

## Acceptance Criteria

- [x] No kit skill description, on either host, contains tag-like text: an opening, closing or self-closing tag, a comment, a processing instruction, or CDATA.
- [x] A test fails on such text in any description and passes on comparisons such as `a < b`, `>5s` and `i<length && count>0`.
- [x] `/ad-skill` Step 2 on both hosts states that a description cannot contain XML tags.
- [x] The dogfood installs are refreshed, `npm run verify` passes, and `CHANGELOG.md` records the change under `[Unreleased]`.

## Plan

- [x] Red: the tag check in `test/skills.test.js`, with its own matcher cases, failing on the twelve descriptions.
- [x] Green: rewrite the twelve descriptions; add the rule to both `/ad-skill` bodies; refresh the dogfood install.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-06

Opened from RESEARCH-0032, recommendation 1; the owner approved the
backlog in chat. The matcher follows dotnet/skills
`eng/skill-validator/src/Check/SkillProfiler.cs` at `1603d1b6`: a tag is a
name followed only by bare words or `name=value` attributes, plus comments,
processing instructions and CDATA, so spaced and unspaced comparisons pass.

Red, then green: the per-skill tag check failed on exactly the twelve
descriptions (668 tests, 12 failures) before the rewrite and passed after it;
`npm run verify` passed with 1237 tests and no audit finding.

Fresh-context review on both axes (handoffs and verdicts persisted under
`.agentic/reviews/20261007T020758Z-working-tree-*`): no Blocker on either
axis. One Standards Concern, accepted: the matcher flags an unspaced
word-only comparison such as `a<b and c>d`, which the comment's "comparisons
stay allowed" did not admit and no case covered. That is the reference
behaviour, so the comment now states it and the matcher test pins the case.
Notes left as they are: the check covers `description` only (no skill uses
`when_to_use`), and `summary:` keeps its placeholders because it is not a
skill description.

### 2026-10-06 — audit dispositions

The fresh-context review files named above are local and gitignored by
design (`.agentic/reviews/`); the findings and their dispositions quoted in
this log are the durable record. The `/ad-audit` over this change, run with
the research studies and Task 0096 on one branch, raised two items here:
the per-skill tag test is now named `regression: task-0095 ...` (GUIDELINES
§9.5), and `ARCHITECTURE.md` lists the tag ban among the caps
`test/skills.test.js` holds. The red-before-green order is not checkable by
commit ancestry, because test and fix landed in one commit; the auditors
re-derived it independently, the shipped matcher flags 12 of 92 descriptions
at `1fedcfd` and none after the change.

### 2026-10-06 — re-audit

The re-audit resolved the earlier items. The 668- and 1237-test counts in
the entries above are session outputs that were not retained; the retained
evidence is the 12-of-92 matcher result, which a reviewer re-derived, and the
final gate (1244 tests, 0 failures, 0 vulnerabilities).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
