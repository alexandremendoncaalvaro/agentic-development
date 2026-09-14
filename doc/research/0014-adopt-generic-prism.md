# RESEARCH-0014: Should Agentic Development adopt Prism?

**Status:** recorded
**Created:** 2026-09-10
**Question:** Should Agentic Development ship a domain-agnostic evaluation skill derived from a private, product-specific local Prism, and what boundary and configuration model would preserve its rigor without publishing organization-specific knowledge?
**Stakes:** medium times reversible
**Confidence:** Strong

## Conclusion and confidence

Agentic Development should adopt Prism's methodology, but it should not copy the current local skill into the kit. The public capability should be a dual-host, model-invocable `ad-prism` that owns decision-focused evaluation design, interpretation, refinement, and methodological audit. Its bundled core should contain only portable methods and generic templates; company, product, role, repository-path, privacy, and domain-measure knowledge should live in an optional project-local domain adapter that is never required for the skill to work. For a material evaluation, Prism should freeze the settled evaluation artifact, record its source set and access gaps, and audit methodology before passing only settled claims and limits to `ad-publish`; ordinary collaboration replies should not pay that ceremony. The implementation can proceed after a dedicated ADR settles the final name, adapter location, and exact boundary with `ad-research`, `ad-spike`, `ad-audit`, and `ad-publish`.

## Question and scope

The deciding criterion is whether the extracted skill can improve evaluation decisions across unrelated products while remaining understandable, testable, and compositional inside the existing Agentic Development workflow. The desired outcome is not a generic statistics encyclopedia. It is a practical consultant that reconstructs the decision, chooses the smallest adequate evaluation, connects claims to evidence and measures, prevents unsupported conclusions, and reports what the result can and cannot establish.

The candidate options were:

1. copy the local Prism unchanged;
2. extract a generic public core and supply product knowledge through an optional domain adapter;
3. distribute the behavior across existing Agentic Development skills;
4. do not adopt it.

The change is reversible because it adds a skill surface and project-local configuration rather than migrating production data or changing an external protocol. The stakes are medium because a methodology skill can influence consequential product decisions and because every model-invocable skill consumes the hosts' limited discovery budget.

## Hypothesis

Not applicable — this is a design and adoption survey. The later implementation needs behavioral evaluations that compare the generic skill against the unskilled baseline across several domains, but no measurement is required to establish that the private product-bound package cannot be shipped unchanged.

## Method

The study applied the repository's four-source research pass. Official sources covered skill packaging and current evaluation guidance. Public implementations supplied scope and evaluation-skill patterns. Repository inspection compared Prism against the existing Agentic Development skill boundaries, language, runtime, tests, and installer. Git history checked for an earlier Prism attempt and traced how adjacent skills were separated.

The private local Prism was read in full with the references required by its own routing contract. Its 42 validator tests were run. A local coupling scan used a private domain-vocabulary list to locate organization, product, role, repository, privacy, measure, and scenario assumptions. The private vocabulary, absolute path, and file contents are intentionally withheld from this public record; the observation is therefore labeled local-only rather than presented as independently reproducible public evidence. Claims are graded using WORKFLOW §17; confidence to proceed is separate from source strength.

## Evidence

### E1 — Prism's decision-first evaluation method is portable and fills a real workflow gap

**Evidence strength:** High

**Provenance:** A1, A2, A3, A4, A5, B1, B2, C1.

The local Prism's central chain — decision → objective → evaluation question → claim → evidence → task → measure → data source → decision rule → next gate — combines Goal-Question-Metric, Evidence-Centered Design, proportional assurance, experimental design, and current AI-evaluation practice. Official and primary sources independently support decision-linked questions, representative tasks, explicit success criteria, context-appropriate harnesses, grouped observations, verification, and fit-for-purpose validation. Agentic Development currently owns implementation research, technique spikes, rule audits, and report rendering, but no skill owns evaluation methodology for a product or system change. The operation is therefore portable and distinct.

