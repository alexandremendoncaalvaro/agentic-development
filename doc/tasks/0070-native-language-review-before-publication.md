# Task `0070`: Review publications in the owner's native language before adapting

**Status:** proposed
**Created:** 2026-09-09
**Scope ref:** doc/adr/0075-native-language-review-before-publication.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The owner reviews human-facing drafts fastest in Brazilian Portuguese but publishes in English, and finds that approving directly in English hides translation nuance and tone. ADR-0075 adds an optional `reviewLanguage` to the personal voice profile and makes `ad-publish`, `ad-report`, and `ad-voice` draft in that language first, adapt to the surface language after approval, and show a meaning-preservation check before posting.

## Acceptance Criteria

- [ ] The voice profile schema accepts an optional `reviewLanguage` (BCP 47 tag) at the profile level and still rejects unknown fields; `voice-profile.mjs validate` and `write` cover it with tests.
- [ ] With `reviewLanguage` set and different from the surface language, `ad-publish`, `ad-report`, and `ad-voice` present the first draft for approval in the review language.
- [ ] After approval, the skills produce the surface-language text as an adaptation (register and context), passing through the existing voice and naturalization step.
- [ ] The private verification step shows a side-by-side of the approved draft and the adapted text, listing meaning deviations, omissions, and additions in the review language; publication waits for a second approval of the adapted text.
- [ ] With `reviewLanguage` absent or equal to the surface language, behavior is unchanged.
- [ ] Both hosts, dogfood copies, `ad-voice-tune` profile contract reference, and `CHANGELOG.md` are updated.

## Plan

- [ ] Ground: in-repo patterns (`ad-publish` Steps 1, 4, 5; `ad-voice` naturalization; profile contract and validator), plus references on adaptation versus translation review; write `doc/research/NNNN-ground-review-language.md`.
- [ ] Red: validator tests for `reviewLanguage` (accepted, typed, unknown fields still rejected).
- [ ] Green: extend `voice-profile.mjs` schema and the profile contract reference.
- [ ] Update `ad-publish`, `ad-report`, `ad-voice` on both hosts: review-language draft, adaptation, side-by-side verification, second approval.
- [ ] Set `reviewLanguage: pt-BR` in the owner's profile through `ad-voice-tune`; exercise one real publication end to end.
- [ ] Refresh dogfood; full suite; `CHANGELOG.md`; `/ad-review`, `/ad-commit`, `/ad-pr`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-09

Task created from the owner's request during the workflow-readiness work: "show me everything in my native language first, then adapt to English and verify the meaning held before publishing; it is an adaptation to context, not a plain translation." Sequenced after tasks 0065 to 0069.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
