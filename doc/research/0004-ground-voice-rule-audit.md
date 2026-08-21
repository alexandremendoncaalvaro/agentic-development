# GROUND-0004: Audit every active personal-voice rule before delivery

**Status:** recorded
**Decision:** Make `ad-voice` silently audit the completed draft against every active profile pattern, revise any unmet pattern, and return only when each pattern is satisfied or explicitly overridden by a higher-priority factual or destination constraint.
**Decision ref:** doc/tasks/0058-audit-personal-voice-principles.md
**Confidence:** Strong

## Decision and confidence

Keep the existing profile schema and add a small application-time feedback loop:
enumerate the active pattern IDs, judge each draft against each instruction, revise
every unmet item, and repeat until all items are satisfied or a higher-priority
constraint has a concrete override reason. The audit remains silent unless the
user asks for it or an override materially limits the result. This is the happy
path because external skill guidance recommends checklist-based validation loops,
public voice tools treat profiles as auditable rules and run self-checks, and this
repository already uses exhaustive per-rule accounting in `ad-audit`. No new
schema, runtime dependency, or visible report is needed.

## Evidence

### E1 — A consequential instruction set needs an explicit validation loop, not a broad final reminder

**Strength:** High
**Provenance:** A1, B2, C1, C2, D1, D2

Anthropic's skill guidance recommends a checklist for complex workflows and a
review-revise-review loop before finalization. The public Humanizer skill applies
the same shape through a dedicated self-audit after rewriting. Locally,
`ad-audit` demonstrates the stronger invariant: every selected rule receives a
verdict so a silent omission cannot look like success. The base-tree `ad-voice`
checked only its factual ledger and generic final conditions, leaving active
profile patterns without equivalent coverage.

### E2 — Relational warmth should be operationalized through specific appreciation and respect, not generic praise

**Strength:** High
**Provenance:** A2, A3

Nembhard and Edmondson found that words and actions that invite and appreciate
contributions predict psychological safety and improvement engagement in the
studied teams. Research on intellectual humility converges on recognizing the
limits of one's beliefs and remaining open to others' knowledge. Together these
support observable relational checks while avoiding unsupported personality
inference, inflated praise, or an authoritative posture.

### E3 — Auditable reasoning needs a visible distinction between evidence, inference, uncertainty, and opinion

**Strength:** Medium
**Provenance:** A3, C3

The intellectual-humility literature identifies calibrated recognition of
knowledge limits as the common construct and reports greater openness during
disagreement. The existing voice specification already requires factual
preservation and honest uncertainty. The new audit should therefore test whether
claim strength matches the supplied basis, without demanding a citation for
ordinary preferences or turning conversational prose into an academic paper.

### E4 — Conclusion-first structure and concise supporting context improve comprehension without requiring context loss

**Strength:** High
**Provenance:** A4, A5

GOV.UK content design puts the most important information and required action at
the top while removing only material irrelevant to the reader's task. Nielsen's
usability guidance similarly recommends a short conclusion first, scannable
structure, and moving optional depth out of the primary flow. The convergent
principle is progressive detail: meaning first, sufficient context second, and no
verbosity quota that erases necessary explanation.

### E5 — The audit belongs in application state, while personal principles remain profile data

**Strength:** High
**Provenance:** B1, C1, C3, D1

`voice-layer` keeps an inspectable profile separate from the skill that applies it,
and the current repository contract makes the same separation. The user's
principles remain machine-local, derived profile patterns; the repository change
only guarantees that whatever patterns match a request are checked before the
draft leaves the skill. This preserves the privacy boundary and avoids hard-coding
one person's identity into the shipped kit.

## Source register

- **A1:** [Anthropic, Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), workflow checklists and content-review validation loops (accessed 2026-08-21 via web browser).
- **A2:** [Nembhard and Edmondson, *Making it safe*](https://doi.org/10.1002/job.413), leader inclusiveness, appreciation of contributions, psychological safety, and improvement engagement (accessed 2026-08-21 via Wiley publication page).
- **A3:** [Porter et al., *Predictors and consequences of intellectual humility*](https://pmc.ncbi.nlm.nih.gov/articles/PMC9244574/), recognition of knowledge limits and openness to opposing views (accessed 2026-08-21 via PubMed Central).
- **A4:** [GOV.UK Service Manual, Writing effective letters](https://www.gov.uk/service-manual/design/writing-effective-letters), user needs, important information first, plain language, and relevant context (accessed 2026-08-21 via web browser).
- **A5:** [Nielsen Norman Group, Be Succinct](https://www.nngroup.com/articles/be-succinct-writing-for-the-web/), scannability, inverse-pyramid conclusions, and optional depth (accessed 2026-08-21 via web browser).
- **B1:** [`ymeiri/voice-layer`](https://github.com/ymeiri/voice-layer), inspectable local voice profile, channel-aware application, and explicit checks (accessed 2026-08-21 via GitHub).
- **B2:** [`milock/humanizer:SKILL.md`](https://github.com/milock/humanizer/blob/main/SKILL.md), six-stage writing pipeline ending in a self-audit (accessed 2026-08-21 via GitHub).
- **C1:** [`ad-voice` at the base tree](https://github.com/alexandremendoncaalvaro/agentic-development/blob/5a602c32bd0bb2e4f710c025fa5f4707559e09c3/src/skills/codex/ad-voice/SKILL.md#L56-L60), whose draft-and-verify step checks the invariant ledger but does not enumerate active profile rules (accessed 2026-08-21 via repository read).
- **C2:** [`src/skills/codex/ad-audit/SKILL.md:72`](../../src/skills/codex/ad-audit/SKILL.md), existing exhaustive per-rule verdict and coverage pattern (accessed 2026-08-21 via repository read).
- **C3:** [`doc/specs/0004-personal-voice-layer.md:99`](../specs/0004-personal-voice-layer.md), factual preservation, precedence, and silent normal output contract (accessed 2026-08-21 via repository read).
- **D1:** `git log origin/main --oneline -- src/skills/codex/ad-voice/SKILL.md` found `f692af6`, which introduced the current invariant-ledger application flow (accessed 2026-08-21 via git).
- **D2:** `git log origin/main --oneline -- src/skills/codex/ad-audit/SKILL.md` found `5400127`, which introduced the repository's exhaustive rules-audit pattern (accessed 2026-08-21 via git).

## Limitations and reversal

This instruction-level audit is an agent feedback loop, not a deterministic
semantic proof that a draft sounds like its owner. It can establish explicit
coverage and reduce silent omissions, but human judgment still decides voice
fidelity. A held-out evaluation showing that per-pattern accounting makes drafts
mechanical, verbose, or less recognizable would reverse the decision; the first
mitigation would be to narrow or merge the profile patterns, not to remove factual
precedence or the final audit.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0004-ground-voice-rule-audit.md`, then reopen A1 through D2. The script confirms the evidence map; source inspection confirms the claims.
