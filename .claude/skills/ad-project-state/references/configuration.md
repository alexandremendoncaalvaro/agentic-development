# Project evidence source configuration

The resolver accepts one project layer and one machine layer. Both are optional,
JSON-only, versioned, and closed: unknown fields invalidate the selected
configuration. They never contain credentials or commands.

## Project layer

Place `.agentic/project-sources.json` at the repository root when the source
policy belongs to the project. Its presence shadows the machine layer.

```json
{
  "schemaVersion": 1,
  "sources": [
    {
      "id": "repository",
      "type": "repository",
      "role": "supporting"
    },
    {
      "id": "github-work",
      "type": "github",
      "role": "primary",
      "host": "github.example",
      "repository": "acme/widget",
      "issues": {
        "state": "open",
        "search": "assignee:@me sort:updated-desc",
        "limit": 50
      },
      "pullRequests": {
        "state": "open",
        "search": "involves:@me sort:updated-desc",
        "limit": 50
      }
    }
  ]
}
```

## Machine layer

The default path is `~/.agentic/project-sources.json`. Set
`AGENTIC_PROJECT_SOURCES_FILE` to select another file. Each entry matches the
exact value returned by `git remote get-url --all origin`; list another entry
when clone URL spellings differ. A remote may appear in only one project entry.

```json
{
  "schemaVersion": 1,
  "projects": [
    {
      "match": {
        "remote": "git@github.example:acme/widget.git"
      },
      "sources": [
        {
          "id": "repository",
          "type": "repository",
          "role": "supporting"
        },
        {
          "id": "github-work",
          "type": "github",
          "role": "primary",
          "host": "github.example",
          "repository": "acme/widget",
          "issues": {
            "state": "open",
            "limit": 50
          },
          "pullRequests": {
            "state": "open",
            "limit": 50
          }
        }
      ]
    }
  ]
}
```

## Delivery process (schema version 2)

`schemaVersion: 2` permits an optional `process` block beside `sources` in the
project layer, or in a machine `projects` entry (ADR-0097). It describes the
team's delivery process so the kit writes records and recommends steps inside
it. This generic example is an issue-staged lifecycle with neutral labels; a
real team's block belongs in that team's repository or the machine layer.

```json
{
  "schemaVersion": 2,
  "process": {
    "lifecycleOwner": "external",
    "ownerLabel": "Issue-staged lifecycle",
    "records": {
      "research": {
        "destination": "issue-comment",
        "handoff": "Post the evidence record on the work item."
      },
      "adr": { "destination": "repo-path", "path": "docs/decisions", "naming": "date" },
      "task": { "destination": "external", "handoff": "Open a work item in the tracker." }
    },
    "stages": [
      { "label": "stage:design", "stage": "design", "next": "Write the design on the issue." },
      { "label": "stage:build", "stage": "build", "next": "Implement the approved plan." }
    ],
    "readMilestone": true
  },
  "sources": [{ "id": "repository", "type": "repository", "role": "primary" }]
}
```

- `lifecycleOwner` is `kit` (the kit's own task, spec and PRD files) or
  `external` (another process owns work items; the kit hands off).
- `ownerLabel` names the process for the reader, up to 64 characters.
- `records` maps `research`, `adr`, `task`, `spec` and `prd` to a `destination`
  (`repo-path`, `issue-comment` or `external`), an optional relative `path`, an
  optional `naming` (`sequence` or `date`) and an optional `handoff` text.
- `stages` maps an issue label to a stage name and an optional `next` text;
  each issue in the packet carries the first stage, in this order, whose label
  it has, or `null`.
- `readMilestone` adds each issue's milestone to the packet.
- `handoff` and `next` are single-line text the kit shows; it never runs them.

`node <skill-dir>/scripts/project-state.mjs --process` prints only the resolved
configuration and process, without contacting any provider.

## Field contract

- `schemaVersion` is `1` or `2`; only `2` permits `process`.
- `sources` must contain unique lowercase-hyphen identifiers and exactly one
  source with `role: "primary"`; other sources use `"supporting"`.
- A `repository` source must use `id: "repository"` and has no other fields.
- A `github` source requires `host`, `repository` as `OWNER/REPO`, and at least
  one of `issues` or `pullRequests`.
- Issue state is `open`, `closed`, or `all`. Pull-request state also permits
  `merged`.
- Each query has an integer `limit` from 1 to 100 and may have one single-line
  `search` string up to 512 characters.
- `AGENTIC_GH` may identify an executable wrapper. It is an environment seam,
  never a configuration field. The resolver uses the existing GitHub CLI login
  and does not switch or create accounts.

Invalid or unreadable configuration produces an explicit failure and falls back
to the repository baseline. An unmatched machine entry behaves like no
configuration. A GitHub failure leaves local evidence available and reports the
provider status as partial or unavailable.
