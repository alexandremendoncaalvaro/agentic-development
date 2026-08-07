# Task `0039`: ship `ad-question-me` value-first questioner skill

**Status:** done
**Created:** 2026-08-07
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit has no skill for the mid-work "what am I missing that I cannot see?" move — hand a colleague the value you intend, have them raise the questions you are blind to from inside the work, no verdict. `ad-grill-me` sharpens a fuzzy ask *before* research (with recommended answers); `ad-review` / `ad-audit` render verdicts at the *gate*. This task ships `ad-question-me` per ADR-0054: a read-only, value-first challenger whose defining rule is that it asks a question ONLY when it is the owner's judgment call or genuinely un-groundable, and resolves anything answerable from code / docs / spec itself. Output is a ranked set of questions, killer first, with no verdict and no recommended answer.

## Acceptance Criteria

- [x] `src/skills/claude-code/ad-question-me/SKILL.md` exists, read-only (`allowed-tools: Read, Glob, Grep, Bash` — no Write), no emoji, defining-rule front-loaded with PASS/FAIL examples, description triggers-inclusive and ≤1536 chars, summary ≤320 chars.
- [x] `src/skills/codex/ad-question-me/SKILL.md` exists as the compressed twin with identical trigger phrases and the same contract.
- [x] `src/skills/codex/ad-question-me/agents/openai.yaml` declares `interface.display_name`, `interface.short_description`, `policy.allow_implicit_invocation: false`.
- [x] `doc/adr/0054-ad-question-me-value-first-questioner.md` (Status: proposed) justifies the skill, the anti-obvious-question rule as the core decision, and the boundary vs `ad-grill-me` / `ad-review` (rejecting "mode of ad-grill-me" and "third ad-review axis").
- [x] `ad-question-me` registered in the `solo`, `team`, and `mature` universal arrays in `src/lib/profiles.js` (NOT `poc`).
- [x] `node bin/agentic.js update --yes` regenerates the installed mirrors, `agentic-state.json`, and the AGENTS.md skills table.
- [x] README profile-table counts and skills-table row updated to match `profiles.js`.
- [x] `npm test` passes.

## Plan

- [x] Ground in `ad-grill-me` / `ad-next` / `ad-roadmap` shape, `templates/adr.md`, `templates/task.md`, `src/lib/profiles.js`, `test/skills.test.js`, `test/profile.test.js`.
- [x] Write both SKILL.md files, the codex `openai.yaml`, ADR-0054, and this task.
- [x] Register the skill in `src/lib/profiles.js` (solo / team / mature, near the reasoning/challenge cluster; not poc).
- [x] Update README profile counts (solo / team / mature +1) and add the skills-table row.
- [x] Run `node bin/agentic.js update --yes`; capture output.
- [x] Run `npm test`; fix any failures; re-run until green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-07

Skill authored per ADR-0054: value-first questioner that renders no verdict. The defining rule (a question is legitimate only when it is the owner's call OR genuinely un-groundable after a real grounding pass; anything answerable from code/docs/spec is resolved, not asked) is the first MUST in the body, encoded with concrete PASS/FAIL examples, and recorded as the core decision in the ADR. Boundary vs `ad-grill-me` (pre-work / fuzzy-ask / recommends an answer) and vs `ad-review` / `ad-audit` (gate / verdict) stated in both SKILL bodies and the ADR; "mode of ad-grill-me" and "third ad-review axis" considered and rejected. Registered in solo/team/mature only (not poc). ADR-0054 held at `proposed` per the kit convention that the owner accepts later; per that convention (no skill ships without an accepted ADR) it will be ratified to `accepted` on-branch before it lands, at which point this task flips to `done`.

### 2026-08-07 (close)

Owner accepted ADR-0054. Ratified `proposed` → `accepted`; the ADR state projection updated to 30 accepted ADRs in this same commit. This supersedes the "accepts later" phrasing above — acceptance happened on-branch before landing, matching the ADR-0052 precedent. Fresh-context Standards review passed with no blockers; three precision fixes applied, all inside the defining-rule section (codex per-class gate parity restored, the "ONLY (a) or (b)" self-contradiction resolved by folding the value-ask into (a), and a gendered pronoun removed). Full suite green at 417. Task closed.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