### E2 — The current local package is materially product-specific and cannot be copied safely

**Evidence strength:** Medium

**Provenance:** B1, M1.

The local scan and full-file inspection find coupling across most non-test files. It reaches the trigger description, main workflow, audience model, source map, examples, behavioral evals, session manifest, analysis template, telemetry contract, and manifest validator. A product-context reference also contains organization-specific repository paths and data-authorization assumptions. Renaming terms would leave the same hidden assumptions in roles, units, evidence sources, privacy boundaries, measures, and validator columns. A real extraction is required. This is local-only evidence because publishing its private vocabulary and source paths would reproduce the leak the extraction is intended to prevent.

### E3 — A generic core plus one optional domain adapter is the simplest coherent boundary

**Evidence strength:** Medium

**Provenance:** A1, A4, B1, B3, B4, C2, C3.

Agent Skills progressive disclosure supports a compact skill body with on-demand references and assets. Public evaluation skills are useful when their scope and input contract are explicit; vendor-specific evaluators keep their platform schema inside their own skill instead of treating it as universal. The local Prism already states that it must remain usable without other custom skills, which is compatible with an optional adapter rather than a mandatory company profile.

The generic bundled core should own:

- decision framing and the claim-to-evidence chain;
- proportional routing from technical verification through field validation;
- variables, controls, blocks, independent units, repeated observations, and prespecification;
- human-versus-system evidence boundaries in generic terms;
- evidence grading separate from confidence to proceed;
- verification separate from fit-for-purpose validation;
- progressive gates, stop rules, limits, adversarial finding verification, and clear explanations;
- generic evaluation-brief, analysis-plan, and audit templates.

The optional project adapter should contain only facts that vary by organization or product:

- product and evaluation scope;
- canonical roles and decision owners;
- repositories, harnesses, telemetry, forms, corpora, and other evidence surfaces;
- privacy, authorization, retention, and regulatory constraints;
- domain measures, guardrails, scenario vocabulary, and required sources;
- known configuration identifiers and rollout controls.

The adapter must contain no secrets or personal data, must distinguish observed facts from defaults, and must not be required for generic use. Its final durable location and precedence need an ADR because they create a new project configuration contract.

### E4 — The public skill must compose existing Agentic capabilities instead of reproducing them

**Evidence strength:** High

**Provenance:** C1, C2, C4, D1, D2.

`ad-prism` should own the evaluation question, study design, evidence roles, methodological limits, result interpretation, and evaluation-specific audit verdict. It should use `ad-ground` or `ad-research` for acquisition, `ad-spike` only when an implementation technique is unknown, `ad-audit` for exhaustive project-rule coverage, `ad-report` for a rendered analytical artifact, and `ad-publish` plus `ad-voice` for outward text. The caller passes settled claims and limits and regains control, matching the repository's established composition contract. This keeps Prism from becoming a second research, spike, audit, report, or publication framework.

### E5 — Generic validators are reusable, but the implementation should match the kit's Node.js runtime

**Evidence strength:** High

**Provenance:** B1, C3, M2.

The local plan, report, and artifact-freeze validators are largely domain-neutral and all 42 local tests pass. The manifest validator is coupled to product-specific participants, sessions, scenarios, measures, and durations, so it should not define the public baseline schema. Agentic Development ships Node.js ≥20.12.0, ESM, and 58 `.mjs` skill scripts with no Python skill scripts. The reusable validators should therefore be ported to dependency-free ESM and covered by the existing dual-host byte-parity tests. A generic observation manifest can be added later only after real cross-domain fixtures establish a stable minimum schema.

### E6 — Adoption needs cross-domain behavioral and trigger evaluation, not only string checks

**Evidence strength:** High

**Provenance:** A1, A2, A3, B2, B3, C5.

