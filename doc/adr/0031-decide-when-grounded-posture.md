# ADR-0031: Decide-when-grounded posture — agent as employee, not co-pilot

**Status:** accepted
**Date:** 2026-07-01
**Deciders:** Alexandre Alvaro

## Context

The kit's posture skill (`ad-philosophy`) told the agent to "state assumptions explicitly, ask when uncertain" (Think Before Coding rule, `ad-philosophy` §1). WORKFLOW §7 (Action Commands With Stop Criteria) bounded *what to do*, not *whether to ask*. The result in dogfood sessions: the agent surfaced every fork as a user question, even when the fork had been resolved by `/ad-ground` (canonical happy path with citations across four sources) or by `/ad-tdg` (three approaches, one clear single-criterion winner).

Concrete failure mode: user asked for a small refactor; agent ran `/ad-ground`, got a citation-backed happy path, and still returned "here are three approaches — which do you want?" The synthesis work the skill was designed to do got pushed back to the user, who was not reading every doc the agent read. The user's stated framing: "the LLM should act like an employee doing work for a boss — the boss doesn't see every file; bring decisions with a recommendation, and only ask when the choice needs human judgment."

WORKFLOW §12 already framed the bottleneck as *discrimination, not generation* — the engineer catches what is almost right but wrong. That framing assumed the agent brought decisions to catch. The posture skill did not enforce the bringing.

## Decision

Adopt the **decide-when-grounded** posture. Two loci:

1. **WORKFLOW.md** — add TL;DR #21 (universal principle, downstream-visible) and a `§7` subsection "Decide when grounded, ask when judgment" (operational rule).
2. **`ad-philosophy`** (Claude Code + Codex mirrors) — add a seventh behavior after Ground Before Coding (the rule depends on grounding having been done, so it reads more naturally as the step that consumes grounding output). Think Before Coding is amended in place to route uncertainty through the Decide When Grounded rule instead of ending in a raw "ask." The skill restates the operational rule as skill-loaded posture that fires every non-trivial session.

The rule shape:

**Default is decide, not ask.** Four grounded-decision categories the agent takes without asking:

- `/ad-ground` returned a canonical happy path with citations across the four sources.
- `/ad-tdg` produced three approaches with one winner on the picked single criterion.
- Well-established industry pattern, canonical library, statistically dominant shape.
- Deterministic outcome (type-check + tests + gate scripts all green) — state as done.

**Ask only when the choice needs human judgment.** Four escalation categories:

- Design or taste (UX shape, product tradeoff, brand-carrying naming).
- Irreversible or high blast radius (destructive git ops, force-push, deletion) — confirmation matches blast radius, not diff size.
- Genuinely close calls (two options tied on the picked criterion).
- Fuzzy spec — route to `/ad-grill`, not a raw open question.

**Shape of the ask when warranted:** one question, recommended answer first, why the alternatives are weaker. Not a survey of every option considered.

## Consequences

Positive:

- The synthesis work the grounded skills do (`/ad-ground`, `/ad-tdg`) is actually consumed instead of being handed back to the user.
- The user's attention lands on the calls that require judgment, not on ratifying what research already resolved.
- WORKFLOW §12's discrimination framing gets a matching production step: the agent produces decisions, the engineer discriminates.
- Downstream projects installing the kit inherit the posture — TL;DR #21 is universal, not kit-specific.

Negative:

- Agents that over-index on "decide when grounded" may take irreversible action without confirmation. The escalation category "irreversible / high blast radius" is the counter, but it depends on the agent recognizing blast radius. Reinforcement lives in `ad-philosophy` and the executing-with-care rule in the harness.
- Bad grounding (thin citations, no in-repo pattern, weak criterion) will now produce silent bad decisions instead of loud bad questions. Countermeasure: `/ad-ground`'s four-source AND requirement — no source, no happy path.
- The "close calls" and "genuinely fuzzy" categories are judgment calls themselves. The rule cannot ground its own escalation choice. Acceptable — the posture is a bias, not a decision procedure.

## Alternatives

- **Keep the current posture, add a note in `/ad-ground`.** Rejected. The problem is universal to every skill that produces a grounded recommendation, not specific to `/ad-ground`. A one-skill note leaves `/ad-tdg`, `/ad-tdd`, `/ad-diagnose` still teaching the agent to defer.
- **New skill (`/ad-decide` or similar).** Rejected. The rule is posture that must fire every session; a slash-command skill fires when invoked. `ad-philosophy` already auto-loads on non-trivial work — that is the correct locus.
- **Add a hard rule to `AGENTS.md` only.** Rejected. `AGENTS.md` is project-specific and would not propagate to downstream projects. The principle is universal — belongs in `WORKFLOW.md`, kit-adopted by this ADR (WORKFLOW §2 rule 12, universal-vs-kit-state separation).
