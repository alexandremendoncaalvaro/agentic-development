# GROUND-0017: Make the rules correction produce decision-ready boss reports

**Status:** recorded
**Decision:** Strengthen `ad-brief` with three semantic decision modes, concrete output examples, and representative behavior evaluations; make `ad-rules` verify the composed brief against that contract before returning. Do not use punctuation, exact prose, or heading matches as proxies for behavior.
**Decision ref:** doc/adr/0076-compose-a-canonical-decision-maker-brief.md
**Confidence:** Strong

## Decision and confidence

The grounded path is a narrow refinement of ADR-0076 rather than a new workflow: preserve `ad-brief` as the presentation owner, make its three outcomes explicit, show one compact example per outcome, and add representative evaluations for autonomous choice, genuine owner judgment, and an auditable completed decision. `ad-rules` remains the correction orchestrator but must verify that the returned brief contains every required field and a semantically valid `Your attention` result before it continues. This follows official skill-authoring and evaluation guidance, the public implementations, the repository's existing template and evaluation patterns, and the observed failure in which a treatment agent read the correct rules but duplicated the owner ask and skipped the formal brief. Axis 2 is Strong because the change is local, reversible, and directly exercises the accepted contract without changing its capability boundary.

## Evidence

### E1 — A concrete output contract and examples are appropriate where consistency matters

**Strength:** High
**Provenance:** A1, A3, B1, B2, C1, D1

Anthropic recommends matching instruction freedom to the required consistency, using exact templates for strict report shapes, and providing input/output examples when output quality depends on presentation. OpenAI's public `plugin-eval` skill uses the same pattern for a terse, action-oriented report. The repository already owns a ten-field output template, and ADR-0076 requires a one-screen, conclusion-first brief. Adding decision-mode examples clarifies the existing contract without adding a new responsibility.

### E2 — Behavior evaluations should drive the refinement and remain as regressions

**Strength:** High
**Provenance:** A1, A2, B1, C2, C3, D1

OpenAI recommends task-specific evaluations, representative and edge cases, pass/fail or pairwise grading, clear rubrics, and human calibration. Anthropic's documented skill workflow starts from a baseline without the skill, uses three representative scenarios, tests with a fresh skill-using instance, and iterates from observed failures. The local smoke evaluation used that shape and found one strict treatment failure, while the repository already ships structured skill evals for `ad-prism`. Persisting the three scenarios converts that observation into a reusable regression surface.

### E3 — The checks must evaluate decisions, not punctuation or copied wording

**Strength:** High
**Provenance:** A2, A3, B1, C3

Official guidance calls for criteria tied to the real task and warns against generic or vibe-based metrics. The Codex skill-creator guidance in force in this session also rejects tests that merely match generated wording, headings, or regular expressions. Therefore, the invariant is one unresolved owner decision with recommendation-first viable alternatives, not one question-mark character or one prescribed sentence.

### E4 — The three decision outcomes are the owner's established product contract

**Strength:** High
**Provenance:** C1, C4, C5, D1

The global boss rule says to decide when evidence, binding decisions, convergent research, or simplicity settles the choice; otherwise escalate only genuine judgment with a recommendation. ADR-0076 translates that posture into `ad-brief`: no manufactured alternatives for a clearly superior path, one owner decision for genuine judgment, and an auditable report when work has already been decided or completed. The smoke evaluation demonstrated that these distinctions are observable and that merely rereading the prose does not guarantee faithful rendering.

## Source register

- **A1:** Anthropic, [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — concise skills, strict-versus-flexible templates, examples, validation loops, and evaluation-driven development (accessed 2026-09-15 via official web documentation).
- **A2:** OpenAI, [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — task-specific evaluations, representative distributions, edge cases, pairwise/pass-fail grading, clear rubrics, and human calibration (accessed 2026-09-15 via official web documentation).
- **A3:** OpenAI, [Model guidance](https://developers.openai.com/api/docs/guides/latest-model) — audit loaded skills, specify required writing structure, lead with the main point, and use plain language (accessed 2026-09-15 via official web documentation).
- **B1:** `anthropics/skills:skills/skill-creator/SKILL.md` — public implementation that says, “Create a few test prompts and run claude-with-access-to-the-skill,” then compare and iterate (accessed 2026-09-15 via GitHub web view).
- **B2:** `openai/plugins:plugins/plugin-eval/skills/plugin-eval/SKILL.md` — public implementation that says, “Lead with At a Glance, Why It Matters, Fix First, and Recommended Next Step” (accessed 2026-09-15 via GitHub web view).
- **C1:** `src/skills/codex/ad-brief/SKILL.md:57` and `src/skills/codex/ad-brief/references/output-template.md:1` — existing owner-decision rule and ten-field presentation contract (accessed 2026-09-15 via `rtk sed`).
- **C2:** `src/skills/codex/ad-prism/evals/evals.json:1` — existing repository pattern for representative skill evaluations with observable expectations (accessed 2026-09-15 via `rtk rg`).
- **C3:** `test/skills.test.js:743` — existing public-contract test for live context, decision shaping, and host parity; the current test does not exercise generated output (accessed 2026-09-15 via `rtk sed`).
- **C4:** `/Users/ale/dev/ales-workflow/AGENTS.ale.md:16` — global boss rule: decide grounded choices and escalate only genuine owner judgment with recommendation first (accessed 2026-09-15 via `rtk rg`).
- **C5:** `.context/ad-rules-eval/result.md:1` plus its baseline, treatment, and two blind grading artifacts — one treatment failure on a duplicated owner ask and a treatment receipt admitting the formal brief was skipped; summarized here because `.context` is intentionally not durable (accessed 2026-09-15 via local filesystem).
- **D1:** `9ef119d`, touching `src/skills/{codex,claude-code}/ad-brief/`, `ad-rules/`, tests, ADR-0076, GROUND-0013, and task-0072 — introduced the canonical decision-maker brief and explicitly required representative installed-skill scenarios because static assertions cannot prove briefing quality (accessed 2026-09-15 via local git).
- **D2:** `c6b862b`, touching `src/skills/{codex,claude-code}/ad-rules/` and tests — added deterministic host-global rule resolution while retaining model-authored correction output (accessed 2026-09-15 via local git).
- **D3:** `git branch --all --no-color` and `git log --all -S'one question' -- src/skills/codex/ad-brief/SKILL.md src/skills/claude-code/ad-brief/SKILL.md` — active and remote branches were surveyed; no landed post-ADR behavioral refinement supersedes this correction (accessed 2026-09-15 via local git).

## Limitations and reversal

Static tests can prove that both hosts ship the same contract, examples, and evaluation cases; they cannot prove that every nondeterministic run will comply. The forward test is a smoke gate, not a reliability estimate. Reverse or relax a new instruction only if repeated held-out evaluations show that it reduces boss clarity, hides material uncertainty, or makes genuine owner choices harder to understand. Strengthen the evaluation population rather than adding wording-specific rules when a new failure appears.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0017-ground-ad-rules-boss-behavior.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
