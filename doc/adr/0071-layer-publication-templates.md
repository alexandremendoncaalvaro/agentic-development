# ADR-0071: Layer publication templates

**Status:** accepted
**Date:** 2026-08-21
**Deciders:** Alexandre Alvaro

## Context

Spec 0005 requires `ad-publish` and `ad-report` to apply durable, type-specific
templates while using authorized matching examples for situational detail. The
templates must work with no configuration, carry approved owner conventions
across repositories, allow a project or team to define a more specific standard,
and remain inspectable by a human. Normal drafting must be read-only, while
curation needs provenance, validation, atomic writes, and explicit approval.

The kit already solves similar forces in two places. ADR-0035 and ADR-0043 layer
curated rules across a machine store and a project store with visible project
precedence. ADR-0068 separates read-only personal-voice application from
human-gated tuning and stores structured, versioned Markdown outside repositories
by default. Publication templates need the same portability and safety properties,
but their data must not enter either the rule store or the personal voice profile:
they define artifact structure, selection conditions, and editorial standards.

The installation model copies each skill directory independently. A shared runtime
package or registry would add machinery that the current Markdown-plus-script skill
architecture does not need. Baselines and validation contracts therefore need a
layout that stays usable from each consuming skill and testable for parity.

## Decision

We will resolve publication and report templates from three layers:

1. **Bundled baselines.** The kit ships a GitHub proposal issue template with
   `ad-publish` and a standalone analytical report template with `ad-report` under
   each skill's `references/templates/` directory. The shared contract is copied
   into every consuming skill and kept byte-identical by tests.
2. **Machine template store.** Approved portable templates live at
   `~/.agentic/templates/` by default. `AGENTIC_TEMPLATES_DIR` overrides that path.
3. **Project template store.** Approved project or team templates live at
   `.agentic/templates/` in the repository root. On first write, the curator asks
   whether the layer is committed or machine-local. Machine-local is the default
   and is implemented through `.git/info/exclude`; committing requires explicit
   approval because provenance locators may reveal internal context.

Resolution is by stable template identifier. A project template shadows the same
identifier in the machine store, and a machine template shadows the bundled
baseline. Shadowing is never silent: the drafting workflow records the resolved
layers internally and discloses a conflict when it materially affects the output.
Different identifiers remain candidates and are selected by the artifact type,
destination, audience, purpose, and use conditions defined in Spec 0005. Request
facts, safety constraints, and destination hard limits outrank every template and
never become a persisted override implicitly.

Each template is one Markdown file at
`<layer>/<publication|report>/<template-id>.md`. It contains exactly one fenced
JSON metadata block plus human-readable instructions. The versioned metadata holds
the stable identifier, artifact class and type, destinations, audiences, purpose,
use and avoidance conditions, required and optional information, ordering rules,
source locators, separately attributed author classes, load-bearing strengths,
trade-offs, approval state, version, and limitations. Raw source artifacts and
unapproved exact excerpts do not belong in a template.

We will name the shared curator `ad-template-tune`. `ad-publish` and `ad-report`
read resolved templates but never mutate them. `ad-template-tune` is the only
runtime writer to the machine and project stores: it negotiates exact source scope,
derives one reviewable delta, validates the complete candidate, and atomically
writes it only after explicit owner approval. Bundled baseline changes remain
ordinary kit changes governed by review and release gates, never runtime tuning.

A shared deterministic skill script will resolve layers and validate schema,
provenance, identifiers, approval state, version compatibility, excerpt retention,
and atomic update input. The canonical script and contract are duplicated only
where independent skill installation requires it; parity tests prevent drift
across consumers and hosts. Skill composition remains orchestration through public
contracts: `ad-publish` and `ad-report` may invoke `ad-template-tune` only when the
owner explicitly requests curation, and they compose other skills as required by
Spec 0005 without copying those skills' state or specialized behavior.

## Consequences

- Both drafting skills work immediately from small bundled baselines and improve
  without changing their own instructions.
- Owner templates can follow the practitioner across repositories, while project
  templates can express a team-specific standard and outrank portable preferences.
- Template provenance and internal project context stay machine-local by default;
  a team can still deliberately version and share a project template.
- Drafting stays read-only and repeatable. A rejected or interrupted curation run
  cannot partially mutate future behavior.
- Composition keeps personal voice, research, pull-request creation, and artifact
  rendering in their existing owners instead of growing parallel implementations.
- The three-layer model and copied shared resources add resolution and parity
  tests. Consumers must understand which layer supplied the active template.
- A fenced JSON block is stricter than free-form Markdown and less convenient for
  casual manual edits, but it supports deterministic validation without a runtime
  parser dependency.
- Machine-local project templates must be re-excluded in a fresh clone. Committed
  project templates may expose provenance locators, so the explicit visibility
  choice remains a necessary human gate.
- `ad-template-tune` is broader than either drafting skill. Its scope must stay
  limited to the publication and report template contract rather than becoming a
  generic template editor.

## Alternatives Considered

- **Retrieve examples on every run without durable templates** - rejected because
  selection is repeated, results vary between sessions, and recurring owner rules
  remain implicit.
- **Use only fixed bundled templates** - rejected because project conventions and
  approved improvements could not accumulate without changing and releasing the
  kit.
- **Let `ad-publish` and `ad-report` curate their own stores** - rejected because
  ordinary drafting would gain silent write capability and the privacy-sensitive
  curation workflow would be duplicated.
- **Name the curator `ad-publish-tune`** - rejected because reports share the same
  store and would appear subordinate to the publication workflow.
- **Name the curator `ad-template-curate`** - rejected because the kit's established
  `ad-voice` and `ad-voice-tune` pair already makes `tune` the recognizable verb
  for a separate, human-gated refinement operation.
- **Store templates in the personal voice profile** - rejected because artifact
  structure and source provenance are not communicative identity.
- **Reuse `.agentic/rules/` and `~/.agentic/rules/`** - rejected because audit rules
  and editorial templates have different schemas, consumers, privacy risks, and
  lifecycle owners.
- **Use one central installed runtime package for shared files** - rejected because
  skills install independently today and byte-identical copied resources already
  provide a tested, dependency-free sharing pattern.
- **Commit every project template by default** - rejected because source locators
  and derived team conventions may be private even when raw examples are omitted.
- **Store one JSON catalog without Markdown** - rejected because deterministic
  parsing would improve slightly at the cost of human reviewability and useful
  explanatory instructions.

## Addendum: Collaboration-reply baseline (2026-09-02)

The bundled `ad-publish` layer also includes a `collaboration-reply` baseline for
active Slack, Discord, GitHub issue, and pull-request threads. This is a second
artifact type under the existing resolution, provenance, validation, read-only
drafting, and approval contracts. It does not add a store, writer, or precedence
rule. Unlike a proposal, the reply inherits settled thread context and therefore
contains only the grounded, net-new answer or action participants need next.