Official guidance stresses representative tasks, edge cases, outcome grading, traces, and evaluation of the actual harness. Public skill-testing guidance also treats near-miss trigger cases and baseline-versus-skilled arms as necessary to avoid self-confirming assertions. The current Prism eval set is useful but every positive case comes from one private product domain and its negative cases are too far from the intended generic boundary. The public skill needs positive fixtures across at least several unrelated domains and close negative fixtures that should route to `ad-research`, `ad-spike`, `ad-review`, `ad-audit`, or ordinary tests.

### E7 — Publication verification is not source freezing or a methodological audit

**Evidence strength:** High

**Provenance:** B1, C2, C6.

`ad-publish` already performs strong editorial verification: it classifies supplied material by role, verifies material claims from the smallest authorized source, keeps private deliberation out, routes every final outward text through `ad-voice`, compares the language adaptation against the approved conversation-language draft, and invalidates approval after any text change. Its source policy deliberately keeps normal drafting read-only and does not retain source bodies or exports. It neither creates a cryptographic receipt for the evidence package nor audits whether an evaluation's methods, measures, arithmetic, and conclusions support the decision.

The local Prism's freeze operation hashes the settled evaluation artifact or directory package; its audit receipt records grounding sources and access gaps, and its audit checks traceability and methodology. It does not preserve immutable copies of external source pages. The generic composition boundary should therefore be proportional: `ad-prism` freezes and audits a material evaluation artifact, then sends only settled outward claims and limitations to `ad-publish`; `ad-publish` retains privacy, voice, language, exact-text approval, and outward authorization. A routine comment or thread reply continues directly through `ad-publish`. `ad-audit` remains the separate exhaustive check against the repository rule set when the evaluation or publication is team-bound; it is not a substitute for Prism's methodological audit.

## Limitations and what would reverse the conclusion

This study did not run a genericized Prism against cross-domain prompts, so it establishes the extraction boundary, not the behavioral gain of the future skill. It also did not choose the final adapter path or schema; those are architectural decisions that belong in an ADR after the study is reviewed.

Reverse adoption if a tracer implementation cannot outperform the existing skill chain on realistic cross-domain scenarios without duplicating `ad-research`, `ad-spike`, or `ad-audit`. Reverse the adapter recommendation if three materially different product fixtures cannot share a stable core and a small domain contract. Keep the manifest validator private or domain-specific if a generic schema would become a bag of optional columns.

## Provenance and artifacts

