# GROUND-0016: Route Prism methods without a maturity ladder

**Status:** recorded
**Decision:** Model evaluation setting, claim type, study design, evidence source, and assurance rigor as independent choices; use model judgment for contextual method fit and deterministic scripts for structure, provenance, arithmetic, and artifact integrity.
**Decision ref:** doc/tasks/0074-refine-prism-method-routing.md
**Confidence:** Strong

## Decision and confidence

The happy path is to replace the numbered assurance ladder with an orthogonal
method router that begins with the decision and requested evaluation boundary.
The model selects a fitting design from the objective, factors, available
evidence, stakes, and reversibility; a local, bench, replay, staging, pilot, or
production setting may be sufficient on its own. Multiple settings are composed
only when each retires a distinct uncertainty. Deterministic code validates the
durable plan's required structure, claim-linked methodological provenance,
mechanical calculations, and frozen artifact identity, while the model and any
qualified human reviewer retain responsibility for source applicability and
fit-for-purpose judgment. Behavioral cases use natural prompts and
outcome-shaped criteria; this task defines a frozen three-arm Prism comparison
protocol but does not duplicate the general trajectory harness already owned by
Task 0048. The evidence supports a Strong proceed verdict.

## Evidence

### E1 — Evaluation setting and methodological rigor are independent choices

**Strength:** High
**Provenance:** A1, A2, C1, D1

NIST selects experimental designs from the objective, factors, resources, and
required control over erroneous decisions rather than from a prescribed
deployment sequence. The Aqua Book makes analytical assurance proportional to
intended use, risk, complexity, and uncertainty and separates verification from
fit-for-purpose validation. The current Prism text already says multiple gates
are useful only when each retires a different uncertainty, but its numbered
levels create an avoidable progression cue. An orthogonal router preserves the
accepted intent while making the stopping condition explicit.

### E2 — Contextual judgment and deterministic checks should be complementary

**Strength:** High
**Provenance:** A3, A4, A5, B2, B3, C2, D2

Official skill-authoring guidance recommends high freedom when valid approaches
depend on context and low freedom for fragile, repeatable operations. Current
agent-evaluation guidance similarly combines code-based, model-based, and human
graders according to what each can observe. Public evaluator skills apply the
same split: deterministic checks handle machine-verifiable structure and state,
while model graders handle open-ended outcomes and require human calibration.
The current plan validator checks headings and placeholders only; extending it
to provenance completeness is coherent, but claiming that it validates the
truth or applicability of a source would cross the deterministic boundary.

### E3 — Source provenance must be attached to the method it supports

**Strength:** High
**Provenance:** A2, A3, C1, C2

The current skill requires essential citations and a short explanation of each
source's contribution, but the durable template exposes only one free-form
Sources section. A mechanically checkable record should require, for each
load-bearing methodological choice, a source locator, its contribution, the
adaptation made for the current context, and the limitation retained. A script
can verify that this map exists and is complete; skeptical review must still
reopen the source and judge whether the mapping is valid.

### E4 — Skill effectiveness needs natural comparative cases, not self-descriptive assertions

**Strength:** High
**Provenance:** A3, A4, A5, B1, B2, C3, C4

Official guidance treats representative evaluations as the source of truth for
skill effectiveness and recommends stable environments, multiple trials, mixed
grader types, and human calibration. The .NET skill-testing reference adds a
useful anti-overfitting pattern: prompts do not name the skill or reward its
vocabulary, and baseline and skilled arms are judged on outcomes. The current
Prism corpus contains natural cross-domain prompts but is a committed fixture,
not an executable comparative result. Task 0048 already owns the general
trajectory harness, so this task should add discriminating cases and a frozen
three-arm protocol without creating a competing runner.

### E5 — A public comparison can preserve privacy by separating protocol from private fixtures

**Strength:** Medium
**Provenance:** B1, B3, C1, D1

Validated public evaluator patterns keep portable definitions separate from
project-specific bindings. Prism already applies that seam through its optional
domain adapter. The comparison can therefore version neutral prompts, outcome
criteria, run metadata, hashes, and aggregate verdicts in the kit while keeping
private product fixtures and source bodies outside the public repository. This
record establishes the separation rule; only an executed leak scan and review
can verify a particular comparison package.

