# GROUND-0013: Compose a canonical decision-maker brief

**Status:** recorded
**Decision:** Add a model-invocable, read-only `ad-brief` skill as the canonical decision-maker briefing operation. Keep `ad-philosophy` as the universal reporting posture; let `ad-roadmap`, `ad-handoff`, and the correction mode of `ad-rules` pass settled fact packets to `ad-brief` and regain control; preserve `ad-publish` as the caller of `ad-voice` for all outward text.
**Decision ref:** doc/tasks/0072-compose-decision-maker-briefs.md
**Confidence:** Strong

## Decision and confidence

The happy path is a one-way composition graph with `ad-brief` as the presentation owner. A standalone invocation gathers the smallest sufficient set of live repository and session facts; a composing skill supplies facts it already owns instead of asking `ad-brief` to rediscover them. `ad-brief` never calls `ad-roadmap`, `ad-handoff`, `ad-rules`, or `ad-voice`, so callers retain their scope, persistence, authorization, and verification responsibilities without cycles.

This is a distinct skill rather than another `ad-philosophy` mode. The posture must remain universal and implicit, while “brief me” is an observable, read-only operation with its own input, output, natural triggers, and reuse by other skills. The name `ad-brief` wins over `ad-summary`: the requested outcome is decision-ready context and direction, not generic compression. Axis 2 is strong because the boundary follows the repo's accepted fold-versus-new-skill rule, the host mechanisms support implicit discovery and explicit invocation, public implementations converge on a short actionable briefing shape, and the repository already has a working caller/callee composition contract.

`ad-rules` needs two explicit modes. A request to list or inspect rules keeps the existing inventory-only result. `/ad-rules`, “The Rules”, or an equivalent correction gesture resolves the rules, applies the existing `ad-philosophy` recommitment to the current plan, and then composes `ad-brief`. This change makes `ad-rules` model-invocable because natural correction phrases must be discoverable; it does not move rule ownership into `ad-brief`.

## Evidence

### E1 — A focused, discoverable briefing operation should be separate from universal posture and persistent handoff

**Strength:** High
**Provenance:** A1, A2, A3, B2, B3, C1, C2, D1, D2

Official skill guidance treats a skill as one focused capability whose description carries its trigger conditions, while both supported hosts provide separate controls for implicit and explicit invocation. The public `executive-briefing` reference uses natural prompts such as “brief me”, “executive summary”, “catch me up”, and “what do I need to know”, and requires a newcomer to be able to act on the result. The public `session-summary` reference instead writes persistent resumption state and explicitly distinguishes end-of-session use from active work. In-repo, `ad-philosophy` owns universal reporting posture, `ad-roadmap` owns plan reconciliation, and `ad-handoff` owns persistence. Git history introduced those responsibilities independently. A dedicated `ad-brief` therefore provides discoverability and reuse without transferring those owners' stateful work.

### E2 — Callers should pass settled facts through a public contract and regain control

**Strength:** High
**Provenance:** A1, A2, B1, C3, D3

Official guidance recommends focused skills with explicit inputs and outputs; Claude Code documents that multiple skills can be used in one request, and the open Agent Skills format makes descriptions the discovery surface while loading the full body only when selected. The public `using-superpowers` router demonstrates process-first selection of specialist skills. More importantly, the repository already implements the exact desired contract: `ad-publish` invokes only the specialist that owns a necessary step, respects its gates, and returns control for end-to-end verification. Reusing that contract is lower-risk than inventing host-specific orchestration.

### E3 — The brief must distinguish observed state from remembered context and report only viable decisions

**Strength:** High
**Provenance:** B2, B4, C1, C2, C4, D1

The public briefing references converge on conclusion-first narrative, traceable facts, explicit open questions, implications, risks, and a concrete ask; they reject raw data dumps and unexplained jargon. In-repo, `ad-philosophy` already requires a self-contained decision-maker report and recommendation-first decision shape, while `ad-handoff` already proves that live repository state and session context can be combined into a compact resume brief. The canonical operation should preserve those rules, label uncertainty, and include alternatives only when owner judgment is genuinely required. Repository state outranks conversational memory when they conflict.

### E4 — Rules correction and publication voice remain compositions, not briefing responsibilities

**Strength:** High
**Provenance:** A1, A2, C3, C4, C5, D3, D4

The hosts can discover a model-invocable skill from natural language while still supporting explicit invocation. ADR-0044 already defines explicit posture invocation as a task-specific correction, so `ad-rules` can compose that existing behavior rather than copying it. Separately, `ad-publish` already owns source-role isolation, native-language preview, exact-target approval, and mandatory `ad-voice` invocation after every textual revision. Making `ad-brief` call `ad-voice` would blur private owner reporting with outward publication and risk bypassing the established privacy and approval ledger; leaving the publication chain unchanged preserves the stronger existing gate.

## Source register

