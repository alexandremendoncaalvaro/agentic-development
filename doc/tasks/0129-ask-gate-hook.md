# Task `0129`: Ask gate — hold a closing question that carries no recommendation

**Status:** in-progress
**Created:** 2026-11-24
**Scope ref:** doc/adr/0099-hold-a-question-without-a-recommendation.md
**Evidence ref:** doc/research/0048-ground-ask-gate.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The owner's most frequent complaint is the agent asking what the evidence or an earlier decision already settles. Prose rules did not hold; the owner asked for a lock that `ad-hooks` installs in any project. Nothing equivalent existed: `reply-language.mjs` is a shadow-only `Stop` detector, `handoff-nudge.mjs` nudges once about context, and the workflow checkpoint never blocks. ADR-0083 decision 1 and RESEARCH-0026 C11 had deferred a blocking `Stop` hook to its own ADR with a measured rate; ADR-0099 is that ADR.

## Acceptance Criteria

- [x] `askVerdict(text)` tells a reply that ends asking the owner and names what a decision card still lacks (recommendation; trade-offs when labelled options appear), ignoring code, quoted text and blockquotes.
- [x] The `Stop` hook blocks once with a decide-or-decision-card reason, lets a continued turn stop, honours the per-session cooldown, `AD_ASK_GATE=shadow` and `AD_ASK_GATE=0`, logs one line per held reply without reply text, and fails open.
- [x] Byte-identical in both host trees; wired in this repo's `.claude/settings.json` and `.codex/hooks.json`, covered by the wiring test.
- [x] Hold rate measured by replay and hand-labelled sample (ADR-0099 decision 5).
- [x] `session-tier.md` and both `SKILL.md` document what, why, how and current state.

## Plan

- [x] Ground (RESEARCH-0048).
- [x] TDD: verdict core, then hook I/O, then wiring.
- [x] Replay, ADR-0099, docs, CHANGELOG.
- [ ] Fresh-context review, local gate, commit, PR with the owner's OK.

## Notes

- 2026-11-24 — Built by TDD in three slices (verdict core; hook I/O with loop guards, shadow, kill switch, evidence log; wiring). A replay sample showed recommendations phrased as the agent's own pick ("iria de 1", "minha escolha", "sugiro", "I'd go with"), added as a red test before widening the pattern; held replies fell from 462 to 450.
- 2026-11-24 — Mutation sweep on the cooldown comparison: `<` → `<=` survives. It differs only when the elapsed time equals the cooldown to the millisecond, which no test reaches without a clock seam; the search was the cooldown `0` case, where the elapsed time is always ≥1 ms after a separate process start. Kept.
- 2026-11-24 — Evidence is not detected (a recommendation word passes even when the evidence is thin); the reason text asks for it and review owns its quality. Recorded in ADR-0099 Negative consequences.
- 2026-11-24 — Fresh-context review, both axes "ship with Concerns logged", no blocker. Fixed by TDD (red first): own-pick phrasings `I'll`/`escolho`/`vou de` were held; a `?` followed by `)`, `]` or emoji was missed; an empty `AD_ASK_GATE_COOLDOWN_SECONDS` disabled the cooldown. Governance: ADR-0099 now declares its amendment of ADR-0083 decisions 3, 4 and 5 and of ADR-0074's coercion rejection, both header pairs and PROJECTION rows. Logged, not fixed: a recommendation word anywhere satisfies the check; unlabelled options skip the trade-off check; the rate is unmeasured on Codex (follow-up: run it there in shadow first). Replay after the fixes: 448 held of 819 asks.
- 2026-11-24 — Delta review of those fixes, no blocker: intent phrasings ("vou com calma", "I will go check") counted as a pick, and a blank cooldown setting still disabled the cooldown. Both fixed red-first (`vou de`/`vou com` now need an option label; `I will` needs `go with`; the setting is trimmed). Logged, not fixed: a bare URL or `what??` ending a line can be held, once per cooldown. Replay unchanged at 448.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
