---
name: ad-template-tune
description: Curate durable publication and report templates behind explicit source-read and write approvals. Use only when the user invokes /ad-template-tune, asks to create or improve a publication/report template, or explicitly asks to learn reusable structure from authorized examples. Separates owner, community, external, and official provenance; stores derived rules rather than raw sources; proposes one delta at a time; and writes only the exact approved candidate. Distinct from ad-publish and ad-report, which apply templates read-only.
summary: Curate publication and report templates from authorized evidence. Keeps author classes separate and writes one explicitly approved, validated delta at a time.
allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch
---

# /ad-template-tune

Create or refine one durable publication or report template. This is the only
runtime writer to the shared template stores. `ad-publish` and `ad-report` remain
read-only consumers.

<prime-directive>
HARD human gates: never read a private source before the user approves its exact
scope, never retain an exact excerpt without separate approval, and never write a
template before the user approves the exact candidate digest. Handle one template
delta per invocation. Ordinary drafting never trains or tunes the store.
</prime-directive>

## Step 1: Establish the curation boundary

Confirm the artifact class and type, target layer, and source scope. Before any
private file, repository, message system, document store, or connector read, state
and obtain approval for:

- exact service, repository, path, channel, or document set;
- author filter and author class;
- relevant date range;
- intended template type and destination;
- retention mode, which defaults to derived-only;
- target layer: portable machine store or project store.

Public URLs supplied by the user are limited to those URLs. Do not expand into
adjacent sources because credentials or connectors exist. Work from pasted text or
authorized local files when a connector is unavailable. Read
[references/curation.md](references/curation.md) before handling evidence.

## Step 2: Resolve the current templates

Run the resolver with the relevant consumer's bundled template directory:

```bash
node <skill-base-dir>/scripts/template-store.mjs resolve \
  --bundled <consumer-skill-base-dir>/references/templates
```

`AGENTIC_TEMPLATES_DIR` overrides the machine store; otherwise it is
`~/.agentic/templates/`. The project layer is `.agentic/templates/` at the Git
root. A project template shadows a machine template with the same identifier, and
a machine template shadows the bundled baseline. Inspect any reported conflict;
never merge conflicting instructions silently.

If the selected template is invalid, stop. Do not repair or replace it without a
separately approved delta.

## Step 3: Derive one candidate delta

Keep owner, community, external, and official evidence in separate provenance
groups. Extract reusable information requirements, ordering rules, selection
conditions, strengths, trade-offs, and limitations. Do not rank examples by
length, recency, reactions, or popularity. Do not copy a teammate's distinctive
phrasing or treat team conventions as owner identity.

Start from the complete current template or the smallest valid template in
[references/template-contract.md](references/template-contract.md). Change one
coherent behavior. Increase `version` for an existing identifier. Raw source
content stays in an OS temporary directory and is deleted after the decision.
The candidate retains source locators and non-identifying summaries, not source
bodies. Exact owner excerpts require separate retention approval.

Present one reviewable proposal containing:

- exact old-to-new behavior and affected artifact type;
- source groups, derived strengths, and confidence limitations;
- why the rule generalizes beyond one example;
- target layer and, for a project template, visibility;
- the complete candidate JSON.

Rejection or deferral leaves every store unchanged and ends the operation.

## Step 4: Bind approval to the exact candidate

Write the complete candidate JSON to an OS temporary file outside every Git
repository. Validate it and obtain its digest:

```bash
node <skill-base-dir>/scripts/template-store.mjs prepare --input <candidate.json>
```

Show the candidate and returned `candidateSha256`. Ask for explicit approval of
that exact delta, target layer, and project visibility. Only after approval, write
a separate temporary approval JSON matching the contract reference. A content
change after approval invalidates the digest and requires another review.

## Step 5: Write atomically and verify

For the portable machine layer:

```bash
node <skill-base-dir>/scripts/template-store.mjs write \
  --layer machine --input <candidate.json> --approval <approval.json>
```

For the project layer, ask `machine-local` or `committed` on first creation and
recommend `machine-local` when provenance may reveal internal context. Omission
defaults to `machine-local`:

```bash
node <skill-base-dir>/scripts/template-store.mjs write \
  --layer project --visibility <machine-local|committed> \
  --input <candidate.json> --approval <approval.json>
```

Machine-local project writes add only the exact template filename to
`.git/info/exclude`. The script validates before writing, binds approval to the
candidate bytes, target layer, and visibility, and atomically replaces one
template. Never hand-edit around a failure.

Run `validate` on the returned path, then rerun `resolve` and confirm the expected
layer and shadowing. Delete temporary source, candidate, and approval files even
after rejection or a failed write when cleanup is possible. Stop after this one
accepted or rejected delta.
