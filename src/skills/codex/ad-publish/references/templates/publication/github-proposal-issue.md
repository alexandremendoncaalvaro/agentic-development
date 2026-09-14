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
    "End the decision path with observable completion and the recommended next action.",
    "For a straightforward reversible proposal, default to one or two short paragraphs; add headings or checklists only when they materially improve scanning.",
    "When supplied short prose is already decision-complete, do not expand it merely to expose template fields.",
    "Add explicit authorization framing only when an ambiguity could materially broaden the approved action."
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
          },
          {
            "locator": "owner-evaluation:held-out-publication-comparisons-2026-08-24-through-2026-09-14",
            "summary": "Three blinded owner comparisons preferred concise prose over extra sections or editorial framing for straightforward reversible proposals; no private rationale was retained.",
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
    },
    {
      "id": "right-size-simple-proposals",
      "description": "Keeps a straightforward reversible proposal decision-complete without ceremonial headings or checklist structure.",
      "sourceLocators": [
        "owner-evaluation:held-out-publication-comparisons-2026-08-24-through-2026-09-14"
      ]
    }
  ],
  "tradeOffs": [
    "The shape asks for evidence and completion criteria before implementation detail.",
    "Concise prose is the default for simple reversible decisions, but separate structure remains useful when it materially improves scanning or separates competing paths.",
    "Optional sections must be omitted when they add no decision-relevant information."
  ],
  "approval": {
    "status": "approved",
    "approvedBy": "owner"
  },
  "version": 3,
  "limitations": [
    "The source issues have no independent outcome signal proving which readers found most useful.",
    "The invisible-template threshold was validated on one unused proposal brief after three blinded comparisons exposed over-structuring; broader artifact types still require their own evidence.",
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
- For a straightforward reversible proposal, use a title and one or two short paragraphs that retain the decision, constraints, control, completion test, and next action.
- Add headings and checklists only when they materially improve scanning; never use them merely to display the template's internal fields.
- Treat the template as a silent coverage check: when supplied short prose is already decision-complete, do not expand or reframe it.
- Add authorization language only when an ambiguity could materially broaden the approved action; an existing explicit scope or exclusion is sufficient.
