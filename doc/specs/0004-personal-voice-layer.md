# Spec `0004`: Preserve the user's personal voice

**Status:** shipped
**Created:** 2026-08-13
**Owner:** Alexandre Alvaro

## Context

Generic writing assistants can remove obvious model-generated patterns, but they
usually replace them with another generic register. A user then spends time
rewriting drafts that are factually useful but do not sound like them. A single
fixed style prompt also fails because real people adapt how they communicate to
their audience, relationship, channel, and language without ceasing to sound like
themselves.

The kit needs a private personal voice layer that learns only from user-approved
evidence, preserves one recognizable voice across contextual adaptations, and can
be reused from any repository without committing personal writing data. It must
separate applying a confirmed profile from changing that profile, because drafting
is reversible while learning the wrong pattern compounds across future writing.

## User Scenarios

- **Scenario 1: Calibrate a personal voice**
  - Given the user has approved a bounded set of their own writing samples
  - When they invoke `ad-voice-tune` to create or update their profile
  - Then the skill separates authorship and context, proposes evidence-backed
    voice patterns, and writes only the changes the user explicitly approves.

- **Scenario 2: Rewrite for a specific audience**
  - Given a confirmed personal voice profile exists
  - When the user invokes `ad-voice` with a draft, audience, and destination
  - Then the result preserves the supplied meaning and facts, follows the
    destination's useful conventions, and remains consistent with the user's
    personal voice.

- **Scenario 3: Carry voice across languages**
  - Given the profile contains Portuguese evidence for the user's communicative
    identity and either English owner evidence or an authorized English community
    corpus
  - When the user requests an English draft from Portuguese source material
  - Then the result renders an equivalent stance and reasoning style through
    supported English conventions, without literally translating Portuguese
    fillers or adopting another person's identity.

- **Scenario 4: Improve a profile from correction**
  - Given the user corrects an `ad-voice` draft or supplies a better final version
  - When they explicitly invoke `ad-voice-tune` with that evidence
  - Then the skill presents the proposed profile delta and its evidence, rejects
    one-off or conflicting inferences, and waits for approval before persisting it.

- **Scenario 5: Work without a profile**
  - Given no valid personal voice profile exists
  - When the user invokes `ad-voice`
  - Then the skill can remove generic model-writing patterns without claiming to
    represent the user's voice and directs profile creation to `ad-voice-tune`.

## Requirements

### Functional

- R1: The kit ships `ad-voice` and `ad-voice-tune` for both supported hosts.
  `ad-voice` drafts, translates, or rewrites against a confirmed profile and never
  changes it. `ad-voice-tune` creates and evolves the profile behind an explicit
  human-approval gate.
- R2: Both skills resolve the profile from a path supplied by the user, then
  `$AGENTIC_VOICE_DIR`, then `~/.agentic/voice/`. The default store is
  machine-local and independent of the current repository.
- R3: A profile represents only its owner. An authorized accommodation corpus may
  describe target-community vocabulary, formality, brevity, politeness, and
  channel conventions, but it never counts as identity evidence or licenses
  copying a contributor's distinctive phrasing.
- R4: Calibration negotiates source, scope, author filter, date range, and
  retention before reading private material. It supports pasted samples and local
  files without requiring a connector. A connector is optional and may be used
  only when already available and explicitly authorized for the named scope.
- R5: Calibration filters out quoted replies, signatures, boilerplate, code and
  logs, copied material, assistant output, and unaccepted generated drafts.
  User-edited or explicitly accepted drafts may be treated as correction evidence,
  but not silently as raw authorship evidence.
- R6: The profile distinguishes communicative identity, owner-observed surface
  patterns, target-community accommodation, and audience, relationship, channel,
  document-type, and language adaptations. Each pattern records whether it was
  observed, explicitly preferred, functionally translated, or community-observed, its
  author class, source coverage, and confidence.
- R7: Explicit user preferences override observed frequencies. A surface pattern
  inferred from one topic, channel, relationship, or language does not become
  global until independent evidence or explicit approval supports that promotion.
  A language-portable communicative function may transfer across languages only
  through a documented functional equivalent, never through literal filler,
  idiom, syntax, or error transfer.
- R8: `ad-voice-tune` proposes one reviewable delta at a time with the candidate
  pattern, evidence, affected scope, confidence, conflicts, and exact old-to-new
  change. It writes only after explicit approval and preserves rejected evidence as
  neither a positive sample nor a profile rule.
- R9: Raw samples are not retained by default. The profile stores derived patterns,
  source summaries, confidence, limitations, and only short exact examples that
  the user explicitly approves for retention.
- R10: `ad-voice` determines destination, audience, relationship, language, intent,
  and length from the request and supplied text. It asks only when a missing value
  would materially change the result and cannot be grounded from context.
- R11: Rewrite and translation preserve claims, names, numbers, dates, citations,
  URLs, technical identifiers, commitments, uncertainty, and requested action.
  The skill neither invents specifics nor deletes substantive content silently.
- R12: Application order is facts and safety, destination shape, stable personal
  voice, audience and relationship adaptation, requested situational tone, then
  language conventions. A later layer cannot erase an earlier one.
- R13: A profile section applies only when its evidence scope matches the request.
  When owner-authored target-language evidence is absent, `ad-voice` may combine
  supported communicative identity with an authorized accommodation corpus. It
  labels this as an equivalent adaptation rather than an observed owner register;
  without either kind of support it falls back conservatively.
