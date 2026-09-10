# Task `0072`: Compose decision-maker briefs across skills

**Status:** `done`
**Created:** `2026-09-10`
**Scope ref:** doc/adr/0076-compose-a-canonical-decision-maker-brief.md
**Evidence ref:** doc/research/0013-ground-decision-maker-brief-composition.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The kit defines how an agent reports to a decision-maker, but the behavior is fragmented across `ad-philosophy`, `ad-rules`, `ad-roadmap`, `ad-handoff`, and the workflow checkpoint. A maintainer returning to one of many sessions needs a plain-language briefing that restores the project, objective, current direction, recent results, and any genuine decision without replaying files or conversation history. The same briefing contract should be composed by broader skills instead of copied, while specialist skills continue to own their facts, permissions, and verification gates.

## Acceptance Criteria

- [x] A validated ground record compares official host guidance, real skill-composition references, in-repo composition patterns, and git history; it supports the capability boundary, invocation policy, name, and reuse model.
- [x] A proposed ADR records whether the briefing is a distinct skill or an increment to an existing owner, how callers pass settled facts and regain control, and which earlier decisions it amends or realizes.
- [x] Both hosts expose one canonical, read-only briefing capability for explicit and natural requests such as “brief me”, “give me a summary”, “where are we?”, or equivalent wording in the conversation language.
- [x] A standalone briefing grounds itself in the current session and live repository state, then explains the project, final objective, recent results, current work and why it matters, next direction, governing completion condition, blockers, and whether the maintainer must act.
- [x] The briefing is understandable to a decision-maker arriving without context: conclusion first, plain language, no raw artifact dump, no unexplained jargon, and a one-screen default that expands only when clarity requires it.
- [x] When judgment is unnecessary, the briefing reports the grounded decision and rationale without presenting alternatives; when judgment is required, it presents the recommendation first and only viable competing options with value, risk, and reversibility trade-offs.
- [x] `ad-roadmap` composes the canonical briefing presentation from roadmap facts and then appends its project- or task-scoped nested checklist without duplicating the briefing rules.
- [x] `ad-handoff` composes the same briefing contract for resume while retaining only handoff-specific persistence, redaction, lost-ask, and repository-hygiene responsibilities.
- [x] An explicit `ad-rules` or natural “The Rules” correction resolves the rules in force, applies the `ad-philosophy` recommitment to the current work, corrects any conflicting next action, and returns the canonical briefing instead of stopping at a topic inventory.
- [x] `ad-publish` continues to invoke `ad-voice` for every outward title, body, or reply; no briefing or rules change duplicates the voice profile, language-approval, privacy, or publication-authorization contracts.
- [x] `WORKFLOW-FLOWS.md`, relevant `## Next` sections, descriptions, summaries, invocation metadata, and tests express the composition chain consistently on both hosts without recursion or ambiguous ownership.
- [x] The project dogfood install is refreshed for both hosts, canonical and installed copies are byte-identical, package contents include the new surface, and realistic briefing, roadmap, rules, handoff, and publication-routing scenarios are verified.

## Plan

- [x] Inventory the current rule, posture, briefing, roadmap, handoff, publication, voice, and workflow-routing contracts; record overlap, ownership, and missing links.
- [x] Run `ad-derisk`; append the prioritized risk register here and retire each critical unknown through `ad-ground`, `ad-grill-me`, `ad-tdg`, or a spike as appropriate.
- [x] Persist and validate the four-source ground record; choose the simplest coherent capability boundary and name.
- [x] Draft the governing ADR and obtain owner acceptance before implementation.
- [x] RED: add one edge-first public-contract test for the first vertical composition slice and observe the expected failure.
- [x] GREEN: implement that slice on both canonical hosts, run the focused test, and refactor only after green.
- [x] Repeat red-green-refactor one behavior at a time for standalone briefing, roadmap composition, handoff composition, rules recommitment, and publication/voice non-regression.
- [x] Update the workflow map and every affected routing surface without copying specialist rules.
- [x] Refresh project dogfood with `node bin/agentic.js update --scope project --agent both --yes`; verify source/install parity and package contents.
- [x] Exercise realistic requests against the installed skills and run the full local gate.
- [x] Run `ad-review`, resolve or refute every finding with evidence, then run `ad-audit` for the team-bound block.
- [x] Run `ad-commit` with an atomic Conventional Commit and DCO sign-off; stop before any new PR or push approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-10

Plan approved by the owner. Initial `ad-derisk` register, ordered by impact times uncertainty:

- **R1 — Capability ownership and name (high impact, medium uncertainty).** A new skill may duplicate `ad-philosophy`, while folding into an existing skill may leave standalone briefing requests undiscoverable. Retire with `ad-ground` across official skill guidance, public compositions, in-repo boundaries, and history; record the binding result in an ADR.
- **R2 — Cross-host composition contract (high impact, medium uncertainty).** “Invoke another skill and return control” may not have identical host mechanics. Retire with official Claude Code and Codex skill documentation plus the existing `ad-publish` composition.
- **R3 — Honest session reconstruction (high impact, medium uncertainty).** A briefing that reads only repository artifacts may miss conversational results, while one that trusts conversation memory may report stale or unverified state. Retire with host context guidance, `ad-handoff` precedent, and deterministic live-state checks.
- **R4 — Rules recommitment semantics (high impact, medium uncertainty).** Changing `ad-rules` from an inventory-only operation into an applied correction can conflict with ADR-0044 ownership or over-trigger on ordinary rules questions. Retire with ADR-0044, ADR-0073, host invocation controls, and explicit routing mode boundaries.
- **R5 — Composition cycles and duplicated policy (medium impact, medium uncertainty).** `ad-roadmap`, `ad-handoff`, `ad-rules`, and a briefing capability can recursively call or restate one another. Retire with a one-way dependency design and tests that assert public ownership boundaries.
- **R6 — Behavioral verification (medium impact, high uncertainty).** Static prose assertions can prove wiring but not that a briefing is useful or that dominated options disappear. Retire with test design grounded in skill-evaluation guidance and realistic fixture requests, with deterministic structural tests only where they observe real routing contracts.
- **R7 — Publication and language invariants (high impact, low uncertainty).** Reworking shared reporting must not bypass `ad-publish` → `ad-voice`, the native-language preview, exact final approval, or private-context isolation. Retire by tracing the existing composition contract and adding regression coverage only where a gap is reproducible.

