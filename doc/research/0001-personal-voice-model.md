# RESEARCH-0001: Personal voice model

**Status:** concluded
**Created:** 2026-08-13
**Question:** Which observable linguistic model can preserve one user's recognizable voice while adapting it across audiences, channels, and languages?
**Stakes:** medium times reversible
**Confidence:** Conditional

## Conclusion and confidence

Model personal voice as a stable communicative identity plus explicit audience,
channel, language, and community adaptations. Build communicative identity from
user-approved writing, speech, corrections, and observable choices about stance,
reasoning, examples, certainty, directness, and relationship to the reader. This is
a non-clinical account of self-representation in communication, not an inference
of hidden psychological traits. Use a hybrid profile with separate provenance for
owner identity and target-community conventions because topic, register, language,
and accommodation can otherwise be mistaken for authorship.

When the user lacks confidence in the target language, translate the function of
the communicative identity rather than its Portuguese surface markers. An
authorized team corpus may supply target-language vocabulary, formality, brevity,
and politeness conventions, but never the user's identity. Evaluate owner fidelity
through intent and stance, with a Portuguese pragmatic gloss when useful, and
evaluate English naturalness separately through target-language evidence.

## Question and scope

The feature must help an engineer draft or revise text that remains recognizably
theirs while changing how it addresses a child, peer, close friend, manager, or
public audience and while moving between Portuguese and English. The candidate
models were: one global prose style, independent profiles per context, and one
stable personal voice with contextual adaptations. The deciding criterion was
recognizable authorship without flattening real situational variation or changing
the message's facts. The study covers profile semantics, calibration evidence,
privacy boundaries, and evaluation. It does not choose skill names, final file
schema, or implementation language.

## Hypothesis

Not applicable to this study. This is a literature and implementation survey. The
derived feature design remains measurable and must be tested on a held-out corpus
before the implementation is considered validated.

## Method

The study applied the four-source `ad-ground` pass:

- Official guidance: Agent Skills structure, progressive disclosure, and focused
  skill composition.
- Validated implementations: `voice-layer`, `write-like-me`, `better-writing`,
  and ECC `brand-voice`, read from pinned local clones.
- In-repo patterns: machine-local rule resolution, human-gated curation,
  dual-host skill parity, and the existing personal writing-sample directive.
- Git history: searches by relevant paths and the terms `voice`, `tone`,
  `writing`, `human`, `idiolect`, and `stylometry` across all branches.

Academic primary sources were added for the knowledge claims that implementation
repositories alone cannot establish. Claims are graded using WORKFLOW section 17.

## Evidence

### A stable signature can coexist with situational variation

**Grade: High (E2 plus independent primary-source convergence).** Coulthard's
idiolect analysis supports author-specific lexical and phrase patterns. Bell's
audience-design model shows that the same speaker changes style primarily in
response to the addressee. Biber and Egbert show that register differences are
expressed through co-occurring feature sets with functional causes, not one tone
label. Together they support one personal baseline with contextual adaptations,
not unrelated voices per channel.

