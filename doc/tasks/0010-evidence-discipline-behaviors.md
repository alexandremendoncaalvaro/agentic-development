# Task `0010`: Evidence-discipline additions to `ad-philosophy` and WORKFLOW §7

**Status:** in-progress
**Created:** 2026-07-28
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

[ADR-0042](../adr/0042-evidence-discipline-behaviors.md) lands three evidence-discipline additions where an adversarial multi-lens curation pass (12 verdicts, zero refutations) placed them: relayed-status + flakiness-distribution rules in *Verify Before Claiming Done*; an enumerate-the-violation-class transform in *Goal-Driven Execution*; an *Insufficient evidence* case in *Decide When Grounded* mirrored into its canonical source, WORKFLOW §7. Grounded in the top friction class of a 123-session usage analysis.

## Acceptance Criteria

- [x] *Verify Before Claiming Done* (both hosts): the "Can't verify it? Say so" bullet extended in place to cover relayed session/agent/handoff claims with re-run-and-state-observed + explicit UNVERIFIED; new flakiness bullet requiring N ≥ 10 pass/fail distribution, one unreproduced failure proving nothing.
- [x] *Goal-Driven Execution* (both hosts): new transform — gate/reviewer flagged violation → enumerate every instance of the class across the change, fix and verify all together, never just the named instances.
- [x] *Decide When Grounded* ask-list (both hosts) and WORKFLOW.md §7 ask-list: new **Insufficient evidence** case (no autonomous follow-up creation from a single unreproduced observation; mention, don't file). WORKFLOW text carries no kit ADR reference (Documentation Discipline rule 12).
- [x] No behavior-count change (still eight); frontmatter untouched; managed AGENTS.md table unchanged.
- [x] Dogfood regenerated; state re-keyed; `npm test` green (CI confirms Node 20 / 22).

## Plan

- [x] Branch `feat/ad-philosophy-evidence-discipline` off `main`.
- [x] Apply the three edits per host + the WORKFLOW §7 bullet.
- [x] `node bin/agentic.js update --yes --force`; `npm test`; two-axis §10 review; PR; merge on CI green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-28

Candidates vetted BEFORE authoring via a 12-verdict adversarial pass (one isolated `rule-candidate-reviewer` per lens per kit candidate — ad-level-up method dogfooded): zero refutations; the lenses split C1 (relay rule sharpens the existing bullet in place; N-run flakiness bar is net-new), moved C2 from Verify to Goal-Driven Execution (would dilute verification mechanics; fits the section's task-to-goal transform shape), and moved C3 from Surgical Changes into the Decide-When-Grounded ask-list with a WORKFLOW §7 mirror (that section's declared canonical source — skill-only would be mirror-canon drift). C3's single-incident recurrence graded thin by the lens; offset by the class-level evidence (seven "excessive changes" incidents in the same report) and recorded in ADR-0042 for future re-grading. Alê delegated approval for strong-evidence survivors ("se a evidência é forte e bem embasada não precisa me perguntar"). `npm test` 226/226 green; dogfood byte-identical both hosts.

Two-axis §10 review, findings treated adversarially. Spec axis: all ACs MET; one real Concern — the claude-code Goal-Driven transform carried a rationale clause ("each miss buys a full extra review cycle") absent from the ADR Decision and the codex host — fixed by dropping it (ADR-decided sentence now verbatim in both hosts). Standards axis: (a) ACCEPTED — "chips" in the landed rule text was host-specific jargon leaking into the npm-shipped universal WORKFLOW.md (only defined in kit-internal ADR-0039); generalized to "(tasks, issues)" across all surfaces plus the ADR Decision text (same-commit mutable); the ADR Context keeps "chips" naming the actual incident. (b) REJECTED with evidence — relocating the Insufficient-evidence case to the "Default is decide" list: the "Ask only when" list already carries a non-question member (Fuzzy spec → route to /ad-grill-me), so its semantic is "don't act unilaterally", the vetting placement lens chose it deliberately, and the text prescribes "mention it in the report", contradicting the speculated ask-noise failure mode. (c) SUPERSEDED — codex parity on the rationale clause: the Spec-axis fix (drop from claude-code) already restored parity the ADR-faithful way. (d) NOTED — Plan-checkbox-before-PR is established task-file convention (0002/0007); candidate for a future task-semantics cleanup, out of scope here.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
