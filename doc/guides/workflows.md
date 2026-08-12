# Workflows

The kit installs every skill. Do not choose a mode first; choose the smallest route that makes the next decision safer or clearer.

When unsure, start with `/ad-next`. It surveys the repository and prioritizes the next useful action.

## New product

Use this when the product outcome is not yet captured.

1. `/ad-grill-me` if the request is fuzzy; it asks only questions that code and existing documents cannot answer.
2. `/ad-prd` once a durable product contract is useful.
3. `/ad-bootstrap` to create or audit the operational guide from real context.
4. `/ad-guidelines` when the project needs explicit engineering standards.
5. `/ad-spec` for one feature, then `/ad-task` for implementable vertical work.
6. `/ad-ground` before implementation; link its validated evidence record from the governing artifact, then use `/ad-tdd` or `/ad-tdg` as appropriate.

Do not create a PRD, architecture document, or task merely because it appears in this list. Create it when it changes how the agent or team will build the work.

## Existing feature

Use this when code already defines most of the product behavior.

1. `/ad-ground` to inspect official documentation, repository patterns, and history, then persist a validated evidence record before changing behavior.
2. `/ad-spec` when the feature needs a durable acceptance contract; skip it for a contained, obvious change.
3. `/ad-architecture` or `/ad-adr` only when existing system patterns or a hard-to-reverse decision need to be recorded.
4. `/ad-tdd` for test-expressible behavior; `/ad-tdg` when several implementation strategies are plausible.
5. `/ad-review main..HEAD` before the work reaches a shared surface.

## Bug or performance regression

1. `/ad-diagnose` builds a deterministic feedback loop before proposing a fix.
2. Reproduce, test the fix at the correct seam, and keep the regression test.
3. Use `/ad-deepen` only if a missing seam exposes load-bearing design friction; a one-off script does not need an architectural refactor.
4. Finish with `/ad-review`.

## Research or technical uncertainty

- `/ad-ground` for a known implementation direction that needs evidence.
- `/ad-spike` when the technique itself is uncertain across plausible approaches.
- `/ad-tdg` when the technique is known but the implementation strategy is uncertain.
- `/ad-research` for an evidence-graded study that should become a durable record.
- `/ad-derisk` to retire several unknowns before construction begins.

## Quality and delivery

1. `/ad-review` is the normal two-axis diff review.
2. `/ad-audit` is the maximum gate for a rules-anchored, evidence-heavy check before a consequential handoff or publication.
3. `/ad-commit` prepares atomic Conventional Commits with DCO sign-off.
4. `/ad-pr` opens a pull request; `/ad-merge` evaluates and merges it.
5. `/ad-release` orchestrates a supported npm release with explicit confirmation boundaries.

Use `/ad-hooks` when the repository needs executable quality gates, not simply because the skill exists.

## Session and maintenance

- `/ad-handoff` writes a compact OS-temp handoff when a session must continue with fresh context.
- `/ad-drift` compares the repository documentation against code.
- `/ad-roadmap` summarizes delivered and remaining product roadmap work.
- `/ad-archive` removes completed planning artifacts only after their content has been absorbed into durable documentation.

For the visual scenario router, see [WORKFLOW-FLOWS.md](../../WORKFLOW-FLOWS.md). For the full catalog, see [the skill reference](skills.md).
