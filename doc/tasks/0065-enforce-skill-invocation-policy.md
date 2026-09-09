# Task `0065`: Enforce the skill invocation policy and listing budget

**Status:** in-progress
**Created:** 2026-09-09
**Scope ref:** doc/adr/0073-skill-invocation-policy-and-listing-budget.md
**Evidence ref:** doc/research/0008-ground-skill-invocation-policy.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit's 43 skill descriptions total 26,274 characters against an 8,000-character Claude Code listing budget; in one observed session 12 skills were listed without a description and could not be auto-invoked (single observation; the reproducible fact is the total against the budget). ADR-0073 classifies every skill by invoker and bounds the model-invocable descriptions. This task implements the decision on both hosts and turns it into tests.

A stray dot-directory (`.slim/eval`, created by a plugin inside `src/skills/claude-code/`) also made 14 tests fail because the skill enumerator treats every directory as a skill. The same enumerator hardening belongs here because the new tests iterate the same set.

## Acceptance Criteria

- [x] The 20 user-invocable skills named in ADR-0073 carry `disable-model-invocation: true` (Claude Code) and `policy.allow_implicit_invocation: false` (Codex `agents/openai.yaml`).
- [x] The 23 model-invocable skills carry no `disable-model-invocation` field (Claude Code) and `policy.allow_implicit_invocation: true` (Codex).
- [x] Every model-invocable `description` is at most 350 characters and opens with its use case and trigger phrases.
- [x] The sum of model-invocable `description` lengths is at most 8,000 characters per host.
- [x] Every `description` on both hosts is at most 1,024 characters.
- [x] `test/skills.test.js` fails on any violation of the four criteria above and names the offending skill.
- [x] The skill enumerator used by the installer and the tests ignores dot-directories under `src/skills/<host>/`, with a test proving a stray `.something/` directory is neither installed nor tested.
- [x] Dogfood copies (`.claude/skills`, `.agents/skills`) are byte-identical to source after `node bin/agentic.js update --scope project --agent both --yes`.
- [x] `AGENTS.md` Gotchas and `CHANGELOG.md` record the classification rule.

## Plan

- [x] Ground: confirm `disable-model-invocation` and `allow_implicit_invocation` semantics and the listing budget in the official docs; write `doc/research/NNNN-ground-skill-invocation-policy.md`.
- [x] Red: add the class, cap, total, and dot-directory tests to `test/skills.test.js` (and the installer test for enumeration).
- [x] Green: harden the enumerator in `src/lib/install.js` and the test helper.
- [x] Green: add the flags to the 20 user-invocable skills on both hosts; set `true` on the 23 Codex model-invocable `openai.yaml` files.
- [x] Green: rewrite the 23 model-invocable descriptions to at most 350 characters, trigger-first; trim the two over 1,024 (`ad-derisk`, `ad-research`).
- [x] Refresh dogfood installs; run the full suite; `npm pack --dry-run`.
- [x] Update `AGENTS.md` Gotchas and `CHANGELOG.md`.
- [ ] `/ad-review`, then `/ad-audit` (ADR-bearing change), `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the workflow-readiness audit (`.context/audit-ad-workflow-readiness.md`). Baseline: 711 tests green after removing the stray `src/skills/claude-code/.slim/` directory.

Ground record `doc/research/0008-ground-skill-invocation-policy.md` validated (`valid: true`). Red: 87 failing assertions across both hosts. Green: `bundledSkills` takes an optional `kitRoot` and skips dot-directories; 21 skills flagged on both hosts; 22 Codex `openai.yaml` files flipped to `true`; 22 model-invocable descriptions rewritten trigger-first (plain YAML scalars cannot carry `: `, so clauses use dashes). Measured after the change: model-invocable descriptions total 6,523 chars per host (budget 8,000); `ad-level-up` trimmed to under 1,024. Full suite 846/846; `npm pack --dry-run` 299 files. Fresh-context review (two axes) corrected the totals: an early awk count included the `description: ` prefix; the parsed totals are 26,274 before and 6,183 model-invocable after, and only `ad-derisk` and `ad-research` exceeded 1,024 (`ad-level-up` was 1,012 and its trim is harmless). The test-side enumerator now reuses `bundledSkills` so one regression test covers both call sites.

`/ad-audit` (six rule-groups dispatched, three N/A with reason, the critical claims group hardened by two cross-model runs with rules and hunks reordered; trail under `.agentic/reviews/2026-09-09T13-21-34Z-audit-*.md`): no blockers. Fixed from its findings: Codex `ad-review` and `ad-audit` descriptions now state the single-pass Codex behavior instead of copying the Claude Code wording (CONTEXT.md); ADR-0073 links this ground record (ADR-0070); regression test named per GUIDELINES 9.5; `bundledSkills` JSDoc documents `kitRoot`; ARCHITECTURE.md test layout and a Patterns bullet for the invocation classes; the "12 of 43" figure is labelled a single-session observation; the 350 cap is described as a chosen round number below 8,000 / 22 = 363; the stale `ad-release` row in the generated AGENTS.md table was regenerated with `--force-root-doc`. Suite 846/846 after the fixes; project and user installs byte-identical to source. A bare `agentic update --yes` refreshed the user-level install, not the repo: the project dogfood needs `--scope project`, and the AGENTS.md gotcha now says so.

Owner decision after the first dogfood commit attempt: the host refused `/ad-commit` because the skill was user-invocable, and forbids the model from reproducing its workflow by other means. The owner chose to reclassify `ad-commit` as model-invocable ("make life easier, not harder; security is one thing, bureaucracy is another"): a commit is local and reversible, while `ad-pr`, `ad-merge`, `ad-release`, and `ad-publish` stay human-fired. Classes are now 20 user-invocable and 23 model-invocable; ADR-0073, the test set, AGENTS.md, and CHANGELOG.md updated accordingly.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