Grounding selected `ad-brief` as a distinct model-invocable, read-only operation. It owns the decision-maker presentation and standalone live-state gathering; composing skills pass settled fact packets and regain control. `ad-philosophy` remains the universal posture, `ad-handoff` retains persistence, `ad-roadmap` retains reconciliation and checklists, `ad-rules` retains resolution, and `ad-publish` retains the outward `ad-voice` gate. Evidence and reversal conditions are recorded in `doc/research/0013-ground-decision-maker-brief-composition.md`.

ADR-0076 drafted as `proposed`. It realizes ADR-0040 and ADR-0044 without changing their posture contracts, and proposes narrow amendments to ADR-0053 presentation ownership and ADR-0073's `ad-rules` invocation class. Implementation remains gated on owner acceptance.

Owner accepted ADR-0076. The record is now `accepted`; `doc/adr/PROJECTION.md` records the two partial amendments. TDD may begin.

RED for the first composition edge: `node --test --test-name-pattern='ad-roadmap delegates' test/skills.test.js` failed because the Claude Code `ad-brief` directory did not exist. The failure was isolated to the expected missing specialist.

GREEN for the first composition edge: the same focused test passed after adding `ad-brief` to both canonical hosts and routing a settled roadmap fact packet through it. No refactor was needed.

Subsequent TDD slices each began at a missing public boundary and closed green: standalone live-state reconstruction and decision shaping; roadmap template delegation with the checklist retained; handoff resume delegation with persistence, redaction, lost asks, and hygiene retained; `ad-rules` inventory-versus-correction routing with the existing `ad-philosophy` applied-binding contract; and publication privacy plus mandatory `ad-publish` → `ad-voice` language approval.

The workflow-graph test first failed because `WORKFLOW-FLOWS.md` had no return-to-session flow. The added one-way packet graph now proves roadmap → brief, handoff → brief, rules → philosophy → corrected plan → brief, and publish → voice, while rejecting specialist callbacks from `ad-brief`.

Dogfood refresh completed for both hosts. The tracked `AGENTS.md` protection required a second run with `--force-root-doc` to regenerate only the managed skill table. Canonical and installed copies pass the parity suite, and `npm pack --dry-run --json` lists all five `ad-brief` package files across Claude Code and Codex.

The first full gate produced 881 passes and one deterministic failure in the legacy project migration. `ad-diagnose` isolated the cause: adding the return-to-session section changed the exact `WORKFLOW-FLOWS.md` hash used as deletion proof for a legacy kit document. The existing regression test was the correct seam. Adding the new development-copy fingerprint to `LEGACY_KIT_DOC_SHAS` restored safe migration; the focused test and the original full gate now pass. Hypotheses about skill-set divergence, current-state classification, and untracked directories were falsified by the migration action log, which showed every skill and state removed and only `WORKFLOW-FLOWS.md` retained.

Installed-skill dogfood covered five representative requests. A live Portuguese “brief me” result restored the project, final objective, recent result, current target and rationale, next direction, completion condition, blocker, and owner attention without asking permission. An explicit current-task roadmap rendered tasks and subtasks as one checklist while the unqualified default remains project-wide. The natural “The Rules” correction followed the approved ground → ADR → TDD plan rather than stopping at a topic list. The installed handoff template kept the preparation receipt before the canonical brief and retained working rules, durable roadmap, lost asks, hygiene, and redaction. A publication-routing walkthrough kept the briefing packet private, required the conversation-language preview, routed every final outward text through `ad-voice`, and stopped before exact final-text and target approval. No outward action was executed.

The first `ad-review` found three real gaps: the canonical skill guide omitted the new surface, the handoff template could freeze a brief at creation time instead of resume time, and the canonical brief had no explicit confidence field. Each finding was reproduced with a focused failing contract test and closed green. The second review found no Standards or Spec issues; its audit trail is `.agentic/reviews/20260910T183724Z-working-tree.md`.

The maximum `ad-audit` resolved the machine, project, and binding-document rule layers and accounted for all 50 files in the task scope. It found no violations, judgement calls, open questions, or rule gaps. The observed evidence includes 883 passing tests, 55 focused passes, a valid four-source ground record, five packaged `ad-brief` files, 18 byte-identical source/dogfood pairs, a matching legacy-document fingerprint, and no added `TODO` or `FIXME`. The audit trail is `.agentic/reviews/20260910T183952Z-audit-working-tree-task-0072.md`. The CRITICAL claims-verification group carries the skill's standard recommendation for an optional owner-initiated isolated cross-model pass; the inline gate itself is complete.

Task closed after the accepted ADR, edge-first TDD, dogfood, full local gate, two-axis review, and maximum rules audit all completed. The independent Prism adoption study is not part of this task's implementation or decision and remains a separate draft research concern.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
