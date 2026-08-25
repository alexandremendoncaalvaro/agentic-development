# Spec `0005`: Compose publication and reporting workflows

**Status:** accepted
**Created:** 2026-08-21
**Owner:** Alexandre Alvaro

## Context

The owner repeatedly produces collaboration publications and standalone reports
that need more than a personal voice. Each artifact must expose the most relevant
information first, fit its audience and destination, preserve facts, and meet the
useful structural standard established by strong prior work. Today the owner must
restate those requirements and ask the agent to search for examples on each run.
That creates inconsistent structure, repeated discovery work, and no durable way
to improve the standard from approved evidence.

The kit needs one example-grounded publication and reporting feature with two
user-facing drafting workflows and one shared curation operation. Durable,
type-specific templates provide repeatability; a small set of authorized matching
examples provides context. The feature must compose existing skills when they
already own part of the workflow. It must not duplicate personal voice, research,
pull-request, or artifact-rendering behavior, and it must never read private
sources, change templates, publish, or export without the corresponding approval.

The first release supports two artifact types: GitHub proposal issues through
`ad-publish`, and standalone analytical reports through `ad-report`. Additional
types enter through the same human-gated curation contract after evidence shows
that their recurring structure is worth retaining.

## User Scenarios

- **Scenario 1: Draft a GitHub proposal issue**
  - Given the owner supplies a proposal brief or existing draft
  - When they invoke `ad-publish` for a GitHub issue
  - Then the skill applies the proposal template, uses only authorized matching
    examples, composes `ad-voice` when supported, and returns a usable draft with
    the decision-relevant information first.

- **Scenario 2: Review an existing publication**
  - Given the owner supplies a publication draft and its destination
  - When they ask `ad-publish` to review it
  - Then the skill preserves its facts, checks every applicable template and
    exemplar strength, revises material gaps, and reports any unresolved limitation
    separately from the publication text.

- **Scenario 3: Produce a standalone report**
  - Given the owner supplies findings, evidence, audience, and requested format
  - When they invoke `ad-report`
  - Then the skill creates the information hierarchy from the report template and
    composes the available document, PDF, presentation, visualization, or site
    capability to render and verify the requested artifact.

- **Scenario 4: Work without historical examples or a connector**
  - Given no authorized matching corpus or connector is available
  - When the owner requests a publication or report
  - Then the workflow applies the bundled baseline template, does not fabricate
    prior patterns, and discloses the evidence limitation outside the usable draft.

- **Scenario 5: Curate a template from prior work**
  - Given the owner names an exact source scope and author class
  - When they explicitly invoke the shared curation operation
  - Then it derives reusable structural patterns, presents one traceable template
    delta, and persists only the delta the owner approves.

- **Scenario 6: Approve an outward action**
  - Given a draft or rendered report is ready
  - When a workflow could publish it to a service or export it outside the agreed
    local destination
  - Then the workflow presents the destination and final artifact and waits for
    explicit approval before acting.

## Requirements

### Functional

- R1: The kit ships `ad-publish` and `ad-report` for both supported hosts.
  `ad-publish` owns collaboration publications; `ad-report` owns standalone
  analytical deliverables. They share a single template contract and a single,
  explicitly invoked curation operation.
- R2: `ad-publish` initially supports GitHub proposal issues. `ad-report` initially
  supports standalone analytical reports. An unsupported artifact type uses a
  clearly identified generic baseline or stops when using that baseline would
  materially change the result; it never claims a historical standard exists.
- R3: Each drafting workflow accepts either a brief or an existing draft and
  resolves artifact type, destination, audience, purpose, language, requested
  action, and hard constraints from available context. It asks only about a value
  that cannot be grounded and would materially change the artifact.
- R4: A workflow composes an existing skill or host capability whenever that
  capability already owns a required step. Composition uses the callee's public
  contract, respects all of its gates and limitations, and returns control to the
  calling workflow for end-to-end verification. The caller does not copy the
  callee's mutable state or reimplement its specialized behavior.
- R5: When a confirmed personal voice profile is available, the drafting workflow
  composes `ad-voice` after facts, safety, destination constraints, and artifact
  structure are settled. `ad-voice-tune` remains the only owner of personal voice
  changes. Publication examples may inform structure and channel conventions but
  never become personal identity evidence.
- R6: A drafting workflow composes `ad-ground` for a bounded implementation or
  method gap and `ad-research` for an open question that needs a durable study.
  It does not perform broad research by default when the supplied evidence and
  template are sufficient. `ad-pr` remains the owner of pull-request creation;
  `ad-publish` may prepare text consumed by it but does not duplicate its gates.
- R7: `ad-report` owns the editorial plan, including executive conclusion,
  evidence, findings, recommendations, limitations, and optional depth. It
  composes an available artifact skill or host capability for DOCX, PDF, slides,
  visualization, site, or another requested format and requires that capability's
  normal render-and-verify workflow. It does not implement parallel renderers.
