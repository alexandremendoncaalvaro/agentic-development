# Calibrating personal voice

## Source roles

| Source | May support | Must not support |
| --- | --- | --- |
| Owner-authored native-language writing or speech | Communicative identity and language-specific owner patterns | Hidden psychological traits |
| Owner-authored target-language writing | Owner surface patterns, with confidence reflecting fluency and age | Accidental learner errors promoted as identity |
| Explicit owner correction or preference | The exact approved behavior and scope | Unrelated global promotion |
| Authorized team or community conversation | Vocabulary, formality, brevity, politeness, and channel conventions | Owner identity or individual imitation |
| Rejected or model-shaped draft | A scoped aversion | Positive owner behavior |

Mixed sources require author separation before analysis.

## Authorization record

Before a private read, state the exact source, date range, author filter, intended role, requested scopes, and retention mode. For Slack or similar systems, name channels or threads; exclude direct messages unless explicitly named. Existing connector access is not consent.

Public URLs and pasted samples remain limited to the items the user named. Never search adjacent accounts, repositories, channels, or local directories for more material.

## Filtering and retention

Use an OS temporary directory outside repositories. Remove quoted replies, forwarded text, signatures, boilerplate, code, logs, copied documentation, assistant output, and generated drafts the owner did not accept.

Retain derived instructions, aggregate non-identifying source summaries, counts, confidence, limitations, and approval state. Do not retain raw samples by default. Exact owner examples require a separate retention approval. Never retain a community member's exact phrase.

The host may retain conversation and tool history independently of local cleanup; disclose this before private material enters the session.

## Derivation

Separate candidates into:

- communicative identity: stance, reasoning shape, example use, certainty, directness, warmth, humor, and relationship to the reader;
- owner-observed surface behavior: language-specific vocabulary, rhythm, punctuation, and discourse markers;
- accommodation: target-community vocabulary and interaction conventions;
- context: audience, relationship, channel, document type, and situational tone.

Recurring observation supports confidence. One observation can become an explicit preference only when the owner approves it as such. Conflicts remain scoped; do not average them.

## Cross-language evaluation

Run two distinct checks:

1. Owner fidelity: does the stance, intent, certainty, and relationship still feel like the owner? Offer a native-language pragmatic gloss when useful.
2. Target-language fit: is the result idiomatic and appropriate for the destination and community?

The owner need not claim fluent target-language self-recognition. Team evidence or a fluent reviewer can inform naturalness without gaining authority over identity.

## Delta gate

Present one delta with its exact old and new JSON, evidence role, scope, confidence, conflicts, and limitations. Use one approve/reject decision or a short pairwise comparison. On reject or defer, write nothing. On approval, validate and atomically write the complete profile, then remove temporary material.

