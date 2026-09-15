# Optional project domain adapter

A project may define `.agentic/prism/domain.md` when recurring domain facts
materially improve evaluation design. The adapter's absence is valid and not an
error. Continue with the generic method and disclose any domain assumption that
remains unknown.

## Scope gate

Read `Scope` before using any other adapter section. If the current evaluation
is outside the declared scope, ignore the adapter and do not mention or echo its
domain context in the answer. Continue with the generic method and the facts in
the current request or live inspected evidence. If scope is absent or ambiguous,
do not use adapter facts for a load-bearing recommendation until applicability
can be verified.

## Precedence and conflicts

Use current explicit user constraints first. Live inspected evidence has
precedence over adapter defaults. Adapter entries marked as observed facts are
context to verify when they affect the decision; defaults are starting points,
not truth. Surface a conflict and its consequence instead of silently selecting
the convenient value.

## Allowed content

Keep the adapter small and project-specific. It may define:

- evaluation scope and relevant product boundaries;
- canonical roles and decision owners;
- repositories, harnesses, telemetry, forms, corpora, and other evidence
  surfaces;
- authorization, privacy, retention, and regulatory constraints;
- domain measures, guardrails, scenarios, vocabulary, and rollout controls;
- required sources and stable configuration identifiers.

Every material entry should say whether it is an observed fact or a default and
include a source locator or owner when available. Do not use the adapter as a
copy of a handbook, source export, or session log.

## Safety boundary

The adapter contains no secrets and no personal data. Do not place credentials,
tokens, private source bodies, participant records, customer data, or
conversation transcripts in it. Point to an authorized source instead, and
report when access is unavailable.

## Suggested shape

Use only sections that carry real project information:

```markdown
# Prism domain adapter

## Scope

## Decision owners

## Evidence surfaces

## Constraints

## Measures and guardrails

## Vocabulary and controls
```

Within a section, label defaults explicitly. Unlabeled assertions are treated
as claims that still need verification when they are load-bearing.