- R8: Every template has a stable identifier and records artifact class, artifact
  type, supported destinations, intended audiences, purpose, use and avoidance
  conditions, required and optional information, ordering rules, source locators,
  author classes, load-bearing strengths, trade-offs, approval state, version, and
  known limitations.
- R9: Resolution applies factual and safety constraints first, then destination
  hard constraints, then the most specific approved project or team template,
  then an approved owner template, and finally the bundled baseline. Conflicts and
  shadowing that affect the output are disclosed. Exact store paths and merge
  mechanics require an ADR before implementation.
- R10: Drafting uses the resolved durable template plus the smallest useful set of
  authorized examples matching artifact type, destination, audience, and purpose.
  Recency, length, reactions, and popularity may discover candidates but cannot
  establish quality or outweigh task fit.
- R11: Before reading a private source, the workflow obtains authorization for the
  exact service or path, scope, author filter, and relevant date range. Public URLs
  supplied by the owner may be read without expanding into adjacent private
  sources. Unavailable connectors degrade to supplied text, authorized local
  files, public sources, or the bundled baseline.
- R12: Owner-authored, team or community-authored, and external examples remain
  separately attributed. Team or community evidence may establish shared
  conventions but never licenses copying distinctive phrasing or treating another
  person's work as the owner's identity.
- R13: Raw source content is not retained by default. The shared curation operation
  stores source locators, bounded summaries, derived structural rules, provenance,
  confidence, and limitations. It retains an exact excerpt only after separate,
  explicit approval for that excerpt.
- R14: Normal drafting and review are read-only with respect to the template store.
  The shared curation operation proposes one versioned delta at a time, shows its
  supporting evidence and affected scope, validates it, and waits for explicit
  approval before an atomic write. Rejection leaves the store unchanged.
- R15: The proposal template requires a front-loaded conclusion or concrete state,
  consequence, evidence and constraints, observable completion, recommended next
  path, risks or trade-offs, and explicit exclusions when applicable. A section is
  omitted when it would add no information.
- R16: The report template requires a self-contained executive conclusion,
  question or objective, method and evidence provenance, material findings,
  conclusions, recommendations or next actions, limitations, and optional
  appendices. Tables, diagrams, and visualizations are used only when they clarify
  comparison, sequence, magnitude, or relationships.
- R17: Before returning an artifact, the workflow accounts for every applicable
  template rule and each load-bearing strength selected from examples. Every item
  receives an internal satisfied, improved, not applicable, or higher-priority
  override verdict. An unresolved material gap is revised or disclosed.
- R18: "Same or better" is reported only as traceable coverage of applicable
  strengths plus named target-specific improvements. The workflow never infers
  superiority from length, recency, reactions, or an unsupported quality score.
- R19: A normal draft request returns one usable artifact. Source-selection detail,
  internal coverage state, and composition trace remain hidden unless requested or
  needed to disclose a material limitation. Before an outward action, the workflow
  shows a short approval receipt containing the final artifact, exact destination,
  selected template, material limitations, and action to be taken.
- R20: Publishing to a collaboration service and exporting beyond the agreed local
  destination require explicit approval of the final artifact and exact target.
  Approval for source access, template mutation, content, one destination, or one
  format does not imply approval for another.

### Non-functional

- The feature is local-first, works offline with bundled baselines, and requires
  no connector, service, account, telemetry, or new runtime package dependency.
- Private source content, raw excerpts without retention approval, and personal or
  team-derived templates never enter the kit repository, package, synthetic test
  fixtures, logs, or review handoffs.
- Skill sources, shared references, and bundled scripts remain behaviorally
  equivalent across Claude Code and Codex; shared files remain byte-identical where
  the installer contract requires parity.
- Main skill files use progressive references for artifact templates, source and
  privacy policy, composition contracts, and evaluation procedure.
- Deterministic skill scripts validate template schema, provenance, approval
  state, version compatibility, identifier uniqueness, and atomic update inputs.
- Publication and report outputs meet the accessibility checks required by their
  destination and composed artifact capability.

## Success Criteria

Definitional. Measurable conditions; pass/fail observable, not aspirational.
Per-criterion progress tracking lives in per-Spec tasks.

- A held-out evaluation contains at least three GitHub proposal briefs and three
  standalone report briefs not used to curate the initial templates. Against the
  current untemplated workflow, the owner rates the templated result equal or
  better for usefulness in all six cases and strictly prefers it in at least one
  case for each artifact type.
- Every held-out result preserves all fixture-marked claims, names, numbers, dates,
  citations, URLs, commitments, uncertainty, and requested actions.
- Every applicable template rule and selected exemplar strength receives one of
  the R17 verdicts, with no unresolved material gap omitted from disclosure.