- **A1:** OpenAI, [Creating skills](https://learn.chatgpt.com/en/docs/build-skills) — focused-skill guidance, trigger descriptions, and `policy.allow_implicit_invocation` behavior (accessed 2026-09-10 via web documentation).
- **A2:** Anthropic, [Extend Claude with skills](https://code.claude.com/docs/en/slash-commands) — description-based discovery, `disable-model-invocation`, explicit invocation, multi-skill use, and context behavior (accessed 2026-09-10 via web documentation).
- **A3:** Agent Skills, [Specification](https://agentskills.io/specification) — portable skill name, description, and progressive-disclosure contract (accessed 2026-09-10 via web documentation).
- **B1:** obra/superpowers, [`using-superpowers/SKILL.md`](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) — public router that selects and orders specialist skills before execution (accessed 2026-09-10 via GitHub web view).
- **B2:** latour-ai/skills, [`executive-briefing/SKILL.md`](https://github.com/latour-ai/skills/blob/main/executive-briefing/SKILL.md) — natural briefing triggers, grounded facts, short actionable output, and newcomer-readability checks (accessed 2026-09-10 via GitHub web view).
- **B3:** hooooolea/agent-skills, [`session-summary/SKILL.md`](https://github.com/hooooolea/agent-skills/blob/main/skills/productivity/session-summary/SKILL.md) — persistent session-summary boundary and project/objective/completed/pending structure (accessed 2026-09-10 via GitHub web view).
- **B4:** Adobe skills, [`aa-executive-briefing/SKILL.md`](https://github.com/adobe/skills/blob/main/plugins/adobe-analytics/skills/aa-executive-briefing/SKILL.md) — executive narrative, implication, driver, risk, forward look, and ask pattern (accessed 2026-09-10 via GitHub web view).
- **C1:** `src/skills/codex/ad-philosophy/SKILL.md:14-30` — explicit recommitment, decide-versus-ask, verification, and decision-maker reporting are universal posture (accessed 2026-09-10 via `nl -ba`).
- **C2:** `src/skills/codex/ad-roadmap/SKILL.md:15-76` and `src/skills/codex/ad-handoff/SKILL.md:26-131` — roadmap owns plan reconciliation; handoff owns persistence, redaction, lost asks, hygiene, and resume state (accessed 2026-09-10 via `nl -ba`).
- **C3:** `src/skills/codex/ad-publish/SKILL.md:47-115` and `src/skills/codex/ad-publish/references/composition.md:1-31` — existing public-contract composition, return-of-control, private-context exclusion, and mandatory voice routing (accessed 2026-09-10 via `nl -ba` and `sed -n`).
- **C4:** `src/skills/codex/ad-rules/SKILL.md:14-101` — current rules capability resolves and inventories sources but deliberately stops before applying or correcting them (accessed 2026-09-10 via `nl -ba`).
- **C5:** `test/skills.test.js:14-38`, `test/skills.test.js:108-217`, and `test/skills.test.js:1035-1078` — invocation classes, routing surfaces, roadmap contracts, and listing budgets are already machine-checked (accessed 2026-09-10 via `sed -n`).
- **D1:** `git show --stat cce7ed9` — the resume brief was added inside `ad-handoff` as a persistence-specific evolution (accessed 2026-09-10 via local git).
- **D2:** `git show --stat d74b7c7` and `git show --stat 01445c2` — `ad-roadmap` was introduced as a distinct reconciliation operation and later gained separate project/task presentation (accessed 2026-09-10 via local git).
- **D3:** `git log -S'ad-voice' --oneline -- src/skills/codex/ad-publish/SKILL.md src/skills/codex/ad-publish/references/composition.md` and `git show --stat 8548787` — publication composition and language preferences evolved behind the existing voice boundary (accessed 2026-09-10 via local git).
- **D4:** `git log --all --oneline -- src/skills/codex/ad-brief src/skills/claude-code/ad-brief` — no prior `ad-brief` implementation exists on reachable branches (accessed 2026-09-10 via local git; empty output).

## Limitations and reversal

This record cannot prove that every host will select the skill for every multilingual paraphrase, nor can static source tests prove subjective briefing quality. Mitigate selection risk with concise multilingual-neutral concepts in the model-invocable description, explicit `/ad-brief`, and realistic installed-skill scenarios. Mitigate quality risk with structural tests for ownership and cycles plus dogfood review of representative “brief me”, roadmap, rules-correction, handoff, and publication prompts.

Reverse the separate-skill decision if installed-host evaluation shows that natural briefing requests consistently route to an existing owner with equal clarity, or if `ad-brief` cannot be used by at least two composing skills without importing their specialist responsibilities. Reverse `ad-rules` model invocation if realistic rules-inventory prompts repeatedly trigger correction behavior despite the explicit mode boundary.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0013-ground-decision-maker-brief-composition.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
