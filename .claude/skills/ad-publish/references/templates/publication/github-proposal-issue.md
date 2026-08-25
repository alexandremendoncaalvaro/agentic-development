# Artifact template: github-proposal-issue

## Template data

```json
{
  "schemaVersion": 1,
  "id": "github-proposal-issue",
  "artifactClass": "publication",
  "artifactType": "github-proposal-issue",
  "destinations": [
    "github-issue"
  ],
  "audiences": [
    "engineering-team",
    "project-maintainers"
  ],
  "purpose": "Propose or track a bounded project change so a reader can decide or act.",
  "useWhen": [
    "A GitHub issue proposes a change, records a blocked proposal, or defines work needing a shared decision."
  ],
  "avoidWhen": [
    "The issue is a routine defect report or support request with no proposal decision."
  ],
  "requiredInformation": [
    "Concrete conclusion or current state",
    "Consequence for the reader or project",
    "Evidence and hard constraints",
    "Observable completion",
    "Recommended next path",
    "Risks or trade-offs when material",
    "Explicit exclusions when material"
  ],
  "optionalInformation": [
    "Alternatives considered",
    "Dependency or unblock event",
    "Implementation sketch"
  ],
  "orderingRules": [
    "Put the concrete conclusion or current state before supporting depth.",
    "Place the consequence and evidence before implementation detail.",
    "End the decision path with observable completion and the recommended next action."
  ],
  "provenance": {
    "derivedOnly": true,
    "rawSourcesRetained": false,
    "authorGroups": [
      {
        "authorClass": "owner",
        "sources": [
          {
            "locator": "https://github.com/nikopueringer/CorridorKey/issues/244",
            "summary": "Owner-authored blocked proposal with an explicit unblock event and eventual completion test.",
            "approved": true
          },
          {
            "locator": "https://github.com/nikopueringer/CorridorKey/issues/245",
            "summary": "Owner-authored proposal that bounds implementation, consequences, and observable completion.",
            "approved": true
          },
          {
            "locator": "https://github.com/nikopueringer/CorridorKey/issues/246",
            "summary": "Owner-authored proposal that front-loads state, evidence, constraints, and a recommended path.",
            "approved": true
          }
        ]
      }
    ]
  },
  "strengths": [
    {
      "id": "front-load-concrete-state",
      "description": "Lets a reader understand the proposal or blocker before implementation detail.",
      "sourceLocators": [
        "https://github.com/nikopueringer/CorridorKey/issues/244",
        "https://github.com/nikopueringer/CorridorKey/issues/245",
        "https://github.com/nikopueringer/CorridorKey/issues/246"
      ]
    },
    {
      "id": "make-completion-observable",
      "description": "Defines a result that a future implementer or reviewer can verify.",
      "sourceLocators": [
        "https://github.com/nikopueringer/CorridorKey/issues/244",
        "https://github.com/nikopueringer/CorridorKey/issues/245",
        "https://github.com/nikopueringer/CorridorKey/issues/246"
      ]
    },
    {
      "id": "bound-next-path",
      "description": "Names the next action, dependency, risk, or exclusion without pretending uncertainty is resolved.",
      "sourceLocators": [
        "https://github.com/nikopueringer/CorridorKey/issues/244",
        "https://github.com/nikopueringer/CorridorKey/issues/245",
        "https://github.com/nikopueringer/CorridorKey/issues/246"
      ]
    }
  ],
  "tradeOffs": [
    "The shape asks for evidence and completion criteria before implementation detail.",
    "Optional sections must be omitted when they add no decision-relevant information."
  ],
  "approval": {
    "status": "approved",
    "approvedBy": "owner"
  },
  "version": 1,
  "limitations": [
    "The source issues have no independent outcome signal proving which readers found most useful.",
    "No private team corpus was authorized for this baseline."
  ],
  "retainedExcerpts": []
}
```

## Instructions

- State the concrete conclusion, proposal, or blocker before supporting detail.
- Explain why the state matters now and preserve the evidence and hard constraints.
- Define observable completion even when implementation is currently blocked.
- Recommend the next action or name the exact event that unlocks it.
- State material risks, trade-offs, and exclusions; omit headings that add no information.

