# ADR-0040: Report-for-a-decision-maker as an eighth `ad-philosophy` behavior

**Status:** proposed
**Date:** 2026-07-28
**Deciders:** Alexandre Alvaro

## Context

[ADR-0031](0031-decide-when-grounded-posture.md) adopted the decide-when-grounded posture: the agent works as an employee reporting to a boss, brings decisions with a recommendation, and escalates only genuine judgment calls. That rule governs *whether* to decide or ask. It does not govern *how the result is reported* — and the reporting is where the posture still leaks.

The observed failure mode in working sessions: reports written for the author, not the reader. Raw artifacts dumped as if they were conclusions (a metric with no meaning attached, an error trace with no "so what", a file list instead of a finding); references to session state the reader never saw ("the fix from before", "that error"); jargon dense enough that the reader must re-derive the point; decisions buried mid-paragraph after the evidence. The boss in the ADR-0031 framing did not watch the session — a report that requires replaying it forfeits exactly the synthesis work the posture exists to deliver.

`ad-philosophy` is the kit's posture locus: seven behaviors that auto-load on every non-trivial change. ADR-0031 already rejected a separate posture skill once — posture must fire every session, not when invoked.

## Decision

Add an **eighth behavior** to `ad-philosophy` (both host files): **Report for a Decision-Maker**.

The behavior's content, generalized and generic:

- **Lead with the conclusion.** What happened, what it means, what comes next — in plain terms first; supporting technical detail after, for whoever wants it.
- **Self-contained.** Assume the reader just arrived and saw nothing of the session; give the minimum context that makes the conclusion stand on its own — no references to unexplained earlier state.
- **Translate, don't dump.** Raw artifacts (metrics, error output, file lists, diffs) become what they *mean* and what to *do*; the artifact alone is not a report.
- **Expand jargon and acronyms on first use**, with the implication stated. Assume an intelligent reader not immersed in the subsystem's minutiae.
- **Clarity over compression.** A clear, slightly longer explanation beats a dense one; never optimize a report for brevity at the cost of the reader's understanding.
- **Decisions arrive shaped.** When the report carries a decision: options with the recommendation first (per *Decide When Grounded*) and trade-offs in value terms, not implementation guts.

Placement: after *Verify Before Claiming Done* — reporting is the act that follows verification, mirroring ADR-0031's placement logic (the behavior sits after the step whose output it consumes). Frontmatter `description` and `summary` gain the new behavior; the two "seven behaviors" count references in each host file become "eight". The codex `agents/openai.yaml` `short_description` is refreshed in the same pass — it enumerates the behavior list this change extends, and was already stale (missing ADR-0031's seventh). No other file changes beyond the regenerated dogfood install, state, and managed AGENTS.md row.

## Consequences

Positive:

- The posture chain closes: decide when grounded (ADR-0031) governs the decision; this behavior governs its delivery. The reader gets conclusions they can act on without replaying the session.
- No new skill, no new session-load cost — the behavior rides the existing auto-load surface, exactly as ADR-0031's rejection of a posture slash-command prescribed.
- Generic: the behavior addresses any agent-to-human report (chat summaries, PR bodies, handoffs), not one team's conventions.

Negative / trade-offs:

- `ad-philosophy` grows again; each addition dilutes the others' salience. Accepted: the behavior is the missing half of an already-adopted posture, not a new concern — and the alternative (a ninth document) costs more than it adds.
- "Clarity over compression" can be misread as license for verbose reports. The behavior's own first bullet (lead with the conclusion) is the counterweight.

## Alternatives Considered

- **A new posture or communication skill** — rejected. ADR-0031 already rejected posture-as-invocable-skill: posture must fire every session; a slash command fires when invoked.
- **A `WORKFLOW.md` TL;DR / §7 addition** — rejected for now. WORKFLOW §7 already carries the decision-shape rule ("one question, recommended answer first"); this behavior elaborates delivery at posture level, like *Simplicity First* and *Surgical Changes*, which also live only in `ad-philosophy`. Revisit if downstream projects need the principle without installing the skill.
- **Fold the bullets into the existing *Decide When Grounded* behavior** — rejected. That behavior governs the decide/ask fork; reporting applies to every report, including ones carrying no decision. Merging would bury the delivery rules under a differently-scoped heading.
- **Do nothing** — rejected. The failure mode recurs in practice, and it forfeits the synthesis value the decide-when-grounded posture exists to produce.
