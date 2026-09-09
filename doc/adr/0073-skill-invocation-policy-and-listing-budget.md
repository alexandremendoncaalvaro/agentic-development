# ADR-0073: Classify skills by invoker and fit the host listing budget

**Status:** accepted
**Date:** 2026-09-09
**Deciders:** Alexandre Alvaro

## Context

Auto-invocation of a skill depends on the host matching the request against the skill's `description`. Claude Code loads every skill's name and description into a listing whose character budget is 1% of the model's context window (8,000 characters at a 200k window); on overflow it keeps every name but drops descriptions starting with the least-invoked skills (source: code.claude.com/docs/en/skills, fetched 2026-09-09). Codex caps its listing at 2% of the window, or 8,000 characters when the window is unknown (learn.chatgpt.com/docs/build-skills).

The kit's 43 skills carry 26,274 characters of `description` on the Claude Code side and 24,457 on the Codex side (frontmatter parsed the way the test suite parses it). In one session on the author's machine (observed once; the live listing depends on session state and is not reproducible on demand), 12 of the 43 kit skills were listed without any description, among them `ad-spec` and `ad-tdg`; a skill listed by name only cannot be matched by content. The load-bearing measurement is the reproducible total against the budget, not that count. Two descriptions also exceed the 1,024-character maximum of the open Agent Skills specification (agentskills.io), which Codex and claude.ai enforce; the kit's test guards 1,536, the Claude Code listing cut, not the specification.

The Codex tree already carries a per-skill `policy.allow_implicit_invocation` flag, but its values do not reflect any classification: six skills allow implicit invocation (`ad-audit`, `ad-philosophy`, `ad-publish`, `ad-report`, `ad-review`, `ad-voice`) while the pipeline skills the kit describes as auto-invoking (`ad-ground`, `ad-tdd`, `ad-grill-me`) do not.

Roughly half of the kit's skills are verbs a human types deliberately (open a PR, merge, release, publish, bootstrap a document, tune a template). Their descriptions occupy about 11,000 characters of the listing and buy nothing, because the model should not fire them on its own.

## Decision

We will classify every kit skill into one of two invocation classes and make the classification explicit in both hosts' frontmatter:

- **User-invocable only.** The skill is an outward-facing or hard-to-reverse human verb (publishing, opening or merging a PR, releasing) or a setup verb run on request. Claude Code: `disable-model-invocation: true`, which removes the description from the listing while keeping the `/name` command. Codex: `policy.allow_implicit_invocation: false`. Members: `ad-archive`, `ad-architecture`, `ad-bootstrap`, `ad-community-docs`, `ad-design`, `ad-guidelines`, `ad-hooks`, `ad-level-up`, `ad-merge`, `ad-pr`, `ad-publish`, `ad-release`, `ad-report`, `ad-rules`, `ad-skill`, `ad-subagent`, `ad-template-tune`, `ad-update`, `ad-voice`, `ad-voice-tune`.
- **Model-invocable.** The skill is a posture or a pipeline stage the model should reach for on its own, including `ad-commit`: a commit is local and reversible, and the pipeline needs the agent to land what TDD produces without a human keystroke. Claude Code: default frontmatter. Codex: `policy.allow_implicit_invocation: true`. Members: the remaining 23 skills.

The dividing line is blast radius, not side effects: local, reversible actions may be model-fired; anything that reaches the team or a registry stays human-fired.

We will bound the model-invocable descriptions so that the whole kit fits the smallest documented budget: each model-invocable `description` is at most 350 characters, opens with the use case and trigger phrases, and the sum over all model-invocable descriptions stays at or below 8,000 characters. Every description, in either class, stays within the 1,024-character specification maximum. `test/skills.test.js` enforces the class flags on both hosts, the per-description caps, and the total.

Evidence: `doc/research/0008-ground-skill-invocation-policy.md` (ground record, ADR-0070) carries the claim-to-source map for the host mechanisms and the measurements above.

## Consequences

Positive:

- Every skill the model is expected to fire keeps its full description in the listing on a 200k-window session, on both hosts, without the user raising `skillListingBudgetFraction`.
- The classification is a contract the tests hold, not a convention; adding a skill forces the author to say who invokes it and to pay for the budget it consumes.
- Codex parity becomes meaningful: the implicit-invocation flag now says the same thing as the Claude Code flag.

Negative / trade-offs:

- Model-invocable descriptions lose their long trigger lists. Mitigated: the body still carries the regime check, and the `summary` field feeds the managed AGENTS.md table; the hook in ADR-0074 names the pipeline skills explicitly, so matching no longer rests on descriptions alone.
- A user-invocable skill can no longer be reached by the model even when a request clearly asks for it (for example "open the PR"). The model must tell the user to run `/ad-pr`. Accepted: outward-facing verbs staying human-fired is the posture Anthropic and Codex both recommend. The first dogfood run showed that including `ad-commit` in this class blocks the agent from landing its own verified work, which is bureaucracy rather than safety; the class was corrected before the decision was accepted.
- `disable-model-invocation` is a Claude Code field outside the open specification. Skills carrying it cannot be uploaded to claude.ai unchanged. Accepted: the kit targets Claude Code and Codex, and the Codex tree carries the equivalent in `agents/openai.yaml`, not in frontmatter.

Revisit trigger: either host documents a larger default listing budget, or the model-invocable set grows past what 8,000 characters can describe at 350 characters each.

## Alternatives Considered

- **Raise `skillListingBudgetFraction` on the user's machine** — rejected as the fix. It is a per-machine setting that does not ship with the kit; every consumer would hit the same truncation. Kept as an interim mitigation the owner may apply locally.
- **Shorten all 43 descriptions equally to about 186 characters** — rejected. Too lossy for the pipeline skills, and it spends budget describing skills the model should never fire.
- **Merge skills to reduce the count** — rejected for this decision. Consolidation is a separate design question with its own trade-offs; classification solves the budget without changing the skill surface.
- **A router skill that maps every skill (mattpocock/skills `ask-matt` pattern)** — rejected. It consumes budget itself, must be re-synced on every skill change, and still depends on the router's own description being matched.
- **Rely on the prompt-time hook alone (ADR-0074) and leave descriptions as they are** — rejected. The hook names the core chain, not every model-invocable skill; skills such as `ad-diagnose` or `ad-deepen` still need a description the host can match.
