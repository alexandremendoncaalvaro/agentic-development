# ADR-0076: Compose a canonical decision-maker brief

**Status:** accepted
**Date:** 2026-09-10
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0053 — moves the shared thirty-second decision-maker presentation out of `ad-roadmap`; roadmap reconciliation, scopes, metrics, and checklists remain unchanged.
**Amends:** ADR-0073 — reclassifies `ad-rules` as model-invocable so natural correction gestures can reach it; its outward-action classification rule remains unchanged.

## Context

The kit tells agents to report for a decision-maker, but it has no reusable operation for the maintainer's recurring “I just arrived; brief me” request. `ad-philosophy` owns the universal posture. `ad-roadmap` independently formats a thirty-second overview before its checklist. `ad-handoff` independently formats an executive resume brief inside a persistent handoff. `ad-rules` resolves and inventories rules but stops before applying them or explaining the corrected plan. The same human need is therefore implemented several times, and no skill owns it when asked outside a roadmap or handoff.

The maintainer needs one plain-language report that restores enough context to act: what project this is, the final objective, what just happened, what is being done now and why, where the work goes next, what proves completion, what is blocked, and whether owner judgment is required. It must work from a natural request in the conversation language, including “brief me”, “give me a summary”, “where are we?”, and equivalent wording, without turning private owner reporting into an outward publication.

Composition must preserve existing specialist boundaries. Roadmap owns plan reconciliation and task checklists. Handoff owns persistence, redaction, lost asks, and repository hygiene. Rules owns resolution and topic inventory. Philosophy owns the decide-versus-ask and reporting posture. Publish and voice own outward text, language adaptation, privacy, approval, and authorization. Copying any of those contracts into a briefing would make drift and accidental bypass more likely.

Grounding is recorded in `doc/research/0013-ground-decision-maker-brief-composition.md`.

## Decision

We will add `ad-brief` as a dual-host, model-invocable, read-only workflow skill. It owns one operation: turn settled project and session facts into a decision-ready briefing for a maintainer who has just arrived.

Its default output will fit on one screen and lead with the conclusion. It will explain, in plain language:

1. the project and final objective;
2. recent results and what they mean;
3. the current target, why it matters, and the immediate next action;
4. the next direction and governing completion condition;
5. blockers, confidence limits, and whether the maintainer must act.

The brief will distinguish live observations from conversational claims. For standalone use, it may read the smallest sufficient live repository state and the active task, spec, decision, or product context. When live state conflicts with remembered conversation, live state wins and the discrepancy is disclosed. It will translate artifacts into implications rather than dump file lists, diffs, or command output.

The decision rule remains owned by `ad-philosophy`. When evidence leaves one clearly superior path, the brief reports the chosen path and why without manufacturing alternatives. When a genuine owner judgment remains, it presents one question, the recommendation first, and only viable competing options, each expressed through value, risk, and reversibility. Absence of an owner decision is reported as “no decision needed”, not as a request for permission to continue.

Composition will be one-way and packet-based:

- A caller that already owns the facts passes a settled fact packet to `ad-brief`, invokes its presentation contract, and then regains control for its remaining specialist output and gates.
- `ad-roadmap` reconciles project- or task-scoped roadmap facts, passes the overview facts to `ad-brief`, and appends its nested checklist and supporting progress evidence. It no longer owns or duplicates the shared briefing rules.
- `ad-handoff` gathers and persists the resumable session packet, passes its resume facts to `ad-brief`, and retains handoff-only preparation, redaction, lost-ask, hygiene, path, and persistence behavior.
- `ad-rules` keeps an inventory mode for requests that explicitly ask which rules exist. `/ad-rules`, “The Rules”, and equivalent correction gestures use correction mode: resolve the rules, apply the existing `ad-philosophy` recommitment to the current task, correct any conflicting next action, pass the resulting facts to `ad-brief`, and then regain control. `ad-rules` becomes model-invocable on both hosts so the natural gesture is discoverable.
- `ad-brief` never invokes `ad-roadmap`, `ad-handoff`, `ad-rules`, `ad-philosophy`, `ad-publish`, or `ad-voice`. It accepts already-settled facts from callers and therefore cannot form a cycle.
- `ad-publish` remains the sole publication orchestrator in this chain and continues to invoke `ad-voice` for every final outward title, body, or reply. A private brief is not publication text, publication approval, or authorization.

The skill description will carry natural briefing triggers and remain inside ADR-0073's per-skill and total model-listing budgets. `WORKFLOW-FLOWS.md` and the affected `## Next` sections will expose the one-way routing. Tests will verify the dependency graph, ownership boundaries, invocation class, host parity, installation, and package contents. Representative installed-skill scenarios will evaluate usefulness where source assertions cannot.

This decision realizes ADR-0040's report-for-a-decision-maker behavior as an on-demand operation and composes ADR-0044's existing recommitment behavior without changing either posture rule. It partially amends ADR-0053's presentation ownership and ADR-0073's `ad-rules` class membership; their remaining decisions continue to bind.

## Consequences

Positive:

- The maintainer gets one memorable “brief me” operation that works during active work, not only at roadmap or handoff boundaries.
- Roadmap, handoff, and rules share one presentation contract without surrendering their fact collection, persistence, or gate responsibilities.
- Natural “The Rules” becomes an observable correction of the active plan, while explicit rules-inventory questions remain available.
- The dependency graph is acyclic, and outward publication still passes through the stronger privacy, voice, language, and approval contract.

Negative / trade-offs:

- The kit gains one more model-invocable skill and spends part of the constrained listing budget. This is accepted because the operation has independent triggers, input, output, and at least three composing callers.
- Skill composition is expressed through instructions rather than a host-neutral runtime API. Static tests can prove the declared graph and ownership boundaries, but representative dogfood scenarios remain necessary to evaluate the rendered brief.
- `ad-rules` natural-language discovery can over-trigger on an ordinary inventory question. The explicit two-mode classifier and reversal condition in the ground record limit that risk.
- A one-screen default can omit useful detail. The brief may expand when clarity requires it, but it may not replace synthesis with a raw artifact dump.

## Alternatives Considered

- **Keep briefing only as universal `ad-philosophy` posture.** Rejected. Posture governs every report but is not a discoverable standalone operation and cannot be composed as a stable output contract.
- **Fold standalone briefing into `ad-roadmap`.** Rejected. A session brief can exist without a roadmap request, while roadmap must retain plan reconciliation, scopes, metrics, and checklists. Combining them gives one skill two operations.
- **Fold standalone briefing into `ad-handoff`.** Rejected. Handoff writes persistent resumption state and performs redaction, lost-ask, and hygiene work; an on-demand brief is read-only and useful mid-session.
- **Add briefing as another `ad-rules` mode only.** Rejected. Rules correction is one caller, not the general owner; roadmap and handoff would still duplicate presentation behavior.
- **Name the skill `ad-summary`.** Rejected. “Summary” describes compression and overlaps session-summary conventions; “brief” names the decision-ready context, direction, and ask the maintainer requested.
- **Make `ad-brief` call roadmap, rules, handoff, or voice to gather everything.** Rejected. It creates cycles, broadens reads, and moves specialist permissions and verification into the wrong owner. Packet-based composition preserves locality.
