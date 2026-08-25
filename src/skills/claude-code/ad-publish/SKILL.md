---
name: ad-publish
description: Draft or review collaboration publications through approved artifact templates. Use when the user invokes /ad-publish, asks to draft or improve a GitHub proposal issue, wants a proposal publication checked against prior approved patterns, or asks to publish that final text. Resolves layered templates, preserves facts, composes personal voice and research skills through their public contracts, and requires an exact-target approval receipt before any outward action. Ordinary use is read-only and never tunes templates.
summary: Draft or review collaboration publications from approved templates and authorized evidence. Preserves facts, composes existing skills, and gates every outward action.
---

<background_information>
Codex and Claude Code apply this editorial workflow inline. The bundled script
resolves and validates templates; prose judgment stays in the current session.
GitHub proposal issues are the first supported publication type.
</background_information>

# /ad-publish

Draft or review one collaboration publication. Normal use returns text and never
mutates templates or publishes anything.

<prime-directive>
Preserve every claim, name, number, date, citation, URL, identifier, commitment,
uncertainty, exclusion, and requested action. Put decision-relevant information
first. Never mutate a template during drafting, invent a historical pattern, or
perform an outward action without approval of the final text and exact target.
</prime-directive>

## Step 1: Frame the publication

Accept a brief or an existing draft. Resolve artifact type, destination, audience,
purpose, language, requested action, and hard constraints from context. Ask only
for an ungroundable value that would materially change the result.

The supported first-release type is `github-proposal-issue`. For another type,
identify a generic baseline explicitly and use it only when it will not materially
distort the result; otherwise stop and name the missing template.

Build a silent invariant ledger before editing. Read
[references/source-policy.md](references/source-policy.md) before accessing any
example beyond the resolved template.

## Step 2: Resolve the durable template

Run from the consumer repository:

```bash
node <skill-base-dir>/scripts/template-store.mjs resolve \
  --bundled <skill-base-dir>/references/templates
```

Read [references/template-contract.md](references/template-contract.md). Select
the most specific approved template matching type, destination, audience, purpose,
and use conditions. Request facts, safety requirements, and destination hard
limits outrank every template. Record the selected layer and shadowing internally;
disclose a conflict only when it materially changes the publication.

If no machine or project history exists, use the bundled baseline. Do not claim it
represents additional owner or team history.

## Step 3: Compose owned capabilities

Read [references/composition.md](references/composition.md). Invoke another skill
only when its public contract owns a necessary step:

- `ad-ground` for a bounded implementation or method gap;
- `ad-research` for an open question needing a durable study;
- `ad-voice` after facts, constraints, and structure are settled;
- `ad-pr` when the requested outward artifact is a pull request;
- `ad-template-tune` only when the user explicitly asks to curate a template.

Respect every callee authorization, limitation, output, and verification gate.
Return control here for end-to-end publication verification. Never mutate or copy
a callee's state, reimplement its specialist behavior, or infer one approval from
another.

## Step 4: Draft or review

Apply the template's required information, ordering rules, instructions, and
load-bearing strengths. Use the smallest useful set of authorized examples. Omit
a section when it adds no information.

For an existing draft, preserve correct material and revise only meaningful gaps.
For a brief, create the smallest self-contained proposal that lets the reader
understand the state, consequence, evidence, completion test, and next decision.
For a GitHub proposal issue, produce both a concise actionable title and the final
body; treat both as factual and approval invariants.

## Step 5: Verify privately

Read [references/evaluation.md](references/evaluation.md). Check the invariant
ledger, then assign every applicable template rule and exemplar strength one
internal verdict: `satisfied`, `improved`, `not applicable`, or `higher-priority
override`. Revise an unmet material item. Disclose any unresolved material gap
outside the usable draft, never inside it as workflow narration.

Do not report "same or better" as a score. Use that phrase only when traceable
coverage preserves every applicable strength and identifies a target-specific
improvement.

## Step 6: Return or act

The normal result is one usable publication containing the final title and body.
Hide source selection, composition trace, and the internal ledger unless requested
or needed for a material limitation.

For a GitHub outward action, first read the repository's binding docs for its
approved executable frontend or connected capability. Use that same capability for
a read-only identity and repository-target check.
Never log in, log out, or switch accounts inside this workflow; stop when identity
or target cannot be verified.

Before publishing, show an approval receipt containing the final title and body,
verified account identity, exact destination including service, owner, repository,
and issue target, selected template ID and layer, material limitations, and exact
action. Wait for explicit approval of that receipt. Any title, body, account, or
destination change invalidates approval. After approval, use only the verified
capability for that target and do not expand scope. Report the returned URL or the
exact failure without retrying blindly.
