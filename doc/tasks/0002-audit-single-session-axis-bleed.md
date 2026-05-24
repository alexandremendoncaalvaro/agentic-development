# Task `0002`: `audit Codex ad-review single-session axis bleed against Claude Code two-reviewer split`

**Status:** `in-progress`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`
**Spec ref:** `doc/specs/0002-two-axis-fresh-context-review.md`
**Board ref:** ``

## Context

The Codex variant of `ad-review` (rewritten in commit `3fabb92`) uses a **single-session two-axis review**: one reviewer reads both Standards-axis context (AGENTS / ARCHITECTURE / GUIDELINES / CONTEXT / accepted ADRs) and Spec-axis context (task / spec / PRD / issue), then classifies findings under `## Standards Findings` and `## Spec Findings` headings in the same reply. The Claude Code variant uses the §10 ideal: **two parallel `Task` sub-agents**, each with only its axis's slice of context.

The two-axis dichotomy is borrowed from `mattpocock/skills/review`, where the explicit reason for two reviewers is that one reviewer with both axes loaded rationalizes across them. The Codex variant claims schema rigor (output ordering) substitutes for context separation. The §10 self-review of commit `3fabb92` flagged this:

> `src/skills/codex/ad-review/SKILL.md:111`: Concern: The instruction "Read the diff once, classify each finding into exactly one axis before adding it to the report" is the sole mechanism preventing cross-axis rationalization in the single-session model. […] The reviewer has both Standards and Spec material loaded simultaneously and the instruction is advisory. […] This is a genuine degradation from §10 ideal that is not fully disclosed to the user.

