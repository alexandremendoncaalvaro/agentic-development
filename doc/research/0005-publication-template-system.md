# RESEARCH-0005: Example-grounded publication template system

**Status:** concluded
**Created:** 2026-08-21
**Question:** Should `ad-publish` and `ad-report` retrieve examples on every run, apply fixed templates, or use a human-curated hybrid, and which design best produces repeatable, audience-appropriate work without duplicating `ad-voice`?
**Stakes:** medium times reversible
**Confidence:** Strong

## Conclusion and confidence

Use a human-curated hybrid. Each recurring artifact type gets a durable template
that records its purpose, required information, ordering, audience, channel,
selection conditions, trade-offs, and source provenance. At drafting time the
skill applies that template, retrieves only a few authorized examples that match
the current destination and purpose, and checks the draft against both. This is
stronger than fixed templates alone, which lose situational detail, and example
retrieval alone, which repeats selection work and produces unstable structure.

Keep three responsibilities separate. `ad-publish` drafts or reviews text for a
collaboration surface. `ad-report` drafts or reviews a standalone analytical
deliverable and delegates rendering to the relevant artifact capability when one
is available. A shared, explicitly invoked curation operation owns template
changes behind a human gate. `ad-voice` remains read-only and applies personal
identity and audience accommodation after the artifact structure is settled.
Neither source discovery nor normal drafting silently changes the template store.

Seed only two types: a GitHub proposal issue and a standalone analytical report.
The owner's CorridorKey issues provide strong proposal exemplars. No authorized
team corpus or clearly report-shaped owner corpus was named for this study, so a
report template may start from official method and the owner's long-form article,
but it must remain a baseline until the owner approves actual report examples.

## Question and scope

The owner repeatedly asks an agent to find their best prior work and the team's
best patterns, put the most important information first, adapt the result to its
audience and destination, and make the new artifact at least as useful as the best
reference. The alternatives were:

1. retrieve and imitate examples afresh on every run;
2. apply fixed templates without example retrieval;
3. combine durable, type-specific templates with bounded exemplar retrieval and
   a human-gated curation path.

The deciding criterion was repeatable usefulness across sessions without losing
destination fit, provenance, privacy, or the owner's communicative identity. The
study covers collaboration publications and standalone reports, their shared
template model, source selection, quality evaluation, and boundaries with existing
skills. It does not settle the final store path, schema filename, curator name, or
artifact renderer. Those become specification and architecture decisions after
the owner accepts the conclusion.

## Hypothesis

Not applicable. This is a method and implementation survey. The derived feature
must later be evaluated on held-out publication and report briefs against the
current untemplated workflow.

## Method

The study used the four-source `ad-ground` pass:

- Official guidance: GitHub template behavior, government content and report
  guidance, and current OpenAI prompting guidance.
- Validated implementations: the Kubernetes Enhancement Proposal template and
  the owner's public GitHub issues and long-form HTML article.
- In-repository patterns: personal-voice separation, progressive skill resources,
  deterministic scripts, and human-gated rule curation.
- Git history: the original publication/report tasks, their removal for missing
  product scope, and their later admission as task 0055 under the accepted PRD.

The public GitHub search returned 238 issues authored by the owner. A reproducible
candidate screen ranked the complete result by body length and counted level-two
headings; body length was used only to find substantial candidates, not as a
quality score. Manual appraisal selected CorridorKey issues 244, 245, and 246
because each makes the problem, consequence, completion condition, constraints,
and next action legible. The exact search was:

```bash
rtk env GH_HOST=github.com ghp api --paginate -X GET search/issues \
  -f q='author:alexandremendoncaalvaro is:issue' -f per_page=100
```

No private team source was read. Claims are graded using WORKFLOW section 17.

## Evidence

### A hybrid preserves stable structure without treating examples as a static prompt dump

**Grade: High (official guidance plus E2 implementation and primary research).**
GitHub templates exist to standardize the information contributors supply, while
issue forms can require structured fields. OpenAI's current prompting guidance
recommends stating each instruction once and retaining examples only when they
encode a product requirement or correct a measured gap. Research on in-context
learning shows that example selection materially affects results and that
semantically relevant examples outperform random selection. Together these sources
support a compact durable template plus a small, context-matched exemplar set,
not every historical example on every invocation.

