# Human writing compatibility baseline

Apply this before personal rules. The profile may override a stylistic default
when the override is approved and factually safe.

Compatibility target: the same 33 material model-writing failure classes and the
same draft, audit, final loop exposed by the Humanizer 2.9.1 public contract. This
is scope and process equivalence. It does not claim identical wording across
models, or that the external skill ran.

## Failure-class catalog

- **HW.1 Significance inflation:** remove unsupported significance, legacy,
  symbolism, broader-trend, and importance claims.
- **HW.2 Notability inflation:** remove unsupported notability and lists of media
  coverage that add no relevant context.
- **HW.3 Trailing participles:** remove trailing participle clauses that add
  commentary or fake analysis without evidence.
- **HW.4 Promotional language:** replace advertising language and decorative praise
  with the concrete fact it obscures.
- **HW.5 Vague attribution:** name the source of a claim or remove vague attribution;
  never invent an authority.
- **HW.6 Formulaic outlooks:** remove generic challenges, legacy, future-prospects,
  and optimistic-outlook sections that add no sourced information.
- **HW.7 AI vocabulary:** replace stacked, high-frequency model vocabulary with
  plain verbs and concrete nouns when the elevated word adds no precision.
- **HW.8 Copula avoidance:** prefer simple forms of "is", "are", and "has" over
  inflated substitutes such as "serves as", "stands as", or "boasts".
- **HW.9 Negative parallelism:** rewrite formulaic "not only", "not just", and
  tailing-negation constructions as direct clauses.
- **HW.10 Forced threes:** remove forced groups of three when the material does not
  naturally contain three distinct items.
- **HW.11 Synonym cycling:** use one stable noun for one concept instead of rotating
  synonyms to avoid repetition.
- **HW.12 False ranges:** replace "from X to Y" when the endpoints do not form a
  meaningful scale.
- **HW.13 Hidden subjects:** prefer active subjects when they clarify responsibility;
  expand subjectless fragments that hide the actor.
- **HW.14 Decorative dashes:** remove em dashes, en dashes, and double-hyphen
  substitutes unless the confirmed profile requires that punctuation.
- **HW.15 Mechanical bold:** remove bold emphasis that does not improve scanning or
  distinguish a real interface element.
- **HW.16 Inline-header lists:** replace repetitive bold-label lists with ordinary
  prose or a table when the labels add no navigational value.
- **HW.17 Title-case headings:** use sentence case unless the destination or
  confirmed profile requires title case.
- **HW.18 Decorative emoji:** remove emoji that labels or decorates content without
  carrying information.
- **HW.19 Curly quotation marks:** use the destination's normal quotation style;
  default to straight quotes in plain-text technical artifacts.
- **HW.20 Chatbot correspondence:** remove chatbot correspondence, generic
  acknowledgements, offers to continue, and closings that belong to the interaction
  rather than the artifact.
- **HW.21 Gap filling:** remove knowledge-cutoff disclaimers and speculative
  gap-filling; state the bounded unknown or omit it.
- **HW.22 Sycophancy:** remove servile agreement and praise that does not change the
  substance.
- **HW.23 Filler:** cut filler phrases and replace verbose constructions with their
  direct equivalent.
- **HW.24 Stacked hedges:** preserve the actual uncertainty while removing duplicate
  or nested hedges.
- **HW.25 Generic conclusions:** remove repeated summaries and any generic positive conclusion;
  end on the last concrete conclusion, decision, or action.
- **HW.26 Mechanical hyphenation:** keep compound-word hyphenation idiomatic to the
  target language and sentence position.
- **HW.27 Authority tropes:** remove persuasive-authority framing such as "the real
  question" or "what really matters" when it only restates the next sentence.
- **HW.28 Signposting:** remove announcements about what the text will explain and
  state the information directly.
- **HW.29 Fragmented headings:** remove a one-line warm-up that merely repeats its
  heading.
- **HW.30 Diff-anchored narration:** describe the current behavior unless the
  artifact is inherently version-scoped; do not narrate that something was added or
  changed without a durable reason.
- **HW.31 Manufactured punchlines:** break runs of staccato fragments and theatrical
  closers into natural prose while preserving deliberate emphasis.
- **HW.32 Aphorism formulas:** replace generic "X is the Y of Z" metaphors with the
  concrete relationship they claim.
- **HW.33 Fake-candid openers:** remove conversational rhetorical openers such as
  "Honestly?" or "Here's the thing" when they manufacture intimacy rather than
  express the confirmed voice.

## False-positive guard

Do not flatten text because it is polished, formal, dry, grammatically consistent,
or uses one watched word. Common transitions, one short emphatic sentence, one
dash, curly quotes, a salutation, or clean formatting are not defects by
themselves. Act on a contextual failure or a cluster, not an isolated token.

## Preserve human signals

Keep specific and hard-to-fabricate detail, mixed feelings, defensible first-person
choices, uneven sentence rhythm, genuine asides, self-corrections, and context-fit
humor when they are already present and factually safe. Do not insert first person,
rhetorical questions, slang, humor, opinions, reactions, or specificity merely to
simulate personality.

## Embedded process

1. Record every claim, name, number, date, citation, URL, identifier, commitment,
   uncertainty marker, exclusion, and requested action in the invariant ledger.
2. Identify applicable failure classes by `HW.<id>`. Leave non-applicable classes
   alone.
3. Draft the smallest rewrite that removes the applicable failures while preserving
   the information and destination fit.
4. Audit the draft: which applicable failures remain, and did the rewrite add,
   change, or omit any invariant?
5. Correct every defect, then repeat the failure-class and invariant audits. A
   correction invalidates the prior audit.
6. Return only the final rewrite in embedded mode.

If the source already reads naturally, satisfies the active profile, and triggers
no contextual failure class, return it unchanged.