## Source register

- **A1:** NIST/SEMATECH, [How do you select an experimental design?](https://www.itl.nist.gov/div898/handbook/pri/section3/pri33.htm) — design selection by experimental objective, number of factors, resources, and error control (accessed 2026-09-14 via official web documentation).
- **A2:** UK Government, [The Aqua Book](https://www.gov.uk/guidance/the-aqua-book) — proportional analytical assurance and separate verification and validation responsibilities (accessed 2026-09-14 via official web guidance).
- **A3:** Anthropic, [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — appropriate degrees of freedom, progressive disclosure, executable helpers, and evaluation-first skill development (accessed 2026-09-14 via official web documentation).
- **A4:** Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — code, model, and human grader roles; trials, traces, stable environments, and outcome-oriented grading (accessed 2026-09-14 via official engineering publication).
- **A5:** OpenAI, [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — task-specific evals, representative distributions, automation, human calibration, and continuous evaluation (accessed 2026-09-14 via official web documentation).
- **B1:** dotnet/skills, [`create-skill-test/SKILL.md`](https://github.com/dotnet/skills/blob/main/.agents/skills/create-skill-test/SKILL.md) — public implementation of baseline-versus-skilled comparison, natural stimuli, outcome rubrics, deterministic graders, dormancy cases, and anti-overfitting checks (accessed 2026-09-14 via GitHub source view).
- **B2:** arjunprabhulal/agent-skills, [`agent-evaluation/SKILL.md`](https://github.com/arjunprabhulal/agent-skills/blob/main/skills/agent-lifecycle/agent-evaluation/SKILL.md) — public implementation using real cases, the cheapest adequate grader, repeated trials, baselines, held-out cases, and explicit uncovered scope (accessed 2026-09-14 via GitHub raw source).
- **B3:** Arize AI, [`arize-evaluator/SKILL.md`](https://github.com/Arize-ai/arize-skills/blob/main/skills/arize-evaluator/SKILL.md) — public implementation separating generic evaluators from project column mappings and combining deterministic code evaluators with model judges (accessed 2026-09-14 via GitHub raw source).
- **C1:** `src/skills/codex/ad-prism/references/methodology.md:21` — current numbered assurance presentation and its existing multiple-gates stop condition (accessed 2026-09-14 via repository read).
- **C2:** `src/skills/codex/ad-prism/scripts/validate-plan.mjs:8` — current deterministic boundary covers required sections, duplicates, and unresolved placeholders (accessed 2026-09-14 via repository read).
- **C3:** `src/skills/codex/ad-prism/evals/evals.json:1` — current natural cross-domain positive and close-negative cases without an execution receipt (accessed 2026-09-14 via repository read).
- **C4:** `doc/tasks/0048-build-skill-evaluation-harness.md:11` — existing product task owns the general representative-trajectory harness and deterministic-versus-judgment scoring contract (accessed 2026-09-14 via repository read).
- **D1:** commit `8b1043a`, `src/skills/codex/ad-prism/` and dual-host peers — introduced generic Prism with proportionate assurance, deterministic validators, artifact receipts, and cross-domain routing cases (accessed 2026-09-14 via `git show` and `git log origin/main -- <paths>`).
- **D2:** commit `0ab4ca8`, `src/skills/*/ad-prism/SKILL.md` and `test/skills.test.js` — normalized host-specific skill authoring contracts and rejected structural assertions as behavioral proof (accessed 2026-09-14 via `git show` and local git history).

## Limitations and reversal

This ground record selects the implementation shape; it does not establish that
the revised skill outperforms either an unskilled model or the private Prism.
Only forward runs on frozen, representative cases can establish that result.
The three-arm protocol remains local-only wherever its fixtures contain private
product context. Reverse the orthogonal router if behavioral evaluation shows
that models consistently fail to select adequate assurance without a more
direct progression aid. Reverse the deterministic boundary only if a reliable
machine-verifiable representation of source applicability becomes available;
presence and syntax alone remain insufficient.

## Audit path

Run `node .agents/skills/ad-ground/scripts/validate-record.mjs doc/research/0016-ground-prism-method-routing.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
