# Personal voice profile contract

## Resolution

The canonical filename is `profile.md`.

1. An explicit `--profile <path>` is the exact file path.
2. `$AGENTIC_VOICE_DIR` names a directory containing `profile.md`.
3. The default is `~/.agentic/voice/profile.md`.

`resolve` reports the selected path without creating or reading it. `validate` reads only that file. `write` accepts a JSON file, validates it, writes a mode-`0600` temporary file beside the target, and atomically renames it.

The selected profile path must be outside every Git repository. Resolution may
report an in-repository path, but validation and writing reject it before reading
or changing profile content.

## Markdown shape

The Markdown contains only the canonical title, the `Profile data` heading, and
one authoritative fenced JSON block. Schema fields are closed: unknown fields at
the profile, pattern, scope, provenance, or example level are rejected so raw
material cannot hide outside the derived-only contract.

```markdown
# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "self",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "patterns": [],
  "examples": [],
  "limitations": []
}
\`\`\`
```

Only schema version `1` is supported. A profile used by `ad-voice` is always `confirmed`, retains derived material only, and declares that raw samples were not retained.

## Pattern shape

```json
{
  "id": "plain-reasoning-in-english",
  "layer": "identity",
  "instruction": "State the concrete issue before explaining the trade-off.",
  "scope": {
    "languages": ["en"],
    "channels": ["slack"],
    "audiences": ["team"],
    "relationships": ["peer"],
    "documentTypes": ["status-update"],
    "topics": ["engineering"],
    "tones": ["informal"]
  },
  "provenance": {
    "basis": "functional-equivalent",
    "authorClass": "owner",
    "evidenceLanguages": ["pt-BR"],
    "sourceSummary": "approved aggregate of owner-authored Portuguese samples",
    "sourceCount": 9,
    "confidence": "medium",
    "approved": true
  }
}
```

Required pattern fields:

- `id`: stable, unique, non-empty identifier.
- `layer`: `identity`, `accommodation`, or `context`.
- `instruction`: one derived, actionable behavior without raw source text.
- `scope.languages`: non-empty target languages. `channels`, `audiences`,
  `relationships`, `documentTypes`, `topics`, and `tones` are optional non-empty
  string arrays. Other scope keys are unsupported.
- `provenance.basis`: `observed`, `explicit-preference`, `functional-equivalent`, or `community-observed`.
- `provenance.authorClass`: `owner` for identity; `community` for accommodation.
- `provenance.evidenceLanguages`: languages actually represented by the evidence.
- `sourceSummary`: non-identifying aggregate description, never a message excerpt.
- `sourceCount`: positive integer.
- `confidence`: `low`, `medium`, or `high`.
- `approved`: always `true` in a confirmed profile.

A target language outside `evidenceLanguages` requires `functional-equivalent` provenance. `community-observed` is valid only for accommodation, and accommodation requires it. Accommodation evidence covers every target language exactly and cannot supply identity.

## Exact examples

Examples are optional and owner-authored only:

```json
{
  "id": "approved-example-1",
  "text": "Short exact owner example",
  "language": "pt-BR",
  "authorClass": "owner",
  "approved": true,
  "retentionApproved": true
}
```

Never retain a teammate's exact phrase. A confirmed profile rejects an example
without explicit retention approval or over 280 Unicode characters.

## Matching

- Match every populated scope dimension, not language alone.
- An omitted optional dimension is unrestricted.
- An empty array is invalid for `languages` and should not be used elsewhere.
- Identity describes whose communication it is.
- Accommodation describes how the target community communicates.
- Context describes the current relationship, audience, channel, or document shape.
- Conflicts resolve by factual safety, explicit preference, narrower scope, higher confidence, then no-op.