- [GitHub, About issue and pull request templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates)
- [OpenAI, Prompting best practices](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)
- [Liu et al., What Makes Good In-Context Examples for GPT-3?](https://arxiv.org/abs/2101.06804)
- [Lu et al., Fantastically Ordered Prompts and Where to Find Them](https://arxiv.org/abs/2104.08786)

### Templates should be type-specific and front-load the decision-relevant content

**Grade: High (independent official guidance plus mature implementation).**
The Office for National Statistics tells authors to put the most important
information at the start of each section, paragraph, and sentence and to use
descriptive headings for scanning. The UK research-report guide requires a clear,
self-contained executive summary with the aims, method, important findings,
conclusions, and recommendations, while moving technical depth to the body or
appendices. The Kubernetes Enhancement Proposal template similarly separates a
wide-audience summary, motivation, goals, non-goals, proposal, risks, design, and
test plan. The stable rule is not one universal outline. It is a small catalog of
artifact-specific structures with important information first and optional depth
after it.

- [Office for National Statistics, Structuring content](https://service-manual.ons.gov.uk/content/writing-for-users/structuring-content)
- [UK Department for Education, Research reports guidance](https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf)
- [Kubernetes Enhancement Proposal template](https://github.com/kubernetes/enhancements/blob/master/keps/NNNN-kep-template/README.md)

### The owner's strongest proposal issues already expose a reusable template

**Grade: High (direct owner-authored artifacts).** CorridorKey issues 245 and 246
open with the concrete current state, explain why the problem matters now, state
why adjacent work did not absorb it, define observable completion, propose a
bounded approach, and name risks or out-of-scope work. Issue 244 adds a useful
blocked-tracker variant: it proves why no implementation is possible yet, tells a
future implementer exactly what external event unblocks it, and still defines the
eventual completion test. These are stronger seeds than the shorter Fleetu tracker
issues because they remain actionable for a reader who did not participate in the
original work.

- [CorridorKey issue 246, validate screen-color thresholds](https://github.com/nikopueringer/CorridorKey/issues/246)
- [CorridorKey issue 245, unify ClipEntry implementations](https://github.com/nikopueringer/CorridorKey/issues/245)
- [CorridorKey issue 244, support CorridorKeyBlue on MLX](https://github.com/nikopueringer/CorridorKey/issues/244)

The reusable proposal shape is: conclusion or concrete state, consequence, evidence
and constraints, observable completion, recommended next path, risks and trade-offs,
then explicit exclusions. Sections should be omitted when they add no information;
the template is a decision aid, not a demand to fill every heading.

### Report structure and visual rendering are separate responsibilities

**Grade: High (official report guidance plus in-repository architecture).** The UK
report guide treats audience, key messages, findings, conclusions, recommendations,
and accessible format selection as one editorial problem while allowing text,
tables, graphs, diagrams, and appendices according to the material. The kit already
uses progressive skill resources for detailed formats and keeps deterministic
rendering in scripts while judgment remains in skill text. `ad-report` should own
the information hierarchy and editorial review, then use an available document,
presentation, PDF, visualization, or site capability for the requested format.
It should not become a second renderer for every artifact type.

- [UK Department for Education, Research reports guidance](https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf)
- [ADR-0056](../adr/0056-skills-progressive-disclosure-references.md)
- [ADR-0057](../adr/0057-skills-deterministic-steps-as-scripts.md)

### Artifact structure must remain separate from personal voice

**Grade: High (accepted specification and decision).** The personal-voice feature
already separates stable identity, community accommodation, and destination
context; it applies facts and destination shape before voice. Publication templates
therefore own what information the artifact needs and how readers traverse it.
`ad-voice` owns how the approved content sounds. Team examples may supply channel
conventions and template evidence, but never the owner's identity or permission to
copy a teammate's distinctive phrasing.

- [Spec 0004](../specs/0004-personal-voice-layer.md)
- [ADR-0068](../adr/0068-layer-personal-voice-evidence.md)
- [`ad-voice`](../../src/skills/codex/ad-voice/SKILL.md)

### Template curation needs provenance, source authorization, and an explicit write gate

**Grade: High (directly observed repository pattern).** `ad-level-up` separates
read-only application from state-changing curation, requires a cited candidate,
checks that the new rule generalizes, and writes one approved delta at a time.
`ad-voice-tune` negotiates source scope before private reads and stores derived
patterns rather than raw messages by default. A publication-template curator should
reuse those boundaries: exact source scope before private access; author classes
kept separate; source locators and derived structural rules retained by default;
raw excerpts only with explicit retention approval; and one template delta per
human approval.

- [`ad-level-up`](../../src/skills/codex/ad-level-up/SKILL.md)
- [`ad-voice-tune`](../../src/skills/codex/ad-voice-tune/SKILL.md)
- [ADR-0037](../adr/0037-ad-level-up-rule-curation.md)

### Two drafting skills plus one shared curation operation is the smallest coherent split

**Grade: Medium (strong in-repository analogy, not yet evaluated).** Collaboration
posts and standalone reports have different destinations, output lifecycles, and
format needs, so one drafting skill would carry branches irrelevant to most
invocations. Letting both drafting skills mutate the same template store would
duplicate the sensitive workflow and make ordinary use capable of silent learning.
The existing `ad-voice` and `ad-voice-tune` split demonstrates the smaller
interface: read-only application in normal use and one explicitly invoked owner of
curation. The final curator name remains a product decision, but the responsibility
boundary is sufficiently grounded to specify.

- [`ad-voice`](../../src/skills/codex/ad-voice/SKILL.md)
- [`ad-voice-tune`](../../src/skills/codex/ad-voice-tune/SKILL.md)
- [OpenAI, Build skills](https://developers.openai.com/plugins/build/skills)

### "Same or better" must be a traceable comparison, not a quality claim based on popularity

**Grade: Medium (method convergence, local evaluation pending).** Comments,
reactions, length, and recency can help discover candidates but do not establish
that an artifact is useful. The comparison should instead enumerate the selected
template's and exemplars' load-bearing strengths, check that the new draft retains
each applicable strength, and name any target-specific improvement such as clearer
consequence, stronger evidence, more explicit action, or less irrelevant detail.
The visible result should be phrased as coverage and improvement evidence, never an
unsupported declaration that the draft is objectively superior. Human judgment on
held-out briefs remains the release gate.

- [OpenAI, Prompting best practices](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)
- [WORKFLOW section 17](../../WORKFLOW.md)
- [CorridorKey issue 246](https://github.com/nikopueringer/CorridorKey/issues/246)

## Limitations and what would reverse the conclusion

The study did not read Slack, Confluence, private GitHub material, employer
repositories, or any other team corpus because the owner did not authorize an
exact source and date range. The public GitHub issue corpus contains strong owner
examples but no independent outcome signal showing which issues readers found
most useful. The owner's HTML workflow article demonstrates front-loaded long-form
communication and purposeful diagrams, but it is an article rather than an
analytical report. It cannot by itself validate the report template.

The in-context-learning papers evaluate benchmark tasks rather than editorial
quality, so they support careful exemplar selection but do not prove this feature's
quality gain. A held-out comparison that shows template-plus-exemplar output is no
more useful than the current ad hoc workflow, or that the three-responsibility split
adds repeated work without improving consistency, would reverse the conclusion.
The first mitigation would be to reduce the template schema and exemplar count,
not to merge personal voice with artifact structure.

## Provenance and artifacts

Accessed 2026-08-21 through official web documentation, primary publication pages,
the authenticated GitHub API, repository files, owner-authored local files, and git
history.

- **A1:** [GitHub template guidance](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates), accessed through the web documentation page.
- **A2:** [Office for National Statistics content structure](https://service-manual.ons.gov.uk/content/writing-for-users/structuring-content), accessed through the web documentation page.
- **A3:** [UK research-report guidance](https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf), accessed through the official PDF.
- **A4:** [OpenAI prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices), accessed through OpenAI Docs.
- **A5:** [Liu et al.](https://arxiv.org/abs/2101.06804) and [Lu et al.](https://arxiv.org/abs/2104.08786), accessed through their primary paper records.
- **A6:** [OpenAI, Build skills](https://developers.openai.com/plugins/build/skills), accessed through official OpenAI documentation.
- **B1:** [Kubernetes Enhancement Proposal template](https://github.com/kubernetes/enhancements/blob/master/keps/NNNN-kep-template/README.md), accessed through the canonical repository.
- **B2:** [CorridorKey issues 244](https://github.com/nikopueringer/CorridorKey/issues/244), [245](https://github.com/nikopueringer/CorridorKey/issues/245), and [246](https://github.com/nikopueringer/CorridorKey/issues/246), accessed through GitHub and confirmed as owner-authored by the API.
- **B3:** `comunicacao/workflow-article.pt-BR.html` in the owner's `ales-workflow` repository, accessed from the pinned local checkout at `/Users/ale/dev/ales-workflow`; it explicitly describes mining prior team work into sharper templates as a current behavior rather than a packaged skill.
- **C1:** [Spec 0004](../specs/0004-personal-voice-layer.md), [ADR-0068](../adr/0068-layer-personal-voice-evidence.md), and the dual-host personal-voice skills, accessed through repository reads.
- **C2:** [ADR-0056](../adr/0056-skills-progressive-disclosure-references.md), [ADR-0057](../adr/0057-skills-deterministic-steps-as-scripts.md), and [`ad-level-up`](../../src/skills/codex/ad-level-up/SKILL.md), accessed through repository reads.
- **D1:** `85159b5` introduced separate publication and report task proposals; `28525b1` removed them because they lacked a repository-local product anchor; `c669d90` added the accepted PRD roadmap item and task 0055. Commands: `git log --all --follow -- doc/tasks/0041-example-grounded-publication-skill.md`, the equivalent command for task 0042, and `git log origin/main --follow -- doc/tasks/0055-investigate-publication-reporting-skills.md`.

## Derived decision

The owner accepted the conclusion on 2026-08-21. The feature specification must
define the two drafting workflows, the shared curation operation, the initial
template types, the privacy boundary, and the evaluation contract. The template
store location, layering, and precedence must then graduate to an ADR before
implementation.
