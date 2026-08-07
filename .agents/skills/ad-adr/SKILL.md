---
name: ad-adr
description: Draft a new ADR (Architecture Decision Record) at doc/adr/NNNN-<short-title>.md, using Michael Nygard's Context/Decision/Consequences/Alternatives pattern. Use when the user wants to record, write, draft, propose, or document an architecture decision. Status starts at proposed.
summary: Draft a new ADR at `doc/adr/NNNN-<slug>.md`.
---

<background_information>
Drafts `doc/adr/NNNN-<short-title>.md` for one architecture decision. Status lifecycle: proposed → accepted → deprecated | superseded by ADR-NNNN.
</background_information>

<instructions>
Step 1 — determine NNNN. List `doc/adr/`. NNNN = next available 4-digit number after the highest existing. If `doc/adr/` does not exist, create it; start at 0001.

Step 2 — confirm scope. The ADR captures one decision. If the user's request implies multiple, ask which to write first; the others become follow-up ADRs.

Step 3 — fill from conversation only. Use the template below. Fill Context, Decision, Consequences, and Alternatives Considered from this conversation only — no fabrication. If a section has no signal, ask one question per gap.

`Decision` must be a directive ("We will…"), not a description.
`Consequences` lists positive and negative; do not balance for the sake of balance.
`Alternatives Considered` lists each rejected option with a one-line reason.

Step 4 — write the file. Path: `doc/adr/<NNNN>-<short-slug>.md`. Slug: kebab-case, ≤6 words. Status: proposed. Date: today, ISO format. Deciders: ask the user. When this decision changes part of an earlier one, declare it in the header: `Status:` covers whole-document supersession, and the partial case — one stanza, one rejected alternative, one decision's realization — is what `Amends:` and `Amended by:` are for. Write `Amends: ADR-NNNN` here, then offer to add the matching `Amended by:` line to that ADR's header. The pair is the point: either field alone leaves a relation only prose can find, so a reader has to open every record in the directory to learn what still binds. Omit both lines entirely when there is no amendment — an empty field is worse than an absent one.

Stop after writing. Do NOT flip status to accepted — that requires user review.
</instructions>

The ADR skeleton lives in [references/adr-template.md](references/adr-template.md) — one decision per ADR; Status starts at proposed.

<output_contract>
A single new file at `doc/adr/<NNNN>-<short-slug>.md`. Status proposed. No invented content. Existing ADRs are otherwise left alone, with one bounded exception: when this ADR declares `Amends: ADR-NNNN`, offer to add the matching `Amended by:` line to that ADR's header, and write it only on explicit confirmation. Header line only — the body stays the immutable record, so this records a new relation rather than retconning an old decision. Declining is a valid answer; `/ad-drift` reports the unpaired relation.

ADRs are decision-record artifacts and are exempt from the no-dates rule (Documentation Discipline §2): `**Status:**` and `**Date:**` are required for Nygard supersession ordering. Remaining Documentation Discipline rules (`WORKFLOW.md` §2) apply at write time:
- No emoji anywhere in the file.
- `Context` is the business-context-first section — *forces* and *problem* before the *decision*.
- One scope: one decision per ADR.
- No speculation. `Decision` is a directive; rejected paths go in `Alternatives Considered`.
</output_contract>

## Next

- Continue the work the ADR was scoped to support. Status starts `proposed`; the user flips to `accepted` after review (the agent does not).
- If the ADR touches `ARCHITECTURE.md`'s Active ADRs list, add the entry there.
- `/ad-task` for the work units that implement the decision.
- `/ad-drift` periodically to confirm the decision still holds against the code.