- [Coulthard, Author Identification, Idiolect, and Linguistic Uniqueness](https://doi.org/10.1093/applin/25.4.431)
- [Bell, Language style as audience design](https://doi.org/10.1017/S004740450001037X)
- [Biber and Egbert, Register Variation on the Searchable Web](https://doi.org/10.1177/0075424216628955)

### Communicative identity is observable without psychological profiling

**Grade: High (E2).** Stylometric research identifies authors through observable
lexical, syntactic, structural, and punctuation behavior. Research on voice in
second-language writing treats lexical, syntactic, organizational, and material
choices as self-representation. The feature can therefore model a user's
communicative identity while refusing unsupported inferences about mental state,
diagnosis, protected traits, or personality type.

- [Low Level Linguistic Controls for Style Transfer and Content Preservation](https://aclanthology.org/W19-8628/)
- [Cross-Language Authorship Attribution](https://aclanthology.org/L14-1167/)
- [Ivanič and Camps, I am how I sound: Voice as self-representation in L2 writing](https://doi.org/10.1016/S1060-3743(01)00034-0)
- [`write-like-me` methodology at pinned commit](https://github.com/Hiro-Inagawa/write-like-me/blob/3878d9dbfb57a28ea414c891623b57612b6e1734/references/03-methodology.md)

### Register and language must be modeled separately from the stable baseline

**Grade: High (E2 plus consensus).** Bell accounts for bilingual code choice as
audience adaptation. Cross-language authorship studies find transferable signals,
but also show that features useful in one language may not apply in another.
`voice-layer` independently models stable voice, channel, audience, localization,
and cultural-linguistic baseline. L2-writing research also shows that authorial
voice remains a meaningful form of self-representation, while target-language
exposure affects the resources available to express it. Therefore the profile
should separate language-portable communicative functions from language-specific
surface choices instead of requiring fluent owner prose before attempting an
equivalent voice.

- [Bell, Language style as audience design](https://doi.org/10.1017/S004740450001037X)
- [Bogdanova and Lazaridou, Cross-Language Authorship Attribution](https://aclanthology.org/L14-1167/)
- [Murauer and Specht, DT-grams](https://arxiv.org/abs/2106.05677)
- [Zhao, Writer background and voice construction in L2 writing](https://doi.org/10.1016/j.jeap.2018.11.004)
- [`voice-layer` profile specification at pinned commit](https://github.com/ymeiri/voice-layer/blob/de196880f0afade02992a513078a40f40ba2630a/VOICE_PROFILE_SPEC.md)

### Community language is accommodation evidence, not identity evidence

**Grade: High (E2 plus independent primary-source convergence).** Communication
accommodation research shows that people align vocabulary, function words,
formality, and other surface choices with interlocutors and communities. A
large-scale longitudinal study also found that users in the same online community
became more linguistically similar, especially when they interacted directly.
This supports using an authorized team conversation corpus to learn how the user's
voice should fit an English-speaking team. It does not support averaging the team
into the user's identity or copying one teammate's distinctive phrasing.

- [Berdicevskis and Erbro, linguistic accommodation in online communities](https://aclanthology.org/2023.nodalida-1.42/)
- [Ananthasubramaniam et al., linguistic style matching and social context](https://aclanthology.org/2023.sicon-1.7/)
- [Doyle and Frank, sources of linguistic alignment in conversation](https://aclanthology.org/P16-1050/)

### Calibration should combine explicit preferences, examples, and measurements

**Grade: Medium (E2 implementations, strong theory, no Agentic measurement yet).**
`write-like-me` combines measured features, mined rules, exemplars, user review,
and held-out verification. `better-writing` makes a user sample the source of
truth and applies genre-specific controls rather than a global cleanup style. ECC
uses a smaller source-backed profile and warns against averaging conflicting
source sets. The implementations converge on a hybrid representation, but none
has been measured on this kit or this user's corpus.

- [`write-like-me` workflow at pinned commit](https://github.com/Hiro-Inagawa/write-like-me/blob/3878d9dbfb57a28ea414c891623b57612b6e1734/SKILL.md)
- [`better-writing` voice and context at pinned commit](https://github.com/forjd/better-writing/blob/4023076319e5a7838dd7587ebf3d5e3588f9544f/references/voice-and-context.md)
- [ECC `brand-voice` at pinned commit](https://github.com/affaan-m/ECC/blob/c9de8f5b2b3a225bca9befa2b7700aa5e3a4d1b8/skills/brand-voice/SKILL.md)

### Profile evolution needs consent and a human gate

**Grade: High (E2 plus direct in-repo applicability).** `voice-layer` negotiates
source, scope, retention, and author filtering before reading private material;
it retains derived patterns by default and treats user correction as ground truth.
The kit already separates rule application from human-gated curation and stores
portable personal conventions outside repositories. The same boundary applies to
voice: applying a confirmed profile may be automatic; changing it may not be.

- [`voice-layer` calibration contract at pinned commit](https://github.com/ymeiri/voice-layer/blob/de196880f0afade02992a513078a40f40ba2630a/core/skills/calibrate-my-voice.md)
- [ADR-0035](../adr/0035-rules-location-convention.md)
- [ADR-0037](../adr/0037-ad-level-up-rule-curation.md)

### Evaluation is multidimensional and requires human judgment

**Grade: High (E2 plus recent primary-source convergence).** Text style transfer
research consistently separates style strength, content preservation, and
naturalness. Recent meta-evaluation shows that apparently strong automatic content
metrics can be misleading when test data does not vary content preservation.
Human evaluation remains necessary for recognizing the user's own voice. The
feature therefore needs both deterministic preservation checks and user judgment
on held-out prompts.

- [Mir et al., Evaluating Style Transfer for Text](https://aclanthology.org/N19-1049/)
- [Pauli et al., Mind the Style Gap](https://aclanthology.org/2025.findings-emnlp.1175/)
- [Briakou et al., Multilingual Formality Transfer Evaluation](https://aclanthology.org/2021.emnlp-main.100/)

### In-repo fit

**Grade: High (E2, directly observed).** The kit already resolves machine-local
state through an environment override and `~/.agentic/` fallback, installs skills
for both hosts, enforces source parity, and requires a hard approval gate for
curated state. A personal voice profile fits those boundaries without a new
service, account, dependency, or repository-tracked user data.

- [ADR-0035](../adr/0035-rules-location-convention.md)
- [ADR-0037](../adr/0037-ad-level-up-rule-curation.md)
- [AGENTS.md](../../AGENTS.md)

Git history produced no prior personal-voice or stylometry implementation. The
closest relevant decisions are `6285f72` for human-gated curation and `7b0d458`
for local versus project rule storage.

## Limitations and what would reverse the conclusion

No implementation was evaluated on fluent owner-authored English writing.
The public reference projects are young and do not provide comparative evidence
that their schemas outperform a smaller profile. Authorship attribution is not
the same task as generating recognizable prose, so attribution results support
feature selection but do not prove generation quality.

The first blinded comparison established a Portuguese tie and an English
preference for the generic baseline. Because the owner does not consider himself
fluent in English, the English choice measures perceived naturalness more directly
than identity fidelity. The conclusion would change if a held-out evaluation
showed that community accommodation erases the user's stance or that the layered
profile causes material factual drift. ADR-0068 and the implementation spike
resolved the three-layer schema; promotion thresholds remain evidence-dependent
until a later held-out calibration supports something stronger.

## Provenance and artifacts

Accessed 2026-08-13 through primary publication pages, official documentation,
local git clones pinned to the commits linked above, repository files, and git
history. Official skill-format sources:

- [Agent Skills specification](https://agentskills.io/specification)
- [Anthropic skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

The implementation spike was promoted into ADR-0068 and then deleted under the
kit's promote-or-delete rule. Only aggregate evaluation results remain here and
in the accepted decision record.

## Derived decision

[ADR-0068](../adr/0068-layer-personal-voice-evidence.md) is accepted. It records
the three-layer model produced by the first evaluation and owner clarification.
