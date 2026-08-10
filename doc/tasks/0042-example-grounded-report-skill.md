# Task `0042`: Add an example-grounded report skill (working name `ad-report`)

**Status:** proposed
**Created:** 2026-08-07
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** `<blank — design together with task 0041 via /ad-grill-me + /ad-spec>`
**Board ref:**

## Context

Distinct from publishing into a collaboration surface (task 0041), the user regularly produces **standalone reports of a study, an analysis, or a front/initiative they ran** — frequently as **HTML**. Today they repeat the same instructions each time: find the best existing reports as reference (their own and the team's), use them as the bar, craft it carefully (BLUF, the content that matters at the top, diagrams / data-viz), and always mind the same recurring concerns.

This is the report-shaped sibling of task 0041. Same DNA — ground in the best examples (the user's own and the team's), optional external niche research on how good reports of this kind look, same-or-better, BLUF, diagrams — but a different artifact: a standalone deliverable (often HTML), not a comment/proposal inside a tracker. Split out from 0041 at the user's request because the two are genuinely different things (medium, audience, lifecycle).

## Acceptance Criteria

- [ ] A skill exists (both hosts) that triggers when the user is about to produce a report / deliverable of a study, analysis, or initiative (including HTML reports).
- [ ] Before drafting, it **grounds in the best existing reports**: the user's own past reports of that kind AND the team's best ones, plus the house rules, and cites what it learned from each.
- [ ] Optionally researches **external niche models** of strong reports for that domain when unfamiliar or asked — cited, not from memory.
- [ ] Produces a report that leads with what matters (BLUF), is audience-aware (business POV *and* technical POV), uses diagrams / data-viz where they clarify (integrates the `dataviz` skill's discipline), and — when HTML — is polished and self-contained.
- [ ] Carries an "always mind" checklist for reports (the recurring concerns the user repeats by hand today), captured once so it is applied every time.
- [ ] States explicitly how the report is **same-or-better** than the best exemplar it found.
- [ ] Shares ONE curated exemplar/template library with task 0041 (per-type entries: publication types and report types), each annotated with advantages / disadvantages / when-to-use, improved over time through the skill (HARD human-in-the-loop for writes, like `ad-level-up`).
- [ ] Never exports/publishes the report without explicit user approval.

## Plan

- [ ] `/ad-grill-me` to sharpen scope **jointly with task 0041**: what is shared (example-grounding, curated library, same-or-better core) vs report-specific (HTML output, data-viz, the always-mind checklist).
- [ ] `/ad-spec` (Layer 4) covering both 0041 and 0042 if the shared core warrants one spec.
- [ ] `/ad-adr` for the shared design decisions (exemplar-library location/layering; shared-core vs two-skills split).
- [ ] `/ad-skill` to draft the report skill at `src/skills/claude-code/<name>/` and `src/skills/codex/<name>/`, dual-host.
- [ ] Wire per ADR-0056 (references/ for report templates) and ADR-0057 (scripts/ for deterministic gathering, e.g. fetching prior reports / assembling an HTML scaffold).
- [ ] Integrate the `dataviz` skill for any charts; keep HTML self-contained per the artifact/report conventions.
- [ ] Register in `src/lib/profiles.js`; refresh AGENTS.md skills table; `npm test` green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-07

Split from task 0041 at the user's request: "dava pra separar em duas coisas — uma é a publicação [0041], a outra são aqueles relatórios de algum estudo, análise ou frente que eu fiz. Um seria tipo um report." The user explicitly likes HTML reports and repeats the same setup each time ("procura os melhores reports como referência, cria, sempre se preocupa com isso, isso, aquilo").

Shared with 0041 (design together, ship as two skills):
- Example-grounding: the user's own + the team's best, plus a "round" of the house rules, to do it same-or-better.
- One curated exemplar/template library with per-type entries (publication types + report types), advantages/disadvantages/when-to-use, improved via the skill (audit/level-up shape).
- Optional external niche research; BLUF; audience-aware (business + technical).

Report-specific (this task):
- Standalone deliverable, often HTML (self-contained); data-viz via the `dataviz` skill; an "always mind" checklist for the recurring report concerns.

Open design questions (resolve in the joint grill/spec):
1. Shared core module vs two fully-independent skills.
2. Where "the team's best reports" live and how they are fetched (files, shared drives, prior HTML artifacts) — tool-dependent; degrade gracefully, never fabricate.
3. HTML output path: inline the artifact conventions vs a bundled scaffold in references/.
4. Naming: working name `ad-report`; weigh alternatives in grill.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
