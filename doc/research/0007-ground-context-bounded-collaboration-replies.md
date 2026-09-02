# GROUND-0007: Bound evidence-backed collaboration replies

**Status:** recorded
**Decision:** Classify input by source role, draft only the unresolved reply delta, verify claims from authorized evidence, and render only capabilities supported by the exact destination surface.
**Decision ref:** doc/tasks/0063-bound-collaboration-replies.md
**Confidence:** Strong

## Decision and confidence

Extend the existing `ad-publish` architecture with one approved
`collaboration-reply` baseline rather than creating a new skill. Before drafting,
both `ad-publish` and `ad-voice` distinguish target-thread context, intended
outward content, supporting evidence, private deliberation, and constraints. Only
intended content contributes publication invariants; evidence supports claims but
does not become prose automatically, and private deliberation stays out unless the
owner explicitly promotes it. Replies answer the unresolved question or requested
action first, add only the evidence-backed delta required to continue, and select
formatting from a conservative destination matrix that distinguishes human UI and
API surfaces. This is Strong because official prompting guidance, public reference
implementations, content-design guidance, platform documentation, repository
structure, and history converge on the same bounded workflow.

## Evidence

### E1 — Source roles must be separated before preservation or rewriting

**Strength:** High
**Provenance:** A1, B1, C1, D1

Anthropic documents explicit separation of instructions, context, examples, and
input to reduce misinterpretation. OpenAI's reference workflow selects relevant
facts before answering. The `origin/main` baseline at `4d1fd31` instead builds an
invariant ledger from a whole brief, which conflates background with intended output. The
smallest correction is a silent source-role ledger followed by an invariant ledger
containing only material selected for the outward reply.

### E2 — A thread reply should carry the unresolved delta, not replay the thread

**Strength:** High
**Provenance:** A2, B2, C2, D2

ONS guidance says to front-load the most important information, retain only
content serving the user's current need, and say information once. The OpenAI
SharePoint example answers the user's question concisely from retrieved evidence
and reports when that evidence is insufficient. The `origin/main` publication workflow
already asks for the smallest useful evidence set and one usable artifact, so a
delta-only reply is a narrower application of the existing principle rather than
a competing style system.

### E3 — Claims should be grounded before drafting, without dumping evidence

**Strength:** High
**Provenance:** B1, B2, C3, D2

The public references separate evidence selection from the final answer and stop
or qualify the result when evidence is insufficient. The repository already owns
bounded research through `ad-ground` and `ad-research`; the missing behavior is a
lighter evidence-acquisition step for claims answerable from authorized local or
remote configuration, CLI output, test results, logs, or supplied sources. Those
sources constrain the reply but are included only when the recipient needs them.

### E4 — Formatting must be selected for the exact destination surface

**Strength:** High
**Provenance:** A3, A4, A5, A6, A7, C4

Slack uses its own `mrkdwn` rules and exposes richer Block Kit and image blocks to
app surfaces. Discord documents a Markdown subset for chat and attachments or
embeds for API messages. GitHub issue and pull-request conversations support
GitHub Flavored Markdown, collapsed `<details>` sections, attached files, and
Mermaid diagrams. Therefore the workflow cannot treat “Markdown support” as one
portable capability: it must identify the exact service and surface, use only
documented features, and fall back to concise plain text plus a real image when a
diagram source would not render.

## Source register

- **A1:** Anthropic, “Prompting best practices,” https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables (accessed 2026-09-02 via web search and page extraction)
- **A2:** Office for National Statistics, “Structuring content,” https://service-manual.ons.gov.uk/content/writing-for-users/structuring-content (accessed 2026-09-02 via web search and page extraction)
- **A3:** Slack Developer Docs, “Formatting message text,” https://docs.slack.dev/messaging/formatting-message-text/ (accessed 2026-09-02 via web search and page extraction)
- **A4:** Slack Developer Docs, “Image block,” https://docs.slack.dev/reference/block-kit/blocks/image-block/ (accessed 2026-09-02 via web search and page extraction)
- **A5:** Discord Support, “Markdown Text 101,” https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline (accessed 2026-09-02 via web search and page extraction)
- **A6:** Discord Developer Docs, “Message Resource,” https://docs.discord.com/developers/resources/message (accessed 2026-09-02 via web search and page extraction)
- **A7:** GitHub Docs, “Writing on GitHub,” “Organizing information with collapsed sections,” “Creating diagrams,” and “Attaching files,” https://docs.github.com/en/get-started/writing-on-github (accessed 2026-09-02 via web search and page extraction)
- **B1:** OpenAI Cookbook, `articles/techniques_to_improve_reliability.md`, section “Split complex tasks into simpler tasks,” https://github.com/openai/openai-cookbook/blob/main/articles/techniques_to_improve_reliability.md (accessed 2026-09-02 via GitHub web extraction)
- **B2:** OpenAI Cookbook, `examples/chatgpt/sharepoint_azure_function/Using_Azure_Functions_and_Microsoft_Graph_to_Query_SharePoint.md`, “Sample GPT Instructions,” https://github.com/openai/openai-cookbook/blob/main/examples/chatgpt/sharepoint_azure_function/Using_Azure_Functions_and_Microsoft_Graph_to_Query_SharePoint.md (accessed 2026-09-02 via GitHub web extraction)
- **C1:** `origin/main@4d1fd31`: `src/skills/codex/ad-publish/SKILL.md:27`, `src/skills/codex/ad-publish/references/evaluation.md:5`, and `src/skills/codex/ad-voice/SKILL.md:22` conflate a brief with the material whose facts must survive (accessed 2026-09-02 via `git show`, `rg`, and `sed`)
- **C2:** `origin/main@4d1fd31`: `src/skills/codex/ad-publish/SKILL.md:81` and `:110` require the smallest self-contained result and one usable publication (accessed 2026-09-02 via `git show`, `rg`, and `sed`)
- **C3:** `origin/main@4d1fd31`: `src/skills/codex/ad-publish/SKILL.md:59` composes bounded research capabilities but has no lightweight claim-evidence gate for replies (accessed 2026-09-02 via `git show` and `sed`)
- **C4:** `origin/main@4d1fd31`: `doc/specs/0005-compose-publication-reporting.md:109` records destinations but does not require a capability check for the exact posting surface (accessed 2026-09-02 via `git show`, `rg`, and `sed`)
- **D1:** `git log origin/main -- src/skills/codex/ad-publish src/skills/codex/ad-voice` found `f692af6` (voice layer), `bd9c2cc` (publication workflow), and `cf9cffa` (final naturalization gate); none introduces source-role classification (accessed 2026-09-02 via git)
- **D2:** `git log origin/main --all --grep='publication\|voice\|reply\|Slack'` found publication and voice work but no prior collaboration-reply implementation (accessed 2026-09-02 via git)

## Limitations and reversal

Platform capabilities change, and human UI features may differ from API or bot
features. The bundled matrix is therefore a verified conservative baseline, not a
permanent exhaustive list; the workflow must re-check official documentation or
the actual target when a requested feature is absent or ambiguous. Evidence that
a separate reply skill provides materially better routing or that the shared
template contract cannot express reply behavior would reverse the decision to
extend `ad-publish`.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0007-ground-context-bounded-collaboration-replies.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
