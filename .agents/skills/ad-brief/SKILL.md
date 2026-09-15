---
name: ad-brief
description: Create a read-only decision-maker brief from live project and session state or a settled fact packet. Use when the user says "brief me", "give me a summary", "catch me up", "where are we?", asks what is happening now and why, or needs a plain-language boss report before continuing.
summary: Read-only decision-maker briefing from live project/session evidence or facts supplied by another skill. Restores context, meaning, direction, completion conditions, blockers, and genuine owner decisions in plain language.
---

<background_information>
Create one decision-ready briefing for a maintainer who has just arrived. Write
nothing and mutate no state.
</background_information>

<instructions>
Treat the briefing and its fact packet as private owner-agent context, not as
intended outward content. Never pass the brief or its packet to `ad-publish` or
`ad-voice`. If the owner later asks to publish a specific conclusion, the
publication starts from that explicitly promoted conclusion under `ad-publish`'s
own source-role, privacy, language, voice, and approval gates.

Build a standalone brief.

When no caller supplied a fact packet, ground the briefing in the current session
and the smallest sufficient live project evidence:

1. Invoke `/ad-project-state` and preserve its selected source roles,
   provenance, observation time, bounded work summaries, and failures. This
   supplies project-wide activity; it does not replace the repository checks
   below or authorize publication.
2. Run `git status --short`, read the current branch with
   `git branch --show-current`, and inspect the most recent commit with
   `git log -1 --oneline`. Read a focused diff only when it changes the meaning
   of the current result.
3. Find the active task from a changed task file, then an explicit
   `in-progress` status, then the task touched by the recent commit. Read its
   Context, current plan state, acceptance criteria, and completion gates.
4. Follow only load-bearing references from that active task to its spec, ADR or
   other governing decision, and PRD or product context. Stop when the project,
   final objective, current target, rationale, and done condition are clear.
5. Reconstruct recent results and explicit owner corrections from the current
   conversation. Treat them as claims until live evidence or a durable artifact
   confirms them. Live repository evidence outranks stale conversation state;
   disclose a material mismatch instead of silently choosing the more convenient
   story.
6. Build the same settled fact packet a specialist caller would provide. Mark an
   unavailable fact as unknown; never invent activity, completion, or a blocker.

Accept a specialist fact packet.

A composing skill may pass a settled fact packet containing its conclusion,
scope, objective, recent results, current target and rationale, next direction,
completion condition, blockers, confidence limits, and any genuine owner decision.
Preserve the packet's facts, provenance, uncertainty, and scope.

Do not reconcile or reinterpret the specialist caller's domain. Do not call back
into the caller. Present the decision-maker brief, then return control so the
caller can append its specialist output and run its own verification or gates.

For a roadmap caller, explain the delivery front from the supplied facts. Do not
compute progress, classify roadmap items, select project or task scope, or render
the checklist; those remain `ad-roadmap` responsibilities.

Shape the owner decision.

Default to autonomous continuation. When the evidence leaves one clearly superior
path, state the decision and rationale and write `No decision needed`; do not
manufacture alternatives or ask for permission. When genuine design, taste,
irreversibility, insufficient evidence, or a close value trade-off remains, ask
one question. Put the recommendation first and include only viable competing
options, explaining each through value, risk, and reversibility.

Read [references/decision-examples.md](references/decision-examples.md) and select
the matching semantic mode before rendering. Treat one question as one unresolved
owner decision, not as a punctuation quota. Keep its setup declarative so the same
decision is not asked in both the framing and `Your attention`. When options are
needed, put the recommendation first, label it `(Recommended)`, and include only
competitors that could reasonably win on the unresolved value trade-off.

Before returning, inspect the rendered meaning:

- An evidence-settled choice was decided and reported, not escalated.
- `Your attention` contains either `No decision needed` or one owner decision.
- A genuine owner decision has the recommendation first and only viable options.
- An autonomous or completed decision names what was decided, why, the supporting
  evidence and its material limit, and the concrete next action.

If any check fails, revise the brief before returning. Do not validate exact prose,
headings, or punctuation.

Render.

Read [references/output-template.md](references/output-template.md) and replace
every placeholder. Keep the default result to one screen; expand only when clarity
requires it. Use the conversation language, put plain meaning before technical
detail, define necessary jargon, and translate commands, diffs, file lists, and
test output into what they mean. Do not expose internal collection steps.
</instructions>

<output_contract>
- Read-only: no file or state mutation.
- The fact packet remains the source of truth for caller-owned reasoning.
- The result is one plain-language decision-maker brief, after which the caller
  regains control.
- Every template field is evidence-backed or honestly marked unknown.
- `Your attention` says `No decision needed` unless genuine owner judgment blocks
  or materially redirects the work.
</output_contract>

## Next

- Need the project or task checklist as well: `ad-roadmap` composes this brief
  and adds its own reconciled checklist.
- Need to persist enough state for another session: `ad-handoff` composes this
  brief inside its resume protocol.
- Need to correct execution against the rules: `ad-rules` correction mode
  reapplies `ad-philosophy`, fixes the plan, and composes this brief.
