# Artifact template: collaboration-reply

## Template data

```json
{
  "schemaVersion": 1,
  "id": "collaboration-reply",
  "artifactClass": "publication",
  "artifactType": "collaboration-reply",
  "destinations": [
    "slack-thread",
    "discord-thread",
    "github-issue-comment",
    "github-pr-comment"
  ],
  "audiences": [
    "active-thread-participants",
    "engineering-team",
    "business-team"
  ],
  "purpose": "Answer the pending question or action with the smallest grounded delta needed to continue the conversation.",
  "useWhen": [
    "The owner is replying to an active Slack, Discord, GitHub issue, or pull-request conversation."
  ],
  "avoidWhen": [
    "The artifact starts a new proposal or must stand alone for readers without the thread context.",
    "The requested output is a long-form analytical report."
  ],
  "requiredInformation": [
    "Direct answer or requested action",
    "Net-new context needed to continue",
    "Evidence or uncertainty for each material new claim"
  ],
  "optionalInformation": [
    "One necessary correction or contrast",
    "One supporting link or test result",
    "A concise next step"
  ],
  "orderingRules": [
    "Put the answer to the unresolved question or requested action first.",
    "Allow a brief peer opener only when the same sentence carries the concrete answer or delta.",
    "Follow with only the net-new evidence or context needed to continue.",
    "State the practical conclusion instead of mechanism-level explanation that does not change the recipient's next decision or action.",
    "Omit settled thread context and private owner-agent deliberation."
  ],
  "provenance": {
    "derivedOnly": true,
    "rawSourcesRetained": false,
    "authorGroups": [
      {
        "authorClass": "official",
        "sources": [
          {
            "locator": "https://service-manual.ons.gov.uk/content/writing-for-users/structuring-content",
            "summary": "Front-load the most important information, write to the active user need, and remove repetition.",
            "approved": true
          },
          {
            "locator": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables",
            "summary": "Separate instructions, context, examples, and inputs to reduce role confusion in complex prompts.",
            "approved": true
          }
        ]
      },
      {
        "authorClass": "external",
        "sources": [
          {
            "locator": "https://github.com/openai/openai-cookbook/blob/main/articles/techniques_to_improve_reliability.md",
            "summary": "Select relevant facts before inference and constrain the final answer to the question.",
            "approved": true
          },
          {
            "locator": "https://github.com/openai/openai-cookbook/blob/main/examples/chatgpt/sharepoint_azure_function/Using_Azure_Functions_and_Microsoft_Graph_to_Query_SharePoint.md",
            "summary": "Answer concisely from retrieved evidence and state when the evidence cannot answer the question.",
            "approved": true
          }
        ]
      }
    ]
  },
  "strengths": [
    {
      "id": "answer-pending-delta-first",
      "description": "Lets active participants see the answer or action without rereading context they already share.",
      "sourceLocators": [
        "https://service-manual.ons.gov.uk/content/writing-for-users/structuring-content"
      ]
    },
    {
      "id": "separate-context-from-content",
      "description": "Prevents background and private deliberation from being mistaken for publication content.",
      "sourceLocators": [
        "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables"
      ]
    },
    {
      "id": "ground-material-claims",
      "description": "Uses available evidence for material claims and preserves uncertainty when evidence is insufficient.",
      "sourceLocators": [
        "https://github.com/openai/openai-cookbook/blob/main/articles/techniques_to_improve_reliability.md",
        "https://github.com/openai/openai-cookbook/blob/main/examples/chatgpt/sharepoint_azure_function/Using_Azure_Functions_and_Microsoft_Graph_to_Query_SharePoint.md"
      ]
    },
    {
      "id": "translate-evidence-to-practical-conclusion",
      "description": "Keeps supporting technical detail private when the recipient only needs its practical consequence.",
      "sourceLocators": [
        "https://github.com/openai/openai-cookbook/blob/main/articles/techniques_to_improve_reliability.md",
        "https://service-manual.ons.gov.uk/content/writing-for-users/structuring-content"
      ]
    }
  ],
  "tradeOffs": [
    "The reply may not be self-contained outside its original thread.",
    "A missing evidence source can make the answer shorter or explicitly uncertain."
  ],
  "approval": {
    "status": "approved",
    "approvedBy": "owner"
  },
  "version": 1,
  "limitations": [
    "Channel capabilities change and must be checked for the exact human or API posting surface.",
    "No private team reply corpus was retained in this bundled baseline."
  ],
  "retainedExcerpts": []
}
```

## Instructions

- Answer the pending question or requested action in the first sentence.
- Add only the grounded, net-new information needed for the thread to continue.
- Do not repeat what participants already established or expose owner-agent deliberation unless the owner explicitly requests it.
- Omit, qualify, or name the gap for any material claim that cannot be verified.
- Use the shortest destination-supported format that communicates the answer.
