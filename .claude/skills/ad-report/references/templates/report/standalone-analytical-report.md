# Artifact template: standalone-analytical-report

## Template data

```json
{
  "schemaVersion": 1,
  "id": "standalone-analytical-report",
  "artifactClass": "report",
  "artifactType": "standalone-analytical-report",
  "destinations": [
    "standalone-report",
    "docx",
    "pdf",
    "presentation",
    "visualization",
    "site",
    "html",
    "markdown"
  ],
  "audiences": [
    "decision-makers",
    "project-team",
    "technical-readers"
  ],
  "purpose": "Turn evidence and analysis into a self-contained decision or action artifact.",
  "useWhen": [
    "A standalone report must explain a question, evidence, findings, conclusions, and next action to a named audience."
  ],
  "avoidWhen": [
    "The requested artifact is only a raw data export, meeting transcript, or unanalysed evidence collection."
  ],
  "requiredInformation": [
    "Self-contained executive conclusion",
    "Question or objective",
    "Method and evidence provenance",
    "Material findings",
    "Conclusions",
    "Recommendations or next actions",
    "Limitations"
  ],
  "optionalInformation": [
    "Appendices",
    "Detailed methods",
    "Supporting tables",
    "Diagrams or visualizations",
    "Alternative interpretations"
  ],
  "orderingRules": [
    "Lead with a self-contained executive conclusion for the target audience.",
    "Establish the question, method, and evidence provenance before detailed findings.",
    "Separate material findings, conclusions, recommendations, and limitations.",
    "Move optional depth and supporting material after the decision path."
  ],
  "provenance": {
    "derivedOnly": true,
    "rawSourcesRetained": false,
    "authorGroups": [
      {
        "authorClass": "official",
        "sources": [
          {
            "locator": "https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf",
            "summary": "Official guidance for audience-led research reports, key messages, findings, conclusions, recommendations, accessible formats, and proportionate supporting material.",
            "approved": true
          }
        ]
      }
    ]
  },
  "strengths": [
    {
      "id": "lead-with-key-message",
      "description": "Gives the intended audience the conclusion and its significance before supporting depth.",
      "sourceLocators": [
        "https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf"
      ]
    },
    {
      "id": "separate-evidence-and-judgment",
      "description": "Keeps method, findings, conclusions, and recommendations traceable instead of collapsing them into one narrative.",
      "sourceLocators": [
        "https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf"
      ]
    },
    {
      "id": "choose-accessible-form",
      "description": "Uses tables, graphs, diagrams, appendices, and output formats only when they improve comprehension and accessibility.",
      "sourceLocators": [
        "https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf"
      ]
    }
  ],
  "tradeOffs": [
    "A self-contained executive conclusion repeats selected evidence from the body when needed for independent use.",
    "Visual and format choices add verification work and should be used only when they clarify the material."
  ],
  "approval": {
    "status": "approved",
    "approvedBy": "owner"
  },
  "version": 1,
  "limitations": [
    "No private owner or team report corpus has been authorized for this baseline.",
    "Official method guidance does not establish the owner's personal report conventions."
  ],
  "retainedExcerpts": []
}
```

## Instructions

- Open with a self-contained executive conclusion tailored to the intended audience.
- State the question or objective, method, and evidence provenance before detailed findings.
- Keep material findings, conclusions, recommendations, and limitations distinguishable and traceable.
- Put optional depth in appendices or later sections so it does not interrupt the decision path.
- Use tables, diagrams, and visualizations only when they clarify comparison, sequence, magnitude, or relationships, and provide an accessible equivalent.

