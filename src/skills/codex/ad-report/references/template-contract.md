# Publication and report template contract

## Resolution

Templates resolve from three layers by stable identifier:

1. bundled baselines under a consuming skill's `references/templates/`;
2. the machine store at `$AGENTIC_TEMPLATES_DIR`, otherwise
   `~/.agentic/templates/`;
3. the project store at `.agentic/templates/` in the Git root.

A project file shadows the same identifier in the machine store. A machine file
shadows the bundled baseline. Different identifiers remain selection candidates.
The resolver reports all layers, selected files, shadowed files, digests, and any
content conflict. It does not merge template bodies.

Each file lives at:

```text
<layer>/<publication|report>/<template-id>.md
```

The identifier and artifact class determine the path. Both use lowercase
kebab-case. Any additional directory level or filename mismatch is invalid.

## Canonical Markdown

A template contains only its canonical title, one fenced JSON metadata block, and
a non-empty bullet list of derived instructions:

````markdown
# Artifact template: github-proposal-issue

## Template data

```json
{
  "schemaVersion": 1,
  "id": "github-proposal-issue",
  "artifactClass": "publication",
  "artifactType": "github-proposal-issue",
  "destinations": ["github-issue"],
  "audiences": ["engineering-team"],
  "purpose": "Propose a bounded change for a team decision.",
  "useWhen": ["The issue asks the team to accept or schedule a change."],
  "avoidWhen": [],
  "requiredInformation": ["Concrete state", "Observable completion"],
  "optionalInformation": ["Alternatives"],
  "orderingRules": ["Put the concrete state before supporting depth."],
  "provenance": {
    "derivedOnly": true,
    "rawSourcesRetained": false,
    "authorGroups": [
      {
        "authorClass": "owner",
        "sources": [
          {
            "locator": "https://github.com/example/project/issues/1",
            "summary": "Approved owner-authored proposal issue.",
            "approved": true
          }
        ]
      }
    ]
  },
  "strengths": [
    {
      "id": "front-load-state",
      "description": "Makes the current state legible before implementation detail.",
      "sourceLocators": ["https://github.com/example/project/issues/1"]
    }
  ],
  "tradeOffs": ["Requires evidence before recommending implementation."],
  "approval": {
    "status": "approved",
    "approvedBy": "owner"
  },
  "version": 1,
  "limitations": [],
  "retainedExcerpts": []
}
```

## Instructions

- State the concrete issue before explaining the trade-off.
````

The JSON candidate given to `prepare` and `write` includes `instructions` as a
top-level string array. Rendering moves that array into the Markdown bullet list;
parsing restores it. Unknown fields are rejected at every structured level so raw
material cannot hide beside the contract.

## Field rules

- `schemaVersion`: exactly `1`.
- `id`: stable, path-safe, lowercase kebab-case identifier, unique within a layer.
- `artifactClass`: `publication` or `report`.
- `artifactType`: lowercase kebab-case type matched by the drafting workflow.
- `destinations`, `audiences`: non-empty matching dimensions.
- `purpose`: one concrete reason to use the template.
- `useWhen`: non-empty selection conditions. `avoidWhen` may be empty.
- `requiredInformation`: non-empty information contract.
  `optionalInformation` may be empty.
- `orderingRules`: non-empty traversal and front-loading rules.
- `provenance`: derived-only, raw-sources-not-retained evidence grouped by author
  class. Supported classes are `owner`, `community`, `external`, and `official`.
- `sources`: approved locators plus non-identifying summaries. One locator cannot
  appear under multiple author classes.
- `strengths`: non-empty, uniquely identified load-bearing qualities, each citing
  one or more locators already present in provenance.
- `tradeOffs`, `limitations`: string arrays that may be empty.
- `approval`: `status: approved` and `approvedBy: owner` in every active template.
- `version`: positive integer; increase it when changing an existing identifier.
- `retainedExcerpts`: empty by default. An entry is at most 280 Unicode
  characters, cites a known source, uses `authorClass: owner`, and records
  `retentionApproved: true`. Community, external, and official exact excerpts do
  not enter a template.
- `instructions`: non-empty single-line derived behaviors. They are not quotations.

## Exact-candidate approval

`prepare --input <candidate.json>` validates the complete candidate and returns a
SHA-256 digest of its exact bytes. After the user approves that exact candidate,
target layer, and visibility, create a temporary approval file:

```json
{
  "schemaVersion": 1,
  "templateId": "github-proposal-issue",
  "candidateSha256": "<digest returned by prepare>",
  "targetLayer": "project",
  "visibility": "machine-local",
  "approved": true,
  "approvedBy": "owner"
}
```

`targetLayer` is `machine` or `project`. `visibility` is `machine-local` for the
machine layer and the approved `machine-local` or `committed` choice for a project
layer. `write` refuses a missing, invalid, rejected, digest-mismatched, or
target-mismatched approval. A candidate, layer, or visibility change after
approval requires a new human decision.

## Visibility and writes

Machine templates are private mode-`0600` files. A project write chooses
`machine-local` or `committed`; the default is machine-local. Machine-local mode
adds only the exact template filename to `.git/info/exclude`. Committed mode
removes that exact exclusion if present and writes mode `0644`.

The script validates before changing state, updates project exclusion before a
machine-local template becomes visible, writes a temporary sibling file, and
atomically renames it. A validation, approval, or temporary-write failure leaves
the prior template intact.
