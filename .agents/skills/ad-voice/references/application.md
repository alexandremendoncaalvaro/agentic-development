# Applying a personal voice

## Invariant ledger

Before rewriting, record every claim, name, number, date, citation, URL, technical identifier, commitment, uncertainty marker, and requested action. After drafting, compare each item against the result. Style never authorizes factual loss or invention.

## Generic baseline

First remove generic model-writing artifacts using `human-writing-baseline.md`. This is the comparison baseline, not the owner's identity.

## Active profile slice

1. Select identity patterns that target the requested language. A pattern derived in another language applies only with `functional-equivalent` provenance.
2. Select accommodation patterns only when their language and every populated context dimension match. They provide community vocabulary and norms, never identity.
3. Select context patterns for the active audience, relationship, channel,
   document type, topic, and requested situational tone.
4. Ignore unsupported, conflicting, or low-confidence rules when application would add framing rather than improve fidelity.

Do not load unrelated examples or context slices. Context tokens are part of the quality cost.

## Silent rule audit

After drafting, account for every active pattern by its `id`. Give each one an
internal verdict:

- `satisfied`: the draft follows the instruction, including when the source
  already did and no rewrite was necessary;
- `higher-priority override`: a factual, safety, destination, or hard-format
  constraint prevents application; record the concrete reason.

An unmet pattern is not a final verdict. Revise every unmet pattern, then repeat
the audit against the complete active slice. Recheck the invariant ledger after
each revision; if restoring an invariant changes the draft, repeat the audit once
more. Do not return a draft with an unmet or unaccounted pattern.

The audit remains silent in normal output. Show it only when the user asks, or
briefly disclose a material higher-priority override when silence would make the
result misleading. Do not expose a score or add commentary to an ordinary draft.

## Cross-language rendering

Carry communicative function, not surface form:

- directness becomes idiomatic target-language directness;
- visible reasoning keeps the reason-to-conclusion relationship;
- warmth uses target-community politeness rather than translated fillers;
- uncertainty preserves its strength without learner hedges or false confidence;
- examples remain concrete but do not gain invented details.

Never translate fillers, contractions, word order, punctuation habits, or errors literally. When owner target-language evidence is sparse, community accommodation supplies naturalness while the identity layer supplies stance.

During tuning, a Portuguese pragmatic gloss may help the owner judge stance and intent. A normal `ad-voice` result returns only the requested target-language draft.

## Final check

- Every invariant survived.
- Every active pattern is satisfied or has a concrete higher-priority override.
- No community phrase was copied as an identity marker.
- No unsupported layer changed the draft.
- The result fits the destination.
- The profile remained unchanged.
- The output contains one draft, without agent commentary.
