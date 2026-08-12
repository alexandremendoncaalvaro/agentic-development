# Spec `0003`: Keep AGENTS and GUIDELINES reciprocal

**Status:** shipped
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro

## Context

`AGENTS.md` is the concise operational guide that an agent reads every
session, while `GUIDELINES.md` owns the full engineering reference. When both
files repeat detailed rules, they become competing sources of truth. The kit
already templates pointers from AGENTS sections to GUIDELINES sections, but
the drift scan does not verify that relationship. A maintainer therefore has
no deterministic signal when a generated or hand-edited AGENTS section grows
into a duplicate.

## User Scenarios

- **Scenario 1: Bootstrap an operational guide beside guidelines**
  - Given a project has `GUIDELINES.md`
  - When an agent creates `AGENTS.md` with `ad-bootstrap`
  - Then its Code Style, Quality Gates, Commit & PR, and Security sections
    contain the designated GUIDELINES pointer and only a concise operational
    subset.

- **Scenario 2: Find a duplicate**
  - Given a project has both documents and an AGENTS section with detailed
    rules but no designated GUIDELINES pointer
  - When an agent runs `ad-drift`
  - Then its deterministic facts identify that section as a reciprocity
    finding for the agent to report.

- **Scenario 3: Accept a valid pointer**
  - Given a project has both documents and an AGENTS section with the
    designated pointer plus a concise non-negotiable subset
  - When an agent runs `ad-drift`
  - Then the scanner reports no duplication for that section.

## Requirements

### Functional

- R1: Both host variants of `ad-bootstrap` define the same four
  AGENTS-to-GUIDELINES mappings: Code Style → §2, Quality Gates → §8,
  Commit & PR Conventions → §10, and Security & Privacy → §12.
- R2: The dual-host `ad-drift` script emits deterministic
  `constitutionReciprocity` facts for those mappings when both root documents
  exist.
- R3: An existing mapped AGENTS heading without its designated pointer is a
  duplicate finding. A designated pointer is valid whether its Markdown link
  is explicit or its filename is plain text.
- R4: A mapped heading that is absent from AGENTS is not a duplicate finding;
  a project may keep its operational guide smaller than the template.
- R5: Any content read failure while checking this relationship appears in
  the scanner's top-level `unreadable[]` array.

### Non-functional

- The check is offline, Node-only, and has no dependencies.
- It detects the explicit ownership boundary; it does not infer semantic
  similarity from prose.
- Bundled scripts remain byte-identical across hosts.

## Success Criteria

- A fixture with all designated pointers produces zero reciprocity findings.
- A fixture with a detailed mapped section missing its pointer identifies the
  exact heading and line.
- A fixture without either root document produces no false reciprocity
  finding.
- Both host templates and scripts are covered by the test suite and refresh
  into the kit's dogfood install.

## Edge Cases

- `GUIDELINES.md` is absent, unreadable, or a non-file.
- `AGENTS.md` omits some or all mapped headings.
- A pointer uses Markdown link syntax or plain `GUIDELINES.md` text.
- A pointer occurs outside its mapped section and must not satisfy it.

## Out of Scope

- Rewriting a consumer's existing `AGENTS.md`.
- Semantic similarity, plagiarism, or arbitrary prose-duplication detection.
- Reconciling AGENTS with documents other than `GUIDELINES.md`.

## Open Questions

None.

## Related

- ADRs: [ADR-0030](../adr/0030-single-responsibility-per-document.md).
- Tasks: [task-0045](../tasks/0045-automate-constitution-reciprocity.md).
- Supersedes / Depends on: depends on the existing `ad-bootstrap` pointer
  contract and the deterministic `ad-drift` scan.