(Audit trail: `.agentic/reviews/20260524T031236Z-v0.17.1-vs-HEAD.md`, Standards Concern #3.)

ADR-0007 Addendum (2026-05-24) already captured the follow-up: "If field evidence shows axis bleed in practice, a future ADR may reintroduce a stricter Codex path."

What breaks without this task: the kit ships a Codex variant that may be silently degrading §10 fidelity. Without field measurement, we cannot decide whether to (a) accept the trade-off, (b) promote the optional user-initiated subagent escalation from the bottom of the skill to the default path, or (c) ship a different structural enforcement (e.g., forcing the agent to produce the Standards-axis findings first, then re-read the diff afresh before producing the Spec-axis findings).

This task assumption being tested: **a single Codex reviewer with both axes loaded will miss Standards findings the Spec axis would have masked (and vice versa) at a measurable rate compared to two fresh-context reviewers on Claude Code reviewing the same diffs.**

## Acceptance Criteria

- [ ] At least 3 historical diffs (PRs / branches / commit ranges) selected for the comparison. Each diff must have material on both axes (i.e. touches behavior covered by ADRs / AGENTS / etc. AND implements a tracked spec or task) so both axes have something to find.
- [ ] Each selected diff run through the Codex variant of `ad-review` — output captured.
- [ ] Same diff run through the Claude Code variant of `ad-review` (two parallel `Task` sub-agents) — output captured.
- [ ] Finding sets compared per diff. A finding is a "miss" if it appears on one variant but not the other AND would have been catchable on the missing side given the context that variant received.
- [ ] Report written to `doc/decisions/axis-bleed-audit-<date>.md` (or appended to ADR-0007 Addendum) with: number of misses per direction (Standards-miss-on-Codex, Spec-miss-on-Codex, Codex-found-but-Claude-missed), severity distribution, qualitative examples.
- [ ] Decision rendered: keep current Codex variant / promote subagent escalation to default / ship structural enforcement / open separate ADR.
- [ ] If the decision changes the Codex variant: SKILL.md edit + commit + dogfood sync.

## Plan

- [ ] Pick 3+ historical diffs. Candidates: `v0.16.0-beta.1..v0.17.0-beta.1` (ad-handoff + first ad-review rewrite), `v0.17.0-beta.1..v0.17.1-beta.1` (broken Codex variant attempt), `v0.17.1-beta.1..v0.17.2-beta.1` (Codex rewrite), `v0.17.2-beta.1..v0.17.3-beta.1` (self-review followups). Each has both Standards (ADR-0007, AGENTS.md, GUIDELINES.md) and Spec (commit-body promises) material.
- [ ] For each diff, invoke Codex variant manually via the kit-installed skill. Capture output to `doc/decisions/scratch/axis-bleed-codex-<diff-slug>.md`.
- [ ] For each diff, invoke Claude Code variant (`/ad-review <range>`). Capture two-axis subagent output to `doc/decisions/scratch/axis-bleed-claude-<diff-slug>.md`.
- [ ] Diff the finding sets. Tag each finding as `both`, `codex-only`, `claude-only`. Of the unique-to-one-side findings, manually re-classify which were missed-due-to-context-blindness vs missed-due-to-reviewer-variance.
- [ ] Write `doc/decisions/axis-bleed-audit-2026-05-NN.md` summarising: methodology, per-diff results, aggregate miss rates per direction, severity skew, decision proposed.
- [ ] If decision is to change the Codex variant, draft an ADR superseding the relevant slice of ADR-0007 Addendum and propose the SKILL.md edit. Otherwise, update ADR-0007 Addendum's follow-up paragraph with the audit result + decision-to-keep.
- [ ] `/ad-review main..HEAD` on the audit report itself before merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### `2026-05-24` — Range B (v0.17.0-beta.1..v0.17.1-beta.1) executed

**Range chosen:** `v0.17.0-beta.1..v0.17.1-beta.1`. 3 commits (`bacce1a`, `3c56c63`, `b69056e`), 9 files, +169/-92. Substantive surface: `src/skills/codex/ad-review/SKILL.md` rewrite (commit `3c56c63`) — the "clarity fix" first attempt that doubled down on the `/clear`+paste choreography. **Known-bad in retrospect**: rewritten in v0.17.2 (`3fabb92`) because the underlying premise (Codex has no subagent primitive; `/clear` UX acceptable) was stale. Ideal diagnostic range for axis-bleed measurement — a reviewer that rationalizes across axes might ship the surface-clarity additions and miss the premise gap.

**Combined handoff:** `.agentic/reviews/20260524T045545Z-v0.17.0-vs-v0.17.1-axis-bleed-rangeB.md` (1198 lines: diff + Standards slice + Spec slice in one file, mirroring the Codex variant's single-file output).

**Experimental design:**
- **Arm A — Claude Code two-axis split.** Two parallel `Task` calls to `fresh-context-reviewer`, each axis-bounded (Standards subagent: AGENTS / ADR-0007 / ADR-0008 + diff, NO commit-body access; Spec subagent: commit bodies + diff, NO binding-doc access). Findings produced under fresh context, no cross-axis material.
- **Arm B — Codex-simulation single-session.** One `Task` call to `general-purpose` with the WHOLE combined handoff (both axes' material in one context). Same axis-separated output schema enforced by prompt. Mirrors what the Codex variant does inline today.

Caveat: Arm B uses Claude Sonnet (via `general-purpose` subagent) reading combined material, not actual Codex (GPT). Model variance confounds; experimental design isolates **context shape** (split vs combined) from **model**. Treat as a directional, not definitive, measurement.

**Arm A findings (Claude Code two-axis split):**

Standards axis:
- **Blocker** — `allow_implicit_invocation: false → true` flipped without an ADR amendment authorising the policy change. AGENTS.md "Binding decisions live in `doc/adr/`" violated.
- **Blocker** — "Codex has no subagent primitive" stated as categorical fact with no citation. ADR-0008 R1 ("no unfounded statements in decision records / SKILL.md") violated.
- Concern — anti-pattern "Do NOT call Task. Codex has no Task tool" pins wrong premise (categorical vs scoped to skills).
- Concern — `allow_implicit_invocation: true` auto-trigger risk for a file-writing workflow (only `ad-philosophy` had the flag before, and it's read/think only).
- Concern — AGENTS.md skill table row mismatch (live state didn't match diff state). [Methodology note: this finding partly reflects the live-file artifact at audit time, not pure diff content.]
- Note — Step numbering inconsistency: `<how-this-runs-on-codex>` lists 1–9, `<instructions>` uses 0–6. Internal structural drift.
- Note — `<output_contract>` doesn't guard against pasting handoff back into the same session.
- Verdict: **Standards: don't ship until Blockers resolved.**

Spec axis:
- Concern — Commit body claims "Drops 'sub-agent' from the Codex variant entirely" but "NO sub-agents are spawned" survives in the new `description:`. Partial delivery.
- Concern — Commit body PT-BR trigger says "revisa o diff" but shipped text has "revisa esse diff". Phrase mismatch.
- Note — Step 0 announce literal text longer than commit-body quote. Additive, not a violation.
- Claims B / C / D / F / G / H / I verified delivered.
- Verdict: **Spec: ship with the Concerns logged.**

Arm A aggregate: 2 Standards Blockers, 3 Standards Concerns, 2 Spec Concerns. Worst: "Codex has no subagent primitive" unfounded categorical claim (ADR-0008 R1).

**Arm B findings (Codex-sim single-session, combined handoff):**

Standards axis:
- Concern — `description:` multi-line YAML scalar ~600 chars. Verify `test/skills.test.js` accepts.
- Concern — `short_description` ballooned to ~250 chars. Codex menu truncation risk.
- Concern — `allow_implicit_invocation: true` flip with no ADR pinning the convention. (Same finding as Arm A, but framed as Concern not Blocker — see analysis below.)
- Concern — No test added for `<anti-patterns>` or Step 0 announce; discipline is advisory only.
- Note — Choreography "load-bearing on unverified premise" — link to ADR-0007 §4 needed. (Same content as Arm A's Blocker on "no subagent primitive", but **Arm B downgraded the finding to Note severity**.)
- Note — Source + `.agents/` byte-identical. Clean.
- Note — `agentic-state.json` refresh consistent.
- Note — README cli-line drop clean.
- Verdict: **Standards: ship with the Concerns logged.**

Spec axis:
- Concern — PT-BR triggers asymmetric (5 EN, 2 PT-BR). Different angle on same Arm A finding.
- **Concern (headline) — "Commit body asserts the fix solves Codex drift but provides no evidence drift was instruction-clarity vs mechanism-fit. If drift was mechanism-fit, more emphatic instructions will not fix it."** This is a meta-critique of the fix's diagnosis. Arm A's Spec subagent did not produce this finding (no access to binding-doc context where the mismatch would surface).
- Notes — Claims A / B / C / D / F / G / H / I verified delivered.
- Verdict: **Spec: ship with the Concerns logged.**

Arm B aggregate: 0 Standards Blockers, 4 Standards Concerns, 2 Spec Concerns. Worst: "commit body asserts fix solves Codex drift but provides no evidence drift was instruction-clarity vs mechanism-fit".

**Diff analysis (Arm A vs Arm B):**

| Finding | Arm A (split) | Arm B (combined) | Direction |
| --- | --- | --- | --- |
| `allow_implicit_invocation` flip without ADR | **Blocker** | Concern | **Arm B downgraded** — classic axis-bleed signature |
| "No subagent primitive" unfounded categorical claim | **Blocker** | Note ("load-bearing on unverified premise") | **Arm B downgraded TWO severity tiers** — strongest axis-bleed signal in this range |
| Step numbering inconsistency 1-9 vs 0-6 | Note | (missed entirely) | Arm B missed |
| "Sub-agent" wording survived (partial drop vs commit-body "entirely") | Concern | (missed entirely) | Arm B missed |
| PT-BR trigger phrase mismatch (`revisa o diff` vs `revisa esse diff`) | Concern | Concern (asymmetric coverage angle) | Both caught, different framing |
| Multi-line YAML scalar / `short_description` length / no test for anti-patterns | (missed entirely) | Concern × 3 | **Arm A missed** — infrastructure findings outside each axis's slice |
| "Fix may target wrong cause (mechanism-fit vs instruction-clarity)" | (missed entirely) | Concern (headline) | **Arm A missed** — requires both axes' material simultaneously |

**Findings (preliminary, N=1 range):**

1. **Axis-bleed is real and measurable.** Arm B downgraded two findings that Arm A flagged as Blocker. The downgrade direction matches Pocock's stated rationale for the two-reviewer split — a single reviewer reading the commit body's "clarity fix" framing softened its stance on the underlying ADR-0008 R1 / ADR-0007 §4 violations. Both findings later turned out to be exactly the root cause the v0.17.2 rewrite addressed.

2. **The two-axis split has its own degradation: cross-axis misses.** Arm A missed three Standards-axis infrastructure findings (YAML scalar length, `short_description` truncation, missing tests) because each axis-bounded reviewer only saw its slice. More importantly, Arm A missed the headline meta-finding ("fix may target wrong cause") because that critique requires both commit-body claim AND binding-doc context to surface. **This is the inverse axis-bleed direction not previously articulated.**

3. **Net assessment for Range B:** the Claude Code two-axis split caught more critical findings (two Blockers Arm B missed) at higher severity. The Codex single-session pass caught important but lower-severity infrastructure concerns AND the meta-critique that retrospectively turned out to be the most important finding (predicting the v0.17.2 rewrite's premise gap). **Neither variant is strictly dominant.** They surface different finding classes.

**Provisional recommendation (pending Range A + Range C confirmation):**

Option α: keep the current asymmetric per-host shape (Claude Code = two-axis split; Codex = single-session axis-separated). Accept that each variant has known degradation patterns. Document both gaps in `ad-review` SKILL.md and ADR-0007 Addendum.

Option β: promote the optional user-initiated subagent escalation to **always recommended for high-stakes reviews** on Codex (not just an optional footer). The current SKILL.md surfaces it only after the inline review completes; consider surfacing the choice BEFORE the inline review starts so the user can opt into fresh-context separation for the cases that warrant it.

Option γ: change the Claude Code variant to spawn THREE reviewers — two axis-bounded (current shape) plus one cross-axis "meta-reviewer" tasked specifically with surfacing meta-critiques like the one Arm B caught. Closes the cross-axis-miss gap without re-introducing axis-bleed.

**Lean: Option α + Option β as a follow-up SKILL.md edit.** Option γ is heavier and unproven. ADR amendment likely needed if Option β lands (changes the user-facing shape of the Codex variant).

**Next:** N=1 is insufficient for a binding decision. Recommend running Range A (`v0.17.1-beta.1..v0.17.2-beta.1` — Codex rewrite, opposite signal: known-good in retrospect) and Range C (`v0.17.3-beta.1..v0.17.4-beta.1` — recent simple range) before flipping any SKILL.md or proposing an ADR. Until then this task stays `in-progress`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
