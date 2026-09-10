# ADR-0075: Separate conversation and publication languages

**Status:** accepted
**Date:** 2026-09-09
**Deciders:** Alexandre Alvaro

## Context

`ad-publish`, `ad-report`, and `ad-voice` produce text a human will read on an external surface (Slack, GitHub, a document), usually in the audience's language. Direct owner-agent collaboration may use a different language. For this kit's owner, conversation and review are in Brazilian Portuguese while publication is normally in English. Another owner may choose Spanish and French, or one language for both. The shared kit must model those choices without encoding one person's languages as universal behavior.

The publication flow already frames the language of the surface in Step 1, drafts in Step 4, and verifies privately in Step 5. The personal voice profile at `~/.agentic/voice/profile.md` is the kit's existing per-person, outside-git preference store, with a closed schema that rejects unknown fields.

## Decision

We will add two optional, per-person language preferences to the personal voice profile and make the universal posture and every publication skill honor them:

- **Preference.** The profile gains an optional, closed `languages` object with required `conversation` and `publication` BCP 47 tags. The conversation language applies to direct collaboration and approval previews. The publication language is the default for outward text. An explicit language in the current request overrides the relevant default only for that request. Without the object, current inference remains unchanged.
- **Draft in the conversation language first.** When the configured languages differ, `ad-publish`, `ad-report`, and `ad-voice` present the first draft for approval in the conversation language. The owner approves meaning, structure, and tone there.
- **Adapt, do not translate.** After approval, the skill produces the publication-language version as an adaptation to the surface's register and context, running the same voice and naturalization pass as today.
- **Verify meaning before posting.** The private verification step gains a meaning-preservation check: a side-by-side of the approved conversation-language draft and the adapted text, with any deviation in meaning, omitted detail, or added claim listed in the conversation language. Publication waits for the owner's approval of the adapted text; the approval word releases publication as before.
- **Keep private context private.** Target-thread context and evidence may constrain the result but do not become outward content automatically. Private owner-agent deliberation never enters a publication unless the owner explicitly promotes that specific material.

## Consequences

Positive:

- The owner reviews where they read fastest, so approval is a real check instead of a skim; nuance is caught before it reaches the team.
- Per-person by construction: the preferences live in the profile, outside every repository, so a team can share the kit while each member chooses their own pair.
- No language is hard-coded into the shared workflow, and no new skill or settings store is required.

Negative / trade-offs:

- Two approvals instead of one when the languages differ. Accepted: the owner asked for exactly this step, and it applies only when the languages differ.
- More tokens per publication (draft, adaptation, side-by-side). Accepted as proportional to the value of a correct public message.
- The adaptation is still model work; the side-by-side makes deviations visible but does not prove fidelity. The owner's second approval remains the gate.

## Alternatives Considered

- **Keep a separate review language** — rejected after owner clarification. The conversation language already owns the preview, so a third field duplicates configuration without adding behavior.
- **Ask for languages at every publication** — rejected. It repeats stable per-person preferences as questions; an explicit request remains available for one-off overrides.
- **Store the preference in the machine rules layer (`~/.agentic/rules/`)** — rejected. Rules describe how the agent works; this is a property of the person, which is what the voice profile models.
- **Translate the finished publication draft back into the conversation language** — rejected. Back-translation reviews the translation of a translation; drafting in the conversation language first lets the owner shape the message, not just check it.
- **Do nothing** — rejected. It keeps approval as a skim of text the owner cannot inspect at the speed the approval needs.
