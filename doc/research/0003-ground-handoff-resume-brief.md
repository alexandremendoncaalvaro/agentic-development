# GROUND-0003: Separate handoff preparation from the resume brief

**Status:** recorded
**Decision:** Keep the full handoff as the agent's private continuity packet, but make the new session expose only a compact preparation receipt and an executive resume brief.
**Decision ref:** doc/tasks/0057-shorten-handoff-resume-brief.md
**Confidence:** Strong

## Decision and confidence

The happy path is a two-layer resume. The incoming agent reads the complete
handoff, rules, referenced artifacts, live state, and applicable method skills,
then reports only a short checklist proving those preparation categories were
covered and a plain-language brief containing the final objective, roadmap arc,
current focus and rationale, definition of done, and human attention needed.
This is a Strong decision for a medium-stakes, reversible prompt change: official
handover guidance, human-factors research, public agent implementations, the
repository's reporting decision, and its handoff history converge on the same
separation. The mitigation is a contract test that preserves the private
preparation requirements while forbidding their verbose visible form.

## Evidence

### E1 — Reliable handoff requires full preparation and receiver cross-checking, not visible narration of every preparation step

**Strength:** High
**Provenance:** A1, B1, C1, D2

HSE defines effective handover as preparation, exchange of task-relevant
information, and cross-checking by the incoming operator. The public
`claude-handoff` implementation similarly keeps a detailed durable document but
reduces catch-up output to objective, status, blockers, and first next step. The
repository already carries the full rules in the handoff. These sources support
keeping the work exhaustive while compressing only its human-facing receipt.

### E2 — An executive resume brief must establish perception, comprehension, and projection

**Strength:** High
**Provenance:** A2, B1, B3, C2, D1

Endsley's situation-awareness model distinguishes current cues, their meaning,
and likely future state. GOV.UK operational briefing guidance realizes that model
through goals, roles, plan, and risks, kept short enough for working memory. The
repository's roadmap change already recognized that state without the work's arc
causes a fresh agent to re-derive the plan. Therefore the visible brief needs the
objective, current roadmap position, why the current step matters, what follows,
and what defines completion.

### E3 — The visible report should be organized around the maintainer's information needs and decisions, not implementation internals

**Strength:** High
**Provenance:** A1, A3, C3, D3

HSE says handover content must follow an analysis of the incoming person's
information needs. OPM plain-language guidance says to organize around what the
reader needs to know, use common words, and remove unnecessary wording. ADR-0040
already binds this project to conclusion-first, self-contained, translated
reporting for a decision-maker. Raw read logs, rule excerpts, and command output
do not help the maintainer supervise the front and should remain private unless
they expose a blocker or correction.

### E4 — The highest-value resume content is forward-looking and expensive-to-reconstruct context

**Strength:** Medium
**Provenance:** B1, B2, C2, D1

Two independent public agent-handoff implementations prioritize objective,
current state, next action, decisions, and forward-looking reasoning over a
chronicle recoverable from git. The repository's roadmap and unlanded-ask sweep
serve the same purpose. The evidence is indirect because these implementations
do not evaluate this maintainer's exact briefing preference, but the requested
experience supplies the missing direct product constraint.

### E5 — A concise preparation receipt can preserve observability when it names coverage categories and surfaces corrections

**Strength:** Medium
**Provenance:** A1, A2, C1, C4, D2

HSE requires incoming cross-checking and GOV.UK recommends a short structured
brief. The current handoff and ADR-0044 make preparation observable through a
long applied-binding statement. For the resume case, a checklist naming rules,
context, live state, and method retains visible coverage; any rule-driven plan
correction or unmet prerequisite must be surfaced in the executive brief. This
changes the audit's presentation, not the rules applied.

## Source register

- **A1:** UK Health and Safety Executive, "Shift handover," https://www.hse.gov.uk/humanfactors/topics/shift-handover.htm (accessed 2026-08-19 via browser and `curl`; preparation, task-relevant exchange, incoming cross-check, and receiver-needs analysis reopened)
- **A2:** UK Maritime and Coastguard Agency, "Leading for safety - Communication and teamwork," https://www.gov.uk/guidance/leading-for-safety/5-communication-and-teamwork (accessed 2026-08-19 via browser and `curl`; shared mental model, goals, plan, risks, and short briefing guidance reopened)
- **A3:** U.S. Office of Personnel Management, "Plain Language," https://www.opm.gov/information-management/plain-language/ (accessed 2026-08-19 via browser; audience needs, logical organization, common words, and unnecessary-word guidance)
- **B1:** `briansmith80/claude-handoff@4588729:skills/catchup/SKILL.md:43` and `skills/handoff/HANDOFF.template.md:14` (accessed 2026-08-19 via pinned local clone; detailed handoff plus approximately five-line catch-up brief)
- **B2:** `Sonovore/claude-code-handoff@c6cb717:handoff.md:10` (accessed 2026-08-19 via pinned local clone; forward-looking decisions and next-step reasoning outrank recoverable history)
- **B3:** Mica R. Endsley, "Toward a Theory of Situation Awareness in Dynamic Systems," DOI 10.1518/001872095779049543 (accessed 2026-08-19 via publisher abstract; attention and working-memory limits, mental models, and goal-directed situation awareness)
- **C1:** `src/skills/codex/ad-handoff/SKILL.md:79` and `src/skills/claude-code/ad-handoff/SKILL.md:108` (accessed 2026-08-19 via local read; full working rules are deliberately embedded in the ephemeral packet)
- **C2:** `src/skills/codex/ad-handoff/SKILL.md:39`, `src/skills/codex/ad-handoff/references/handoff-template.md:44`, and `src/skills/codex/ad-handoff/references/handoff-template.md:49` (accessed 2026-08-19 via local read; roadmap carries the work arc, priority, and proof)
- **C3:** `doc/adr/0040-report-for-a-decision-maker-behavior.md:15` (accessed 2026-08-19 via local read; reports lead with conclusions, translate artifacts, and shape real decisions)
- **C4:** `doc/adr/0044-explicit-invocation-recommitment-mode.md:18` (accessed 2026-08-19 via local read; explicit posture application is observable and task-specific)
- **D1:** `git show 5d5db48 -- src/skills/codex/ad-handoff/SKILL.md` (accessed 2026-08-19 via git; added roadmap and unlanded-ask recovery because snapshots lacked the work arc)
- **D2:** `git show 70cb99f -- src/skills/codex/ad-handoff/SKILL.md` (accessed 2026-08-19 via git; embedded working rules after reference-only handoffs under-delivered)
- **D3:** `git show ab28f62 -- src/skills/codex/ad-handoff/SKILL.md` (accessed 2026-08-19 via git; restored the thirty-second comprehension target and plain-language reporting)

## Limitations and reversal

No source measures this exact resume format with this maintainer, so the optimal
word count is not established. The design therefore uses a one-screen target and
stable information categories rather than a brittle character cap. Repeated use
showing that the checklist fails to catch skipped preparation, or that the brief
still cannot answer objective, position, next move, completion, and human-attention
questions at a glance, would reverse or refine this decision.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0003-ground-handoff-resume-brief.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
