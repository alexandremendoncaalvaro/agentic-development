# Task `0041`: Add an example-grounded publication skill (working name `ad-publish`)

**Status:** proposed
**Created:** 2026-08-07
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** `<blank — likely warrants /ad-spec + /ad-grill-me to design before building>`
**Board ref:**

## Context

Every time the user is about to **publish into a collaboration surface** — a proposal in a GitHub issue, a PR comment or body, a board comment — they currently have to repeat the same instructions by hand: find the best existing examples (their own *and* the team's) of that kind of publication, optionally research how that niche is written well externally, lead with the content that matters (BLUF), add sequence diagrams / flowcharts where they clarify, and produce something polished that is **same-or-better** than the best example found.

This is the user's standing `AGENTS.ale.md` directive ("follow the team's established patterns — find the best reference examples and do it same-or-better", "match my voice", "diagrams when they clarify") turned into an operational skill, so the discipline is applied every time instead of re-typed.

It pairs with a curated **exemplar/template library** that improves over time — the same audit-then-curate shape the kit already has for rules (`ad-audit` audits against the rule-set; `ad-level-up` curates it). Here: a skill crafts the publication grounded in the best exemplars, and a curation path keeps the exemplar library sharp (best examples + ideal templates per publication type, each annotated with its advantages/disadvantages and what it addresses in which situation).

## Acceptance Criteria

- [ ] A skill exists (both hosts) that triggers when the user is about to publish into a collaboration surface (GitHub issue proposal, PR comment/body, board comment). Standalone study/analysis reports are a SEPARATE skill — see task 0042.
- [ ] Before drafting, it **grounds in the best existing examples**: the user's own past publications of that type AND the team's best ones, plus the house rules (a "round" of the conventions in force), and cites what it learned from each.
- [ ] Optionally researches **external niche models** ("how is a good GitHub-issue proposal written?") when the type is unfamiliar or the user asks — cited, not from memory.
- [ ] Produces a publication that leads with what matters (BLUF), is audience-aware (business POV *and* technical POV for whoever picks the work up), and uses sequence diagrams / flowcharts where they clarify.
- [ ] States explicitly how the draft is **same-or-better** than the best exemplar it found (what it matched, what it improved).
- [ ] A curated **exemplar/template library** is maintained per publication type, each entry annotated with advantages / disadvantages / when-to-use, and improved over time through the skill (HARD human-in-the-loop for writes, like `ad-level-up`).
- [ ] Never publishes without explicit user approval (publication is an outward, side-effectful act).

## Plan

- [ ] `/ad-grill-me` to sharpen scope: one skill vs a crafter+curator pair; which publication types to seed first; where the exemplar library lives.
- [ ] `/ad-spec` (Layer 4) if the scope is broad enough to warrant a feature spec before building.
- [ ] Decide + record the design decisions via `/ad-adr` (e.g. exemplar-library location and layering; crafter-vs-curator split).
- [ ] `/ad-skill` to draft the skill(s) at `src/skills/claude-code/<name>/` and `src/skills/codex/<name>/`, dual-host.
- [ ] Wire per ADR-0056 (references/ for the templates) and ADR-0057 (scripts/ for any deterministic gathering, e.g. fetching prior examples).
- [ ] Register in `src/lib/profiles.js`; refresh AGENTS.md skills table; `npm test` green.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-07

Captured from the user's framing (idea, not yet designed). Key points in their words, paraphrased:

- The recurring ask: "when I publish something, find the best examples — mine and the team's — so we do it same-or-better." A "round" of the house rules + examples from teammates in the same team/group + the user's own, explicitly to surpass them.
- Sometimes research first, on the internet, how to write publications for that specific niche (e.g. a proposal in a GitHub issue): what is interesting from a business POV and a technical POV for each person who will pick it up.
- Craft with care: content that matters at the top; sequence diagrams / flowcharts; well-polished.
- Recurring publication types named: **GitHub issue proposal**, **PR comment**, **HTML reports** of studies. HTML reports especially — the user likes them and repeats the same instructions each time ("find the best reports as reference, create, always mind X, Y, Z").
- Maintain records of the best examples as **templates/reference**, improving them through the skill — "meio que assim como hoje a gente faz com o audit e o level-up": depending on the type of comment / publication, save the ideal templates and each one's advantage / disadvantage / what it addresses, then publish.

Open design questions to resolve during grill/spec:

1. **One skill or a pair?** A crafter (`ad-publish`) plus a curator for the exemplar library (mirroring `ad-audit` + `ad-level-up`), or one skill with a curate mode.
2. **Where does the exemplar library live?** Same layering as the rule-set (machine store `~/.agentic/…` for cross-project exemplars + project layer `.agentic/…` for repo-specific), or a new store. Reuse the ADR-0035 / ADR-0043 pattern if it fits.
3. **How are "the team's best examples" fetched?** Team publications live in GitHub (issues/PRs), Slack, Confluence — so this is tool-dependent (MCP: GitHub / Slack / Atlassian). Degrade gracefully when those tools are absent; never fabricate exemplars.
4. **Naming.** Working name `ad-publish`; alternatives to weigh in grill.
5. **Overlap to respect, not duplicate:** `ad-ground` (research shape), `dataviz` (chart discipline), `humanizer` (de-AI'ing prose), and the `AGENTS.ale.md` same-or-better / match-my-voice directive.

### 2026-08-07 (auto-trigger idea)

User idea: give the publication skill an **auto-trigger / proactive nudge**, the same shape as the `ad-hooks` Stop-hook that nudges `/ad-handoff` when context runs low (ADR-0055). Detect when the user is about to publish something (publish-intent language, or an outbound action) and proactively suggest firing the skill instead of relying on manual invocation. Design notes for the joint grill/spec: reuse the ADR-0055 hook-nudge mechanism; keep it a *suggestion* (publishing stays a user-approved, side-effectful act — never auto-publish); scope detection to genuine publish-intent so it does not fire on every mention. Likely applies to the report skill (0042) too.

### 2026-08-07 (scope split)

User refined: this is TWO separate skills. This task (0041) is the **publication** skill — outward-facing text into a collaboration surface (issue proposal, PR comment, board comment). Standalone **reports** of a study / analysis / initiative (often HTML) are their own skill, split out to **task 0042** (working name `ad-report`). The two share the same DNA — ground in the best examples (user's own + team's), optional external niche research, same-or-better, BLUF + diagrams, and ONE curated exemplar/template library with per-type entries — so design them together (grill/spec) even though they ship as two skills.

### 2026-08-11 — installation-plan correction

The Plan line that says to register the skill in `src/lib/profiles.js` is
obsolete. Profiles were retired: every directory under
`src/skills/<host>/` now installs for that host. When this task is built, add
the dual-host source directories, refresh dogfood with
`node bin/agentic.js update --yes`, and rely on the existing source-set parity
tests; do not recreate a profile registry.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