- The proposal fixtures place the concrete state or requested decision before
  supporting depth and retain every applicable element in R15. The report fixtures
  produce a self-contained executive conclusion and retain every applicable
  element in R16.
- A composition fixture for each applicable dependency demonstrates that the
  caller respects the callee's authorization and verification contract and does
  not create a second voice profile, research artifact type, pull-request flow, or
  format renderer.
- Refusing private-source access, template-write approval, publication approval,
  or export approval leaves that source unread, the template store unchanged, and
  the artifact unpublished or unexported, respectively.
- Running without a connector or matching history still returns a baseline draft
  for both initial types and identifies the missing evidence without inventing a
  prior owner or team pattern.
- Template validation rejects missing provenance, mixed author classes, unknown
  versions, duplicate identifiers, unauthorized retained excerpts, and a mutation
  without recorded approval.
- The complete test suite, dual-host parity checks, dogfood refresh, and package
  dry-run pass with all new skill files and shared resources included.

## Edge Cases

- The input is empty, already well structured, internally contradictory, or mixes
  more than one artifact type or destination.
- No template matches, multiple equally specific templates match, or a project
  template conflicts with an owner or bundled template.
- A source is stale, deleted, inaccessible, private, unattributed, authored by
  multiple people, or contains secrets, personal data, copied material, or
  model-generated text.
- A connector exists but lacks permission for the named source or cannot enforce
  the authorized author and date boundaries.
- The requested destination changes after drafting, has a hard length limit, or
  combines public and private audiences.
- The user approves content but not the destination, approves a local file but not
  external export, or revises the artifact after approval.
- The requested report format has no available artifact capability, or rendering
  succeeds but visual or accessibility verification fails.
- A composed skill is unavailable, has a stricter gate, or returns a material
  limitation that prevents the caller from completing its own contract.
- A curation run is interrupted before approval or during persistence; the prior
  valid template store remains recoverable and unchanged.

## Out of Scope

- Learning or changing personal voice, team identity, brand voice, or another
  person's distinctive writing style.
- Mandatory connectors, automatic workspace scraping, or background harvesting
  of publications and reports.
- Silent template mutation during ordinary drafting, automatic publication,
  scheduled publishing, campaign management, or a general content management
  system.
- Replacing `ad-ground`, `ad-research`, `ad-pr`, `ad-voice`, `ad-voice-tune`, or
  document, PDF, presentation, visualization, and site capabilities.
- Building a generic renderer or supporting every publication and report type in
  the first release.
- Ranking authors or examples by popularity and claiming objective writing quality.
- Automatically prompting for curation after every draft; curation remains an
  explicit operation in the first release.

## Open Questions

- Which name should expose the shared curation operation without implying that
  ordinary drafting learns automatically? Resolve before drafting its skill.
- Which machine, project, and bundled paths store templates, and how are overrides,
  migrations, and conflicts represented? Resolve in the architecture ADR required
  before implementation.
- Which owner-authorized analytical reports should replace or supplement the
  official-method baseline for the first `ad-report` evaluation? Resolve during
  the initial curation task; no private report source is authorized by this spec.
- Should a later release offer a contextual suggestion to curate a repeatedly
  corrected artifact? The first release excludes automatic prompting until normal
  use demonstrates that the extra interruption is valuable.

Resolution (2026-08-21): [ADR-0071](../adr/0071-layer-publication-templates.md)
names the shared operation `ad-template-tune`, resolves templates from bundled,
machine, and project layers, and defines the store paths, precedence, Markdown
contract, visibility choice, validation, and atomic write boundary.

The owner-authorized analytical report corpus remains open for the implementation
task because neither the research approval nor this specification authorizes a
private report source. Contextual curation suggestions remain deferred until usage
evidence justifies the interruption.

## Related

- ADRs: [ADR-0035](../adr/0035-rules-location-convention.md),
  [ADR-0037](../adr/0037-ad-level-up-rule-curation.md),
  [ADR-0043](../adr/0043-per-project-rules-layer.md),
  [ADR-0056](../adr/0056-skills-progressive-disclosure-references.md),
  [ADR-0057](../adr/0057-skills-deterministic-steps-as-scripts.md), and
  [ADR-0068](../adr/0068-layer-personal-voice-evidence.md). Proposed realization:
  [ADR-0071](../adr/0071-layer-publication-templates.md).
- Tasks: [Task 0059](../tasks/0059-implement-template-curation.md),
  [Task 0060](../tasks/0060-implement-publication-workflow.md), and
  [Task 0061](../tasks/0061-implement-report-workflow.md).
- Supersedes / Depends on: depends on
  [RESEARCH-0005](../research/0005-publication-template-system.md),
  [Spec 0004](0004-personal-voice-layer.md), and
  [Task 0055](../tasks/0055-investigate-publication-reporting-skills.md).
