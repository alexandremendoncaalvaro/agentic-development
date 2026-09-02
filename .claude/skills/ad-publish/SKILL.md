---
name: ad-publish
description: Draft or review collaboration publications through approved artifact templates. Use when the user invokes /ad-publish, asks to draft or improve a GitHub proposal issue, asks for a concise Slack, Discord, GitHub issue, or pull-request reply, wants a proposal publication checked against prior approved patterns, or asks to publish that final text. Resolves layered templates, separates private context from outward content, grounds claims, composes personal voice and research skills through their public contracts, and requires an exact-target approval receipt before any outward action. Ordinary use is read-only and never tunes templates.
summary: Draft or review collaboration publications from approved templates and authorized evidence. Preserves facts, composes existing skills, and gates every outward action.
---

<background_information>
Codex and Claude Code apply this editorial workflow inline. The bundled script
resolves and validates templates; prose judgment stays in the current session.
GitHub proposal issues and compact collaboration replies are supported publication
types.
</background_information>

# /ad-publish

Draft or review one collaboration publication. Normal use returns text and never
mutates templates or publishes anything.

<prime-directive>
Preserve every intended outward claim, name, number, date, citation, URL,
identifier, commitment, uncertainty, exclusion, and requested action. Context and
evidence constrain the publication but do not enter it automatically; private
owner-agent deliberation stays private. Put the direct answer or decision-relevant
information first. Never mutate a template during drafting, invent a historical
pattern, or perform an outward action without approval of the final text and exact
target.
</prime-directive>

## Step 1: Frame the publication

Accept a brief or an existing draft. Resolve artifact type, destination and exact
posting surface, audience, purpose, language, requested action, and hard
constraints from context. Ask only for an ungroundable value that would materially
change the result.

Supported types are `github-proposal-issue` and `collaboration-reply`. The latter
covers Slack and Discord threads plus GitHub issue and pull-request comments. For
another type, identify a generic baseline explicitly and use it only when it will
not materially distort the result; otherwise stop and name the missing template.

Build a silent source-role ledger before editing. Classify supplied material as:

- `target-thread context`: what recipients already saw or established;
- `intended outward content`: what the owner wants this publication to say;
- `supporting evidence`: facts available to verify or constrain claims;
- `private deliberation`: owner-agent reasoning, alternatives, reactions, and
  instructions not addressed to recipients;
- `constraints`: audience, tone, privacy, safety, format, and action boundaries.

Build the invariant ledger only from intended outward content. Target-thread
context and evidence do not become publication content merely because they appear
in the brief. Never publish private deliberation unless the owner explicitly
promotes a specific item. When a role is ambiguous, exclude it from the draft and
ask only if that omission prevents an honest answer.

Read [references/channel-capabilities.md](references/channel-capabilities.md) for
the exact destination and posting surface. Read
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
- `ad-voice` for the mandatory personal-voice and naturalization pass after facts,
  constraints, and structure are settled;
- `ad-pr` when the requested outward artifact is a pull request;
- `ad-template-tune` only when the user explicitly asks to curate a template.

Respect every callee authorization, limitation, output, and verification gate.
Return control here for end-to-end publication verification. Never mutate or copy
a callee's state, reimplement its specialist behavior, or infer one approval from
another.

Before drafting a material factual claim not established by the visible thread,
inspect the smallest authorized source that can settle it. Prefer read-only local
or remote configuration, CLI output, tests, logs, data, or cited primary sources
already available in the environment. Do not broaden source access silently. If a
claim cannot be verified, omit it, preserve its uncertainty, or state the narrow
gap instead of guessing. Evidence supports the answer; it is not pasted into the
publication unless the recipient needs it.

## Step 4: Draft or review

Apply the template's required information, ordering rules, instructions, and
load-bearing strengths. Use the smallest useful set of authorized examples. Omit
a section when it adds no information.

For an existing draft, preserve correct material and revise only meaningful gaps.
For a brief, create the smallest self-contained proposal that lets the reader
understand the state, consequence, evidence, completion test, and next decision.
For a GitHub proposal issue, produce both a concise actionable title and the final
body; treat both as factual and approval invariants.

For a collaboration reply, answer the unresolved question or requested action in
the first sentence. Add only the net-new context the recipients need to continue.
An ordinary peer-to-peer opener is allowed only when that same first sentence
also carries the concrete answer or delta. Replace abstract editorial framing
such as announcing a caveat, context, or topic with the useful detail itself.
Do not recap, paraphrase, endorse, or explain settled thread content unless the
reply must correct it, contrast with it, or the owner explicitly requests a recap.
Translate supporting evidence into the shortest decision-useful conclusion. Omit
technical mechanism or textbook-style explanation when it does not change what
the recipient should understand, decide, or do next.
Default to the shortest complete answer; this is a reply, not an article.

Use a table, collapsed section, diagram, image, embed, or attachment only when it
materially improves comprehension and the exact destination and posting surface
support it. When diagram source will not render, provide a real supported image
with accessible alternative text or stay with prose; never return decorative or
unpublishable markup.

Every final title and body, and every final collaboration reply, must then pass
through `ad-voice`, even when no confirmed profile or external `humanizer` is
available. Its public contract owns both the confirmed profile and the bundled
naturalization fallback.

## Step 5: Verify privately

Read [references/evaluation.md](references/evaluation.md). Check the source-role
and invariant ledgers, then assign every applicable template rule and exemplar strength one
internal verdict: `satisfied`, `improved`, `not applicable`, or `higher-priority
override`. Revise an unmet material item. Disclose any unresolved material gap
outside the usable draft, never inside it as workflow narration.

After any textual revision in this step, repeat `ad-voice`, then repeat the
invariant and template checks before return. Any later change to the title, body,
or reply invalidates that voice pass and loops through the same sequence again.

Do not report "same or better" as a score. Use that phrase only when traceable
coverage preserves every applicable strength and identifies a target-specific
improvement.

Do not return publication text that changed after the most recent `ad-voice`
output.

## Step 6: Return or act

The normal result is one usable publication. A proposal contains the final title
and body; a collaboration reply contains only the ready-to-send reply.
Hide source selection, composition trace, and the internal ledger unless requested
or needed for a material limitation.

For any outward action, first read the repository's binding docs for its approved
executable frontend or connected capability. Use that same capability for a
read-only identity and destination-target check. Never log in, log out, or switch
accounts inside this workflow; stop when identity or target cannot be verified.

Before publishing, show an approval receipt containing the final publication text
(title and body for a proposal; reply text for a collaboration reply), verified
account identity, exact destination including service and thread or repository
target, selected template ID and layer, material limitations, and exact action.
Wait for explicit approval of that receipt. Any text, account, or destination
change invalidates approval. After approval, use only the verified capability for
that target and do not expand scope. Report the returned URL or the exact failure
without retrying blindly.
