---
name: ad-report
description: Draft, review, render, or verify a standalone analytical report through approved artifact templates. Use when the user invokes /ad-report, asks for a report from findings and evidence, wants an existing analysis restructured for an audience, or requests a DOCX, PDF, presentation, visualization, site, HTML, or Markdown analytical deliverable. Owns editorial hierarchy, composes available artifact capabilities through their public contracts, preserves facts, and gates export beyond the agreed local target. Ordinary use never tunes templates.
summary: Draft or review standalone analytical reports from approved templates, then compose the available renderer and its visual and accessibility verification workflow.
---

<background_information>
Codex and Claude Code apply this editorial workflow inline. The bundled script
resolves and validates templates. Format-specific rendering remains with the
available artifact capability rather than this skill.
</background_information>

# /ad-report

Create or review one standalone analytical report from findings, evidence, and an
audience. Normal use may write to an agreed local target but never mutates the
template store or exports elsewhere without approval.

<prime-directive>
Return a self-contained decision artifact. Preserve every claim, name, number,
date, citation, URL, identifier, commitment, uncertainty, exclusion, and requested
action. Own the editorial plan, then compose the requested renderer and its normal
verification contract. Never implement a parallel renderer or claim verification
that did not run.
</prime-directive>

## Step 1: Frame the report

Accept findings and evidence, a brief, or an existing report. Resolve question or
objective, audience, purpose, language, requested format, agreed local target,
requested action, and hard constraints. Ask only for an ungroundable value that
would materially change the report.

Build a silent invariant ledger. Read
[references/source-policy.md](references/source-policy.md) before accessing any
evidence beyond pasted text, an artifact attached for this report, a supplied
public URL, and the resolved template.

## Step 2: Resolve the durable template

Run from the consumer repository:

```bash
node <skill-base-dir>/scripts/template-store.mjs resolve \
  --bundled <skill-base-dir>/references/templates
```

Read [references/template-contract.md](references/template-contract.md). Select
the most specific approved template matching the report type, destination,
audience, purpose, and use conditions. Facts, safety, evidence limits, and format
hard constraints outrank every template. Record the selected layer and shadowing;
disclose a conflict only when it materially affects the report.

When no approved owner or project report template exists, use the official-method
bundled baseline and state outside the report, when material, that no private owner
or team report corpus was authorized.

## Step 3: Build the editorial plan

Own the information hierarchy: self-contained executive conclusion, question or
objective, method and evidence provenance, material findings, conclusions,
recommendations or next actions, limitations, and optional depth or appendices.
Keep findings distinct from interpretation. State uncertainty and evidence gaps
where the reader uses them.

Use a table, diagram, chart, or visualization only when it clarifies comparison,
sequence, magnitude, or relationships. Do not add media as decoration or make a
claim depend on color alone.

## Step 4: Compose owned capabilities

Read [references/composition.md](references/composition.md). Invoke another skill
only through its public contract:

- `ad-ground` for a bounded method or implementation gap;
- `ad-research` for an open question needing a durable study;
- `ad-voice` for the mandatory personal-voice and naturalization pass after facts,
  evidence limits, and structure are settled and before rendering;
- `ad-template-tune` only on an explicit curation request;
- the available DOCX, PDF, presentation, visualization, site, HTML, Markdown, or
  other artifact capability for the requested format.

Every final editorial report must pass through `ad-voice`, even when no confirmed
profile or external `humanizer` is available. Its public contract owns both the
confirmed profile and the bundled naturalization fallback. Render only after this
pass; a later textual correction must repeat it before re-rendering.

Pass the settled editorial plan and content to the renderer. Respect every callee
authorization, limitation, output, and gate; the stricter gate wins. Require its
normal render, visual inspection, and accessibility verification. Return here for
end-to-end factual and template coverage verification.

If no renderer exists, return the editorial report in the safest usable available
format and disclose the missing requested capability. Never fabricate a rendered
file, screenshot, visual check, or accessibility result.

## Step 5: Verify privately

Read [references/evaluation.md](references/evaluation.md). Check the invariant
ledger. Assign every applicable template rule and selected exemplar strength one
internal verdict: `satisfied`, `improved`, `not applicable`, or `higher-priority
override`. Revise unmet material items and re-run the composed renderer's checks
after any content change that affects layout.

An unresolved material gap is disclosed outside the usable report. "Same or
better" is allowed only as traceable coverage plus a named target-specific
improvement, never as a score based on length, recency, or visual polish.

## Step 6: Return or export

Return one usable report or the requested verified local artifact. Hide source
selection, composition trace, and internal ledgers unless requested or needed for
a material limitation.

Writing to the agreed local target is part of the framed request. Before publishing
or exporting beyond that agreed local target, show a receipt with the final
artifact, exact destination, selected template ID and layer, format, completed and
missing verification, material limitations, and exact action. Wait for explicit
approval. Any content, format, or destination change invalidates the receipt.
Report the resulting location or exact failure without retrying blindly.
