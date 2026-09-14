# Task `0070`: Honor personal conversation and publication languages

**Status:** done
**Created:** 2026-09-09
**Scope ref:** doc/adr/0075-native-language-review-before-publication.md
**Evidence ref:** doc/research/0011-ground-language-preferences.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The shared kit currently has no structured way to distinguish the language used with its owner from the default language used for outward publications. The owner's installation needs Brazilian Portuguese for conversation and review, and English for publication; every other installation must be able to choose its own pair without changing the shared skills.

## Acceptance Criteria

- [x] The machine-local voice profile accepts one optional, closed `languages` object with required `conversation` and `publication` BCP 47 tags; malformed tags, partial objects, and unknown fields are rejected.
- [x] Direct owner communication uses `languages.conversation`; an explicit language request overrides it only for that request.
- [x] `ad-publish`, `ad-report`, and `ad-voice` use the conversation language for the first approval preview and `languages.publication` for the outward text unless the request explicitly names another publication language.
- [x] When the two languages differ, the workflow adapts rather than literally translates, checks meaning preservation, and requires approval of the exact final publication-language text and destination.
- [x] Target-thread context and evidence may constrain a publication but private owner-agent deliberation never enters it unless the owner explicitly promotes that specific material.
- [x] Profiles without `languages` preserve the current inferred-language behavior.
- [x] Both hosts, dogfood copies, the profile contract, the universal session posture, and `CHANGELOG.md` are updated.

## Plan

- [x] Ground: persist the two-preference design and precedence in `doc/research/0011-ground-language-preferences.md`.
- [x] Red: validator tests for a complete valid pair, malformed tags, partial objects, and unknown fields, one behavior at a time.
- [x] Green: extend `voice-profile.mjs` and the shared profile contract.
- [x] Update the universal posture and `ad-voice-tune`, `ad-publish`, `ad-report`, and `ad-voice` on both hosts.
- [x] Set `languages.conversation: pt-BR` and `languages.publication: en` in the owner's profile through `ad-voice-tune`; exercise one publication preview end to end.
- [x] Refresh dogfood; full suite; `CHANGELOG.md`; `/ad-review`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the owner's request during the workflow-readiness work: "show me everything in my native language first, then adapt to English and verify the meaning held before publishing; it is an adaptation to context, not a plain translation." Sequenced after tasks 0065 to 0069.

The owner corrected the first design before implementation: the open-source kit must not encode Portuguese or English as universal behavior. Keep only two per-person preferences, conversation and publication; the conversation language also owns the approval preview.

Risk register after `/ad-derisk`:

- **Profile ownership — Strong.** The existing outside-git personal profile is the smallest established per-person store. A closed `languages` object prevents it from becoming an unstructured settings bucket.
- **Preference semantics — Strong.** The owner selected exactly two meanings. Explicit request language outranks the stored publication default for that request; otherwise the profile pair applies.
- **Session-wide delivery — Conditional, mitigated.** The global `WORKFLOW.md` import is the cross-session instruction surface. Add the conversation-language rule there and contract-test its presence; host behavior remains advisory.
- **Publication privacy — Strong.** Existing source-role ledgers and held-out fixtures already exclude private deliberation. Preserve the invariant and assert it alongside the language flow.
- **Backward compatibility — Strong.** The `languages` object is optional; an absent object retains current inference. When present, requiring both fields prevents ambiguous partial configuration.

Stop verdict: build. Every critical technical unknown is Strong or Conditional with a named test-and-dogfood mitigation; residual model-compliance risk is lower than the cost of leaving the shared kit hard-coded or unconfigured.

The TDD slice is green: five validator behaviors cover a complete pair, malformed tags, partial objects, unknown fields, and non-object values. A cross-workflow contract test covers conversation, preview, publication, per-request override, meaning preservation, and exact-final-text approval on both hosts. Focused source tests pass; dogfood parity remains intentionally red until the canonical update step.

Dogfood was refreshed on both hosts. The first `/ad-review` found a Standards Blocker: callers adapted before invoking `ad-voice`, which duplicated the two approval gates and could expose a pre-naturalization preview. A new red contract test captured ownership and ordering; `ad-voice` now owns the complete two-stage flow, while `ad-publish` and `ad-report` compose it before adaptation or rendering. The rerun cleared the Standards axis. Focused tests pass 41/41 and the full suite passes 860/860. The remaining Spec Blocker is the explicitly approval-gated local profile delta and its end-to-end preview exercise.

The owner approved the exact local delta. `ad-voice-tune` wrote and validated `languages.conversation: pt-BR` plus `languages.publication: en`, removed the redundant language pattern, and preserved the other 13 patterns. The user-scoped kit was updated for both hosts; its global `WORKFLOW.md` and installed `ad-voice` copies now carry the same language contract. The final open step is the two-stage, no-publish preview exercise.

The no-publish exercise completed both gates. The owner approved the complete Portuguese preview, then approved the exact English adaptation after a meaning-preservation check found no added, removed, or changed claim. No outward action ran. The final `/ad-review` rerun cleared the remaining Spec Blocker.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
