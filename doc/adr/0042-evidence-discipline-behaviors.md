# ADR-0042: Evidence-discipline additions to the posture behaviors

**Status:** proposed
**Date:** 2026-07-28
**Deciders:** Alexandre Alvaro

## Context

A month-scale usage analysis (123 sessions) ranked one friction class above all others: **claims asserted without evidence the agent itself observed**. Three concrete, recurring shapes: (1) relaying another session's or agent's status ("CI is green on the sibling PRs") as fact without re-running anything — a teammate then found the failing test; (2) declaring flaky behavior "fixed" off a short lucky streak, or labeling tests "flaky" with no distribution evidence; (3) fixing only the violations a reviewer explicitly named — each miss buying a full ~20-minute extra review cycle — and, inversely, inventing follow-up work (tasks, chips) from a single unreproduced observation (the "excessive changes" friction class, seven occurrences).

The kit's posture skill already carries the epistemic stance these violate — *Verify Before Claiming Done* says "Can't verify it? Say so. Don't claim success." — but says nothing about second-hand claims, evidentiary bars for flakiness, remediation scope after a gate finding, or the evidence needed to file follow-up work.

Each candidate rule passed an adversarial multi-lens curation pass (one isolated fresh-context reviewer per lens — already-covered, coherence-and-necessity with the four anti-overfitting gates, placement — per the `ad-level-up` method): no candidate was refuted; the lenses relocated two of them and split one.

## Decision

Three additions to the existing `ad-philosophy` behaviors (both host files), placed where the lenses concluded:

1. **Verify Before Claiming Done** — the existing "Can't verify it? Say so" bullet is sharpened in place to cover relayed claims (never restate another session's, agent's, or handoff's status as fact; re-run the check and state what was observed; otherwise say UNVERIFIED), and a new bullet sets the flakiness bar: distribution evidence from N ≥ 10 runs — one green run, or five, proves nothing, and one unreproduced failure proves no flakiness either.
2. **Goal-Driven Execution** — a new task-to-goal transform in the section's existing example shape: a gate or reviewer flagging a violation becomes "enumerate every instance of that violation class across the change, then fix and verify all of them together" — never just the named instances.
3. **Decide When Grounded, Ask When Judgment** — a new case, **Insufficient evidence**: a single unreproduced observation does not license autonomous follow-up creation (tasks, issues); mention it in the report, file only once it reproduces or the user explicitly asks. Because this section mirrors [WORKFLOW.md](../../WORKFLOW.md) §7 (its declared canonical source), the same case is added to §7's ask-list — adding it to the mirror alone would create mirror-canon drift.

The placement lens moved (2) out of *Verify* (verification mechanics; the bullet would dilute it) and (3) out of *Surgical Changes* (code-diff scope; filing follow-ups is an act-vs-report decision). The already-covered lens split (1): the relay rule extends an existing bullet rather than duplicating it; the flakiness bar is net-new.

## Consequences

Positive:

- The three top evidence-friction shapes get posture-level counters exactly where the existing behaviors already govern the adjacent stance — no new skill, no new section, no session-load growth beyond a few lines.
- The WORKFLOW §7 mirror stays canonical: skill and constitution state the same ask-list.

Negative / trade-offs:

- The N ≥ 10 flakiness bar is a heuristic; some checks are too slow to run ten times. Accepted: the bullet demands the distribution be *reported*, so a constrained run count surfaces explicitly instead of hiding behind "fixed".
- The insufficient-evidence case rests on class-level recurrence (seven "excessive changes" incidents) rather than repeats of the single chip incident; recorded here so a future curation pass can re-grade it.

## Alternatives Considered

- **A new "evidence" behavior or skill** — rejected. Every addition extends a stance an existing behavior already owns; a ninth behavior would fragment the posture (same fold-vs-new reasoning as ADR-0034/ADR-0040).
- **Land the insufficient-evidence case only in `ad-philosophy`** — rejected. That section explicitly defers to WORKFLOW §7 as canonical; a case present in the mirror but absent from the canon is drift by construction.
- **Hooks instead of posture** (e.g. a commit hook demanding proof artifacts) — deferred, not rejected. Deterministic rails per WORKFLOW §11 remain the stronger enforcement; a proof-artifact hook is a separate, heavier decision with its own ADR when wanted. Posture lands now because it costs lines, not infrastructure.
- **Do nothing** — rejected. The friction class is the top-ranked one in a 123-session sample and each shape recurred despite the current rule text.