- **A1:** Agent Skills, [Specification](https://agentskills.io/specification) and [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support) — focused skills, descriptions, references, assets, scripts, and progressive disclosure (accessed 2026-09-10 via web documentation).
- **A2:** OpenAI, [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — task-specific evals, representative distributions and edge cases, human calibration, and continuous evaluation (accessed 2026-09-10 via official web documentation).
- **A3:** Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — tasks, trials, graders, traces, outcomes, harnesses, and multi-turn evaluation (accessed 2026-09-10 via official web publication).
- **A4:** UK Government, [The Aqua Book](https://www.gov.uk/guidance/the-aqua-book) and [The Magenta Book](https://www.gov.uk/government/publications/the-magenta-book/magenta-book-central-government-guidance-on-evaluation-html) — proportional assurance, verification, fit-for-purpose validation, and decision-focused evaluation (accessed 2026-09-10 via official web guidance).
- **A5:** NASA, [Goal/Question/Metric paradigm](https://ntrs.nasa.gov/api/citations/19920010178/downloads/19920010178.pdf), and ETS, [Evidence-Centered Design](https://www.ets.org/Media/Research/pdf/TC-10-07.pdf) — derivation from goals to questions and measures, and from claims to evidence-producing tasks (accessed 2026-09-10 via primary publications linked by Prism).
- **B1:** Private local Prism installation — complete implementation, references, assets, four validators, tests, and eval set (accessed 2026-09-10; 42 of 42 tests passed). The absolute path, organization identifiers, private vocabulary, and source contents are intentionally not published. This source is available to the owner locally but not independently reproducible from the public repository.
- **B2:** dotnet/skills, [`create-skill-test/SKILL.md`](https://github.com/dotnet/skills/blob/main/.agents/skills/create-skill-test/SKILL.md) — explicit eval scope, natural stimuli, outcome graders, near-miss boundaries, and non-overfitting checks (accessed 2026-09-10 via GitHub web view).
- **B3:** arjunprabhulal/agent-skills, [`agent-evaluation/SKILL.md`](https://github.com/arjunprabhulal/agent-skills/blob/main/skills/agent-lifecycle/agent-evaluation/SKILL.md) — public example of a distinct agent-evaluation operation with real cases, graders, baselines, and honest reporting (accessed 2026-09-10 via GitHub web view).
- **B4:** Arize, [`arize-evaluator/SKILL.md`](https://github.com/Arize-ai/arize-skills/blob/main/skills/arize-evaluator/SKILL.md) — example of keeping vendor data and experiment schema inside a vendor-specific evaluator rather than universal methodology (accessed 2026-09-10 via GitHub web view).
- **C1:** `src/skills/codex/ad-research/SKILL.md`, `ad-spike/SKILL.md`, `ad-audit/SKILL.md`, and `ad-report/SKILL.md` — current research, technique, rules-audit, and presentation boundaries (accessed 2026-09-10 via `sed` and `rg`).
- **C2:** `src/skills/codex/ad-publish/references/composition.md` and ADR-0076 — one-way public-contract composition with return of control (accessed 2026-09-10 via repository read).
- **C3:** `package.json`, `src/lib/install.js`, and `test/skills.test.js` — Node.js ESM runtime, automatic dual-host skill installation, description budget, parity, and packaged-resource gates (accessed 2026-09-10 via repository read).
- **C4:** `WORKFLOW.md` sections 4, 5, 9, 10, 14, and 17 — grounding, outcome-based implementation, review, spikes, and evidence grading that `ad-prism` must compose rather than repeat (accessed 2026-09-10 via repository read).
- **C5:** `test/skills.test.js` and the local Prism `evals/evals.json` — deterministic contract tests and the current domain-bound behavior/trigger fixtures (accessed 2026-09-10 via repository and local file reads).
- **C6:** `src/skills/codex/ad-publish/SKILL.md`, `references/composition.md`, and `references/source-policy.md` — source-role classification, bounded verification, non-retention, mandatory voice/language flow, and exact-target approval boundaries (accessed 2026-09-10 via repository read).
- **D1:** `git log --all --oneline --grep='prism|evaluation method|experimental design' --regexp-ignore-case` and `git log --all --oneline -- src/skills/codex/ad-prism src/skills/claude-code/ad-prism` — no prior public Prism implementation on reachable Agentic Development history (accessed 2026-09-10 via local git; no relevant source-path result).
- **D2:** `git show --stat d74b7c7`, `git show --stat 1c83164`, and `git show --stat 436d85c` — adjacent roadmap, grounding, and routing capabilities were added as narrow skills with explicit contracts rather than one general workflow (accessed 2026-09-10 via local git).
- **M1:** Local coupling inventory over the private Prism, excluding tests and caches — organization, product, role, repository, privacy, measure, and scenario assumptions occur across most non-test files (measured 2026-09-10). The exact private vocabulary and absolute source path are retained locally and deliberately withheld; this is local-only supporting evidence, not a publicly reproducible measurement.
- **M2:** The private Prism validator suite ran 42 tests successfully; `rg --files src/skills` reports 58 `.mjs` scripts and no `.py` skill script in Agentic Development (measured 2026-09-10). The public repository-side runtime count is reproducible; the private suite path is intentionally withheld.

## Derived decision

Accepted as [ADR-0077](../adr/0077-adopt-generic-prism-evaluations.md), which defines `ad-prism`, its invocation class, optional project adapter, composition edges, generic validator set, and publication boundary.
