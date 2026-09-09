# ADR-0075: Review publications in the owner's native language before adapting them

**Status:** accepted
**Date:** 2026-09-09
**Deciders:** Alexandre Alvaro

## Context

`ad-publish`, `ad-report`, and `ad-voice` produce text a human will read on an external surface (Slack, GitHub, a document), usually in the audience's language, which for this kit's owner is English while the owner thinks and reads fastest in Brazilian Portuguese. Today the draft is presented for approval directly in the target language. The owner reports that reviewing long English drafts hides detail: translation nuances slip, the text does not land as naturally as intended, and the approval becomes a skim rather than a check. The gap is per-person, not per-project: another owner may review in Spanish and publish in English, or review and publish in the same language and need no extra step.

The publication flow already frames the language of the surface in Step 1, drafts in Step 4, and verifies privately in Step 5. The personal voice profile at `~/.agentic/voice/profile.md` is the kit's existing per-person, outside-git preference store, with a closed schema that rejects unknown fields.

## Decision

We will add an optional **review language** to the personal voice profile and make every publication skill honor it:

- **Preference.** The voice profile gains an optional `reviewLanguage` field (BCP 47 tag, for example `pt-BR`). The schema stays closed: the validator accepts the new field and continues to reject unknown ones. Absent, the review language is the publication's target language and the flow is unchanged.
- **Draft in the review language first.** When the review language differs from the surface language, `ad-publish`, `ad-report`, and `ad-voice` present the draft for approval in the review language. The owner approves meaning, structure, and tone there.
- **Adapt, do not translate.** After approval, the skill produces the target-language version as an adaptation to the surface's register and context, running the same voice and naturalization pass as today.
- **Verify meaning before posting.** The private verification step gains a meaning-preservation check: a side-by-side of the approved review-language draft and the adapted text, with any deviation in meaning, omitted detail, or added claim listed in the review language. Publication waits for the owner's approval of the adapted text; the approval word releases publication as before.

## Consequences

Positive:

- The owner reviews where they read fastest, so approval is a real check instead of a skim; nuance is caught before it reaches the team.
- Per-person by construction: the preference lives in the profile, outside every repository, so a team can share the kit and each member reviews in their own language.
- No new skill; the change lands in the three publication skills' existing steps and one profile field.

Negative / trade-offs:

- Two approvals instead of one when the languages differ. Accepted: the owner asked for exactly this step, and it applies only when the languages differ.
- More tokens per publication (draft, adaptation, side-by-side). Accepted as proportional to the value of a correct public message.
- The adaptation is still model work; the side-by-side makes deviations visible but does not prove fidelity. The owner's second approval remains the gate.

## Alternatives Considered

- **Ask "which language do you want to review in?" at every publication** — rejected. It repeats a stable per-person preference as a question, which the kit's posture forbids; the profile already exists to hold such preferences.
- **Store the preference in the machine rules layer (`~/.agentic/rules/`)** — rejected. Rules describe how the agent works; this is a property of the person, which is what the voice profile models.
- **Translate the finished English draft back to Portuguese for review** — rejected. Back-translation reviews the translation of a translation; drafting in the review language first lets the owner shape the message, not just check it.
- **Do nothing** — rejected. It keeps approval as a skim of text the owner cannot inspect at the speed the approval needs.
