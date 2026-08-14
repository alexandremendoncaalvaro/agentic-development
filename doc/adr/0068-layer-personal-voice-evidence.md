# ADR-0068: Layer personal voice evidence

**Status:** accepted
**Date:** 2026-08-13
**Deciders:** Alexandre Alvaro

## Context

A personal-voice layer must preserve one user's recognizable communication style
without treating every variation as identity or turning historical frequencies
into a caricature. The approved Portuguese corpus supported a communicative
identity, but contained no fluent owner-authored English prose. A blinded spike
then compared a scoped hybrid profile with the generic Humanizer baseline across
three contexts. The Portuguese team-chat result was a tie, while the owner
preferred the generic baseline for both English contexts. Every draft preserved
the supplied facts: 15 of 15 drafts passed the deterministic factual gate. The
three pairwise owner comparisons produced one tie and two generic-baseline
preferences.

The English result cannot answer voice fidelity by itself because the owner's low
confidence in English makes naturalness easier to judge than self-recognition. In
practice, the owner already accommodates to the team's vocabulary and conventions
when communicating in English. The model must therefore separate identity from
language competence and community accommodation rather than treating missing
English fluency as missing personal voice.

## Decision

We will represent personal voice as a sparse, versioned, machine-local Markdown
profile with three separately attributed layers: the owner's communicative
identity, target-language community accommodation, and the active audience and
channel context. Communicative identity comes primarily from owner evidence in the
language where the owner can express it confidently. An authorized accommodation
corpus supplies English vocabulary, formality, brevity, politeness, and team
conventions without supplying identity.

Application preserves facts first, renders the owner's stance and reasoning
through a functional target-language equivalent, then applies matching community
and situational conventions. It never translates Portuguese fillers literally,
copies a teammate's distinctive phrasing, preserves an accidental learner error as
identity, or invents an unsupported psychological trait.

Profile evolution remains separate from application. `ad-voice-tune` proposes one
evidence-backed delta at a time and persists it only after approval. `ad-voice`
reads the confirmed profile without modifying it. Raw calibration samples are
temporary by default and do not enter the profile or repository.

## Consequences

- Portuguese evidence can support an equivalent English voice without pretending
  that English surface choices were observed from the owner.
- Team conversations can improve English naturalness and belonging while remaining
  provenance-separated from the owner's identity.
- The feature must protect third-party messages: bounded consent, author
  separation, derived conventions by default, and no distinctive phrase copying.
- Cross-language evaluation needs separate owner-fidelity and target-language
  naturalness judgments; one score cannot stand in for both.
- A valid profile may initially contain only explicit aversions and no positive
  transformations.
- A tie does not justify extra profile tokens or rewriting. The simpler generic
  result wins when personalization has no demonstrated benefit.
- Context resolution, provenance validation, and human-gated updates add more
  machinery than a single style prompt.
- Voice fidelity must improve through real corrections over time; initial source
  extraction alone cannot support a claim that the profile sounds like the owner.

## Alternatives Considered

* Compact qualitative profile only - rejected because broad labels can collapse
  into generic agent prose and do not constrain language or context promotion.
* Quantitative targets per register - rejected because the available corpus is too
  narrow for reliable quotas and measured fillers can create a caricature.
* Eager scoped hybrid application - rejected by the blinded evaluation because it
  tied the generic baseline in Portuguese and lost both English comparisons.
* Require fluent owner-authored samples in every language - rejected because it
  treats language proficiency as identity and cannot help precisely where
  adaptation is most valuable.
* Copy a fluent teammate's style - rejected because accommodation should supply
  community conventions, not replace the owner's identity or impersonate another
  person.