- R14: The writing pass removes generic model patterns such as unsupported emphasis,
  formulaic contrast, filler, servility, decorative punctuation, mechanical lists,
  and unnecessary emoji unless an approved personal or contextual pattern requires
  one. Personal evidence outranks a generic anti-pattern catalogue unless accuracy
  or safety would be harmed.
- R15: A normal single-draft invocation returns only usable draft text. Analysis,
  profile status, and self-audit details appear only when requested or when a
  material limitation prevents an honest result.
- R16: Calibration and application share one versioned, inspectable Markdown
  profile contract with structured metadata. The kit validates required sections,
  provenance, privacy invariants, and unsupported cross-scope promotion through a
  deterministic skill script.
- R17: Calibration minimizes owner effort. It presents one short, consequential
  choice at a time, defaults to approve/reject or pairwise comparison, and never
  requires ranking a batch of drafts. The owner may defer evaluation and refine
  the profile through later `ad-voice-tune` corrections.
- R18: Cross-language calibration evaluates two axes separately. The owner judges
  whether intent, stance, relationship, and certainty remain theirs, optionally
  through a Portuguese pragmatic gloss. Target-language evidence judges English
  naturalness and community fit. Fluency uncertainty never counts as evidence that
  the owner's communicative identity is absent.

### Non-functional

- The feature is local-first, offline by default, and adds no service, account,
  telemetry, or runtime package dependency.
- The skill source and bundled scripts remain byte-identical across Claude Code
  and Codex.
- Personal profile content and raw samples never enter the kit repository, a
  consumer repository, dogfood copies, fixtures, logs, or audit handoffs.
- Synthetic fixtures exercise profile parsing and behavior. Evaluation with the
  owner's corpus remains local and records only aggregate results in repository
  artifacts.
- The main skill files remain concise and load detailed profile, calibration,
  channel, language, and evaluation contracts through progressive references.

## Success Criteria

- In a held-out set spanning Portuguese and English plus at least three materially
  different audience or channel contexts, calibrated output preserves the owner's
  judged stance and intent while target-language evidence rates its English as
  natural and contextually appropriate, without reducing factual preservation.
- Every held-out rewrite preserves all fixture-marked facts, identifiers,
  commitments, uncertainty, and requested actions.
- A same-content evaluation across two audiences produces the expected contextual
  difference while reviewers still identify both drafts as the same user's voice.
- A Portuguese-only owner corpus does not emit English surface rules as
  owner-observed. It marks functionally translated traits and accommodation-corpus
  conventions separately until owner-authored English evidence exists.
- Refusing any source-read or profile-write approval leaves that source unread or
  the profile unchanged, respectively.
- A normal calibration review requires one decision at a time and can resume from
  saved progress without asking the owner to reconstruct earlier judgments.
- Calibration with derived-pattern retention leaves no raw sample or unapproved
  exact phrase in the profile or repository.
- A profile validator rejects missing provenance, retained examples without
  approval, unknown schema versions, and patterns promoted beyond their evidence
  scope.
- The complete test suite, skill parity checks, dogfood refresh, and package
  dry-run pass with both skills included.

## Edge Cases

- Samples contain multiple authors, quoted threads, translations, forwarded text,
  or model-generated material that the user did not accept.
- The corpus is small, old, confined to one topic, one language, one channel, or
  one relationship.
- Observed behavior conflicts with an explicit preference or differs across
  languages and channels.
- A requested destination is unknown, combines public and private audiences, or
  has a hard format limit.
- The source draft is already in the user's voice and needs no change.
- The requested adaptation conflicts with factual precision, accessibility,
  professional obligations, or repository documentation rules.
- The profile is missing, unreadable, malformed, from an unsupported schema
  version, or identifies a subject other than the current user.
- An interrupted calibration leaves temporary raw material or a partial profile
  write; cleanup and atomic replacement must prevent retention or corruption.

## Out of Scope

- Inferring mental state, protected traits, diagnosis, personality type, or a
  clinical psychological profile from writing. User-approved communicative
  identity is in scope.
- Impersonating another individual or building a personal profile from someone
  else's private writing.
- A shared team or brand voice, automatic workspace scraping, or mandatory MCP
  connectors.
- Voice cloning for audio, speech synthesis, transcription, or biometric author
  identification.
- Optimizing for AI-detector evasion or claiming that a detector cannot identify
  assisted writing.
- Automatic profile mutation from ordinary `ad-voice` use.

## Open Questions

- The minimum evidence and confidence thresholds for promoting a pattern from one
  context or language into the stable baseline require the held-out calibration
  spike defined by [RESEARCH-0001](../research/0001-personal-voice-model.md).
- The smallest profile schema that preserves voice fidelity without consuming
  excessive context remains an implementation-strategy decision for that spike.

Resolution (2026-08-13): ADR-0068 keeps cross-context and cross-language
promotion behind explicit approval or documented functional equivalence rather
than inventing a universal numeric threshold. The implementation spike selected
schema version 1: one structured Markdown block containing scoped patterns,
inspectable provenance, optional separately approved owner examples, and
limitations. Future thresholds require new held-out evidence; they are not
silently inferred from the initial corpus.

## Related

- ADRs: [ADR-0068](../adr/0068-layer-personal-voice-evidence.md).
- Tasks: [Task 0053](../tasks/0053-implement-personal-voice-layer.md),
  [Task 0054](../tasks/0054-calibrate-personal-voice.md).
- Supersedes / Depends on: depends on
  [RESEARCH-0001](../research/0001-personal-voice-model.md),
  [ADR-0035](../adr/0035-rules-location-convention.md), and
  [ADR-0037](../adr/0037-ad-level-up-rule-curation.md).
