# Pragmatic Workflow: Engineering with LLMs

Engineering production code with LLMs. Agentic, not vibe coding.

**The Steve Rogers framing.** The LLM is the super-soldier serum. The engineer is Steve Rogers. The serum amplifies what the engineer already brings — solid bases, organization, investigation, care for quality, architecture, clean code, documentation, observability, maintainability. Add the serum to a disciplined engineer and you get Captain America. Add it to an undisciplined one and you get faster sloppy at scale. This document is those bases written down as principles. The discipline is the input; the LLM is the amplifier; the kit (skills, ADRs, audits, gates) is the scaffolding that keeps the discipline intact across sessions, agents, and projects.

**The principle behind the rest:** context engineering beats prompt engineering. Context is finite and decays as it fills — aim for the smallest set of high-signal tokens that gets the outcome. Operationally: one task per session, reset rather than extend. A long-running conversation crosses from the model's high-precision zone into a low-precision one as the cross-references multiply; smaller, deliberately-loaded contexts beat larger, accreted ones.

## TL;DR

Agents do not replace engineering. They speed up execution, but they make specification, context, validation, and review *more* important than before.

What to keep in mind:

1. **Context is the product.** The agent performs only as well as the context you give it. Small, clear, relevant context beats large, noisy context.
2. **Spec before code.** Define rules, constraints, architecture, acceptance criteria, and expected output before any implementation.
3. **Docs are for *why*, code for *what*.** History lives in git. Comments justify non-obvious choices, never restate the line.
4. **Real examples beat generic instructions.** "Follow this existing file" lands harder than "follow best practices."
5. **Always know the canonical path.** If you deviate, do it deliberately — never by forgetting the happy path exists.
6. **Outcome before path.** Give the finish line — raw input plus exact expected output — and let the agent build the algorithm to connect them.
7. **Pin load-bearing architectural decisions.** The agent will invent what isn't specified. Lock architecture into `AGENTS.md`.
8. **A good prompt has a stop condition.** Say what to do, what not to do, and where to stop.
9. **Plan before execution.** For non-trivial work: explore, plan, review the plan, implement, verify.
10. **Format helps, but does not save bad thinking.** Markdown, XML, YAML, and JSON only reduce ambiguity. They don't replace clarity.
11. **The bottleneck is judgment, not generation.** Agents generate fast; the hard part is catching what's almost right but wrong.
12. **Review needs distance.** The context that produced a solution tends to defend it. Review with a fresh context — diff plus spec, no history.
13. **Automation needs rails.** Hooks, tests, lint, CI, sandboxing, and permissions matter more than advisory text the agent can forget.
14. **Autonomy requires observability.** If the agent makes decisions, log the trajectory: tool calls, intermediate outputs, failures.
15. **Staged spikes when the technique is uncertain.** When the *how* is unknown — a library choice, a CV technique, a multi-stage transformation — break the problem into staged spikes against golden fixtures with per-stage debug artifacts.
16. **Diagnose with discipline.** For hard bugs and performance regressions: build a fast, deterministic feedback loop *before* hypothesising. Reproduce, then generate three to five ranked falsifiable hypotheses, then change one variable at a time. The feedback loop is the skill; everything else is mechanical.
17. **One task per session.** Context decays as it fills. Reset and reload only what the next task needs rather than extending a long conversation across many features. Smaller, deliberately-loaded contexts beat large, accreted ones.
18. **Slice vertically, not horizontally.** Decompose a spec into thin end-to-end paths through every layer (schema, API, UI, tests) rather than one layer at a time. Each slice ships demonstrable behavior; horizontal layer-stacks ship nothing on their own.
19. **Discipline scales with project maturity.** Same principles bind every project; the artifact set scales. A spike runs posture + research + audit; a regulated product adds spec / ADR / hooks / evals. Add ceremony only where it changes agent behavior; configure at init and reconfigure as the project matures.

> Working with agents means trading typing for technical direction. The value is in giving the right context, setting boundaries, validating the result, and keeping "almost right" out of production.

## 1. Spec-Driven Design

Define the rules before the agent writes a line. The temptation is to dump everything into `AGENTS.md` and hope it works — but bloat causes the model to ignore the file. Keep one topic per Markdown file: lean and focused.

There are two complementary frames for the artifacts the kit produces. The first is **purpose** — what each artifact is *for*. The second is **loading mechanism** — when each artifact reaches the agent's context.

### Five-layer artifact stack (purpose)

1. **Constitution** — `AGENTS.md` (operational guide) and `WORKFLOW.md` (engineering philosophy). Tells the agent how the project works and how the team thinks. Read every session.
2. **Domain** — `CONTEXT.md` at the repo root (or `CONTEXT-MAP.md` plus per-context `CONTEXT.md` files for multi-context repos). The project's ubiquitous language: canonical nouns, the aliases to avoid, the relationships between them, and the ambiguities that have already been resolved. Direct application of Domain-Driven Design (Evans, 2003) — when an agent and a human share the project's vocabulary, the agent uses fewer tokens to say more, and the code, tests, and conversation all converge on the same names. Created lazily — first term resolved triggers the file. ADR-0019 records the layer.
3. **Spec** — `doc/specs/NNNN-<slug>.md`. Feature-level requirements: who the feature is for, what it must do, the measurable success criteria, the explicit non-goals. One spec per feature; multiple tasks implement one spec; ADRs may be driven by spec constraints. Industry-aligned with [GitHub Spec Kit](https://github.com/github/spec-kit).
4. **Plan / Decisions** — `ARCHITECTURE.md` (system patterns and boundaries), `doc/adr/NNNN-*.md` (binding architectural decisions in Michael Nygard's pattern), `doc/tasks/NNNN-*.md` (per-work-unit plan with checkbox acceptance criteria). The *how* of building what the spec asked for.
5. **Code** — the implementation. Code is the primary documentation of behavior; comments justify non-obvious choices.

The five layers scale with project maturity (TL;DR #19 — Discipline scales). A spike or PoC profile may legitimately ship only Layers 1, 2, and 5 — adding Layers 3 and 4 to a 200-line experiment is ceremony that does not change agent behavior. (Domain — Layer 2 — earns its keep even at PoC because vocabulary drift starts on day one.) A team or regulated product runs all five. The kit's profiles (`poc`, `solo`, `team`, `mature`) configure which layers auto-install per project and are changeable as the project matures; the principles in this document bind every profile, only the artifact set differs.

### Three context types (loading mechanism)

- **Operational context is advisory.** `AGENTS.md` (or `CLAUDE.md` for Claude Code, which can mirror or import the same content via `@AGENTS.md`) tells the agent how to build, test, follow conventions, and where the security boundaries are. The agent reads it as a guide, not a contract. Open standard `AGENTS.md` is native in most agentic IDEs.
- **Canonical specs are constraints, not advice.** `DESIGN.md` (the visual contract — YAML tokens plus Markdown rationale, per Google Labs' open standard), `ARCHITECTURE.md`, ADRs in `doc/adr/*.md`, and feature specs in `doc/specs/*.md` are facts the agent must obey. If a token, pattern, or success criterion isn't declared here, it doesn't exist. The agent must never invent one.
- **On-demand context is `SKILL.md`.** Description loads at session start (the listing is capped at 1,536 characters per the spec) and body loads only when the skill is invoked. Use it for repeatable workflows or domain knowledge that shouldn't pay a token cost on every turn.

Three rules apply across all of the above:

- **Acceptance criteria must be measurable.** "Build a dashboard" fails. "Loads in under 2 seconds, shows 6 months of history, passes axe accessibility" succeeds.
- **Acceptance criteria must be durable, not procedural.** Describe the behavior and the interfaces — the contracts that survive a rename. Avoid file paths, line numbers, and "open file X and add line Y" wording in the criteria themselves; those rot the moment the implementation moves. Procedural execution steps belong in a separate section of the task file, not in the criteria.
- **Prune.** If removing a line wouldn't make the agent fail, cut it.

## 2. Docs vs. Code

Avoid putting implementation code in docs unless it's executable, generated, or a minimal API/contract surface. Docs define intent, constraints, contracts, and decisions; production logic lives in code.

The split is simple. **Docs are for the *why*** — decisions, not history. Git tracks history; docs explain the reasoning that won't survive otherwise. **Code is for the *what*** — clean naming and small units make logic self-evident, and the more your code does this work, the less your docs need to.

Comments are exceptions. They justify *why* a non-obvious choice was made — never *what* the line does. No commented-out code, and no orphan `TODO` or `FIXME`: every deferred item references a tracked work item — a GitHub Issue or a per-task file under `doc/tasks/NNNN-*.md`.

### Documentation Discipline

The agent's authoritative copy of the eight-rule documentation discipline lives in the `ad-philosophy` skill (`Documentation Discipline` section). The rules are summarized below for reference; the skill carries the full text agents read at session time. ADR-0008 records the canonical decision.

1. **Definitions and decisions only.** No speculation, history, or unfounded plans.
2. **No dates, version stamps, `DRAFT` markers, or changelogs in narrative documents.** Decision-record artifacts under `doc/adr/`, `doc/tasks/`, `doc/specs/` are exempt — their lifecycle fields are the auditability primitive.
3. **No emoji anywhere.**
4. **Business context first.**
5. **One scope per document. No duplication.**
6. **Code is the primary documentation of behavior.**
7. **No commented-out code; no orphan `TODO` / `FIXME` in source.** Every deferred item references a GitHub Issue or a `doc/tasks/NNNN-*.md` task.
8. **Tests are living documentation of behavior.**

The skill body explains the rationale per rule and the failure modes each counters (bloated `AGENTS.md`, README pages drifting into changelogs, decision artifacts diluted by speculation). Generator skills (`ad-bootstrap`, `ad-architecture`, `ad-spec`, `ad-task`, `ad-adr`, `ad-design`) reject violations at write time; `ad-audit` flags drift across narrative docs and decision-record artifacts on demand.

## 3. Format by Evidence

Structure reduces ambiguity, but format isn't magic. Pick the right one for the surface:

- **Markdown** for repo files (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`, specs, ADRs). Readable, diffable, agent-friendly.
- **XML-style tags** inside prompts when boundaries matter: `<instructions>`, `<context>`, `<examples>`, `<input>`, `<constraints>`, `<output_format>`.
- **YAML** for metadata, frontmatter, and declarative config.
- **JSON or schema** for machine-validated output.

Use XML when the prompt mixes instructions, retrieved context, examples, user input, and expected output — the separation pays off when there's noise to fight. Skip it for simple prompts; if Markdown headings or plain text are clear enough, use them.

No format is universally best. XML separation pays off most for autonomous agents, where the prompt has to land alone without conversational refinement; interactive use (Claude Code, Codex) tolerates loose Markdown. Claude appears to respond well to XML, plausibly an artifact of training. Treat this as a working hypothesis worth testing on your own target model and task before standardizing.

**Host-aware structured prompts.** Hosts that expose structured-prompt primitives — Claude Code's `AskUserQuestion` (multi-choice cards) and Plan Mode (plan-approval cards) — reduce ambiguity at confirmation gates more reliably than inline text. Prefer the structured primitive when the host supports it; fall back to numbered text otherwise. Codex has no equivalent today; its skills stay on numbered text. Skills carrying confirmation gates or multi-choice interview steps prescribe this preference (ADR-0014).

## 4–5. Research Before Implementation

Two sub-practices, joined into one indivisible pass: find the canonical baseline (Happy Path) and anchor it in project-specific examples (Ground in Real Patterns).

**Find the happy path.** Before implementing, ask: *"What is the canonical, idiomatic way to implement [X] in [stack]? Cite official docs. List common deviations and why people take them."* Mid-implementation: *"Are we still on the happy path? If we deviated, was it deliberate?"* Sometimes you can't follow the happy path — that's fine. Always know where it is and why you left it.

**Ground in real patterns.** Don't dump the codebase into context. Anchor the model in a specific, project-relevant example: *"Find an existing example of [similar feature]; use that exact structure."* Cite specific files, not "the codebase." Use just-in-time retrieval — pass paths or IDs and let the agent fetch via tools.

The kit ships `ad-ground` as the operational implementation (ADR-0010). It runs a four-source research pass — official docs, validated open-source examples, in-repo patterns, git history — joined by AND not OR, synthesizes the happy path with citations from each source, and gates any deviation behind an irrefutable justification before code is written.

## 6. Explore → Plan → Implement → Commit

For non-trivial changes, four phases:

1. **Explore (read-only).** Plan mode in your agent. Read, build a mental model, no edits.
2. **Plan.** Agent writes a Markdown plan. You edit before approving. For non-trivial multi-step work, structure the plan as a per-task file (`doc/tasks/<NNNN>-<slug>.md`) with checkbox acceptance criteria and execution steps — the agent toggles checkboxes as it works rather than rewriting paragraphs, keeping edits cheap and resumable across sessions. When a spec yields more than one task, **slice vertically**: each task is a thin end-to-end path through every layer the change touches (schema, API, UI, tests), not one layer at a time. The anti-pattern is *horizontal slicing* — "first the schema task, then the API task, then the UI task" — because nothing is shippable until the last task lands. Tracer-bullet vertical slices each ship a demonstrable behavior on their own ([Hunt & Thomas, *Pragmatic Programmer*, 1999](https://en.wikipedia.org/wiki/The_Pragmatic_Programmer)). Tag each task **AFK** (specified completely enough that an autonomous agent can land it) or **HITL** (needs human judgment, taste, design review, or external access) — the dimension is orthogonal to the lifecycle status and tells parallel agents which work is theirs to take.
3. **Implement.** Execute the approved plan; verify each step before moving to the next.
4. **Commit.** One logical change per commit.

Skip this for diffs you can describe in one sentence.

## 7. Action Commands With Stop Criteria

Leave no room for interpretation. Tell the model where to stop.

- **Avoid:** *"Here is the data. What do you think?"*
- **Prefer:** *"Analyze this data. List the top 3 bottlenecks. Stop there — don't propose fixes unless I ask."*

The stop criterion is as important as the action. Without it, the agent generalizes outward and you end up trimming output you didn't ask for.

## 8. Architectural Boundaries

Lock the load-bearing decisions into `AGENTS.md` or `CLAUDE.md` so the agent doesn't relitigate them every session:

> "Apply: **Clean Architecture** — isolate core logic from frameworks. **Small units** — single-responsibility, low indentation, no `else` chains. **Modular and testable** — no over-engineering."

The agent will follow what's specified and invent what isn't. Prefer specifying.

### Architectural vocabulary

Architectural drift accelerates with the agent's typing speed; the counter is shared vocabulary that names the shapes that matter. The kit adopts the canonical terms from John Ousterhout's *A Philosophy of Software Design* (2018) and Michael Feathers's *Working Effectively with Legacy Code* (2004), and uses them in `ARCHITECTURE.md`, ADRs, and architecture-touching skills (ADR-0020).

- **Module** — anything with an interface and an implementation; deliberately scale-agnostic (function, class, package, vertical slice).
- **Interface** — everything a caller must know to use the module correctly: types, invariants, ordering constraints, error modes, configuration, performance characteristics. *Not* just the type signature.
- **Implementation** — what's inside the module.
- **Depth** — leverage at the interface. A module is **deep** when a large amount of behavior sits behind a small interface; **shallow** when the interface is nearly as complex as the implementation. Depth is a property of the interface, not of line counts (rejected framing: depth-as-implementation-to-interface line ratio rewards padding).
- **Seam** (Feathers) — a place where behavior can be altered without editing in place; the *location* of an interface. Distinct from DDD's *bounded context*; the kit avoids "boundary" for this reason.
- **Adapter** — a concrete thing that satisfies an interface at a seam; a role, not a substance.
- **Leverage** — what callers get from depth: more capability per unit of interface they have to learn.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated at one place rather than spread across callers.

Three principles fall out of those terms:

- **Deletion test.** Imagine deleting the module. If complexity vanishes, the module was a pass-through (delete it). If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter is a hypothetical seam; two adapters make it real.** Don't introduce a seam unless something actually varies across it.

Skills that touch architecture (`ad-architecture`, `ad-adr`, the planned `ad-deepen`) use these terms verbatim, so suggestions and reviews land in a single language.

## 9. Outcome-Based Prompting (TDG)

Give the finish line first, not the path:

1. **Ground truth.** Raw input plus exact expected output.
2. **Command the implementation.** The algorithm that connects the two.
3. **Iterate by criterion.** Ask for three approaches; pick by *one* explicit criterion (readability, performance, *or* testability — not all three at once).
4. **Test Dependency Map, not procedural TDD.** Don't tell the agent "do TDD" — tell it *which* tests cover the file. *"Before modifying X.ts, list which tests cover it. Run. Modify. Run. If none cover it, write one first."*

## 10. Reviewer With Fresh Context

The agent that wrote the code is biased about it. The same reasoning that produced the solution defends the solution.

> *"Open a fresh agent with no history. Give it only the diff and the spec. Review as a strict Senior reviewing a Junior PR. Be ruthless about bugs, coupling, edge cases."*

In Claude Code, this means a subagent (the `Task` tool, or a custom `.claude/agents/*.md` file). Without that infrastructure: `/clear`, new context, paste diff plus spec.

## 11. Quality Gates: Determinism Over Persuasion

`AGENTS.md` is advisory. Hooks and CI are deterministic. The difference matters: text you write hoping the agent obeys is not the same as a script that exits non-zero when a rule is violated.

- **Hooks for inviolable rules** (formatter, secret-scan, lint). Not text the agent might forget.
- **Pre-commit fast** (lint, format, secrets); **pre-push thorough** (build, unit tests, integration tests). Slow pre-commits push devs to `--no-verify`.
- **Visual or E2E for UI.** Type-check confirms the code compiles, not that the feature works. Open the browser (Claude in Chrome, DevTools MCP).
- **Sandboxing plus scoped permissions** for autonomy: allowlists, OS sandbox, classifier-reviewed auto mode. The bigger the autonomy, the more rails you need.
- **Never bypass.** No `--no-verify`. Failing tests means not ready.

## 12. The Bottleneck Is Discrimination, Not Generation

Modern agents handle most routine implementation. The work has shifted to catching what they got wrong.

Industry data underlines the wall. Recent JetBrains and Stack Overflow developer surveys show a majority frustration with "AI solutions that are almost right, but not quite," and a near-majority report that debugging AI-generated code costs more time than writing it from scratch. See Sources for the surveys.

The takeaway: §10 (Reviewer) and §11 (Quality Gates) are not optional. Skipping them is where bug density grows.

Per the Steve Rogers framing in the preamble: the serum cannot manufacture discrimination — it amplifies whatever discrimination the engineer already brings. The kit's job is to encode discrimination into the agent's context (specs, ADRs, fresh-context reviews, deterministic gates) so the amplification compounds in the disciplined direction even when the engineer is sleepy, rushed, or handing off to another collaborator.

**Two roles of judgment, not one.** Agent review (§10 fresh-context) and the deterministic gates (§11) catch the *mechanical* failures: bugs, coupling, edge cases, broken contracts, missed branches. They do not — and should not be expected to — catch what is left after that: taste, product judgment, visual feel, whether the feature actually solves the user's problem. Those require a human to look at the running thing and form an opinion. Skipping fresh-context review because "the engineer will catch it" wastes engineer attention on mechanical failures the agent should have caught. Skipping the human pass because "the agent reviewed it" ships features that compile, pass, and feel wrong. The two are complements, not substitutes.

## 13. Evals for Anything Autonomous

If your agent is making decisions on its own, you need evals. A few principles:

- **Trajectory beats final output.** Output-only eval hides failures in tool calls, retrieval, and intermediate decisions that the final answer can mask. Log tool calls and intermediate states.
- **Observability before evals.** Get traces first; build the eval suite on top.
- **LLM-as-judge for breadth, humans for depth.**
- **The unit under test is prompt + scaffold + model.** Changing any of the three is a release.

## 14. Staged Spikes With Golden Fixtures

Sometimes the spec is clear but the *technique* is uncertain — you don't know which library, which CV approach, which decomposition. Don't ask the agent to solve it end-to-end. Break the problem into staged spikes and validate each one against curated ground truth.

**Spike vs. prototype.** Use a *spike* (this section) when the unknown is *how* — the technique itself is uncertain across multiple plausible approaches and validation needs golden fixtures with per-stage debug. Use a *prototype* when the unknown is *what should this feel like* — UI/UX direction, the shape of an interaction, whether a state model holds up under play. Different question, different artifact, different success criterion.

The flow has four parts:

1. **Discovery first.** Ask the agent to list canonical approaches grounded in official docs and real examples. Pick one by an explicit criterion. The output of this step is information, not code.
2. **Golden fixture.** Curate inputs with rich expected outputs. For computer vision, that means bounding boxes, sizes, lighting, difficulty tags, edge cases — not just "three circles." Keep the fixture as JSON keyed by input path.
3. **Pipeline with gates.** One technique per stage; each gate emits a debug artifact: an image to `debug/01-preprocess/`, intermediate JSON, a log row — whatever makes the stage's output inspectable.
4. **Two layers of evaluation.** End-to-end against the fixture, *and* per-stage debug to locate where things diverged when it failed.

**Why this beats end-to-end:** §9 (TDG) assumes the path is known. When you don't know it, end-to-end evaluation tells you *that* it failed, not *where*. Stage-level artifacts make the divergence inspectable, so you fix the right gate instead of guessing at the final output.

**When to use it:** the unknown is *how* — a library choice, a CV technique, a multi-stage transformation. Skip it when the *how* is routine.

The named components (spike, golden datasets, stage-segmented error analysis, trajectory evaluation, visual CV debugging) each have their own lineage under Sources; the combination is the contribution.

## 15. Diagnose With Discipline

For hard bugs and performance regressions, the failure mode is jumping to hypotheses before there is a way to check them. The discipline below is the counter, grounded in standard debugging practice (Kernighan & Pike, *The Practice of Programming*).

### Phase 1 — Build a feedback loop

This is *the* skill. Everything else is mechanical. A fast, deterministic, agent-runnable pass/fail signal for the bug is what makes bisection, hypothesis-testing, and instrumentation effective; without one, no amount of staring at code converges. Spend disproportionate effort here.

Loop-construction techniques, in roughly increasing cost:

1. Failing test at whatever seam reaches the bug — unit, integration, e2e.
2. Curl / HTTP script against a running dev server.
3. CLI invocation with a fixture input, diffing stdout against a known-good snapshot.
4. Headless browser script (Playwright / Puppeteer) — drives the UI, asserts on DOM, console, network.
5. Replay a captured trace — saved network request, payload, event log — through the code path in isolation.
6. Throwaway harness — a minimal subset of the system that exercises the bug code path with one function call.
7. Property / fuzz loop — when the bug is "sometimes wrong output", run many random inputs and look for the failure mode.
8. Bisection harness — automate "boot at state X, check, repeat" so `git bisect run` works.
9. Differential loop — run the same input through two versions or two configs and diff outputs.
10. HITL bash script — last resort. Structure the human's clicks so the loop is still repeatable.

Treat the loop as a product: faster, sharper signal, more deterministic, every iteration. A two-second deterministic loop is a debugging superpower; a thirty-second flaky loop is barely better than no loop.

For non-deterministic bugs, the goal is not a clean repro but a *higher reproduction rate* — loop the trigger, parallelize, narrow timing windows, inject sleeps. A 50%-flake is debuggable; 1% is not.

If a loop genuinely cannot be built, stop and say so — do not proceed to hypotheses.

### Phase 2 — Reproduce

Run the loop. Confirm the failure matches the user's description (not a different failure that happens to be nearby), reproduces consistently (or at a high enough rate), and the exact symptom is captured for later phases to verify the fix against. Wrong bug = wrong fix.

### Phase 3 — Hypothesise

Generate **three to five ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes — *"if X is the cause, then changing Y will make the bug disappear / changing Z will make it worse."* If you cannot state the prediction, the hypothesis is a vibe; sharpen it or discard it.

Show the ranked list to the user before testing. Domain knowledge often re-ranks instantly ("we just deployed a change to #3"), or marks hypotheses already ruled out — a cheap checkpoint, big time saver.

### Phase 4 — Instrument

Each probe maps to a specific prediction from Phase 3. Change one variable at a time. Log enough that the result is unambiguous — a single instrument that confirms two predictions at once tends to confirm whichever one you were rooting for.

### Phase 5 — Fix and regression-test

Apply the fix. Re-run the Phase-1 loop and confirm the captured symptom is gone. Promote the loop's check into a permanent test that lives next to the code so the same failure mode cannot return silently.

---

These are starting points. Prune what doesn't fit your codebase.

## Provenance

This guide is operational practice, not theory. Most principles come from years of shipping production code, with and without LLMs; some were in use before the industry converged on labels for them, and once a label landed the kit adopted it to make the conversation easier.

§14 (Staged Spikes With Golden Fixtures) is the author's own working technique — each component (spike, golden dataset, stage-segmented error analysis, trajectory evaluation, visual CV debugging) has its own lineage in the literature under Sources; the combination — discovery → fixture → staged pipeline with debug artifacts → two-layer evaluation — is original to this kit.

A cross-pollination pass against [Matt Pocock's `mattpocock/skills`](https://github.com/mattpocock/skills) — a separate body of agent-engineering practice grounded in the same canonical literature (DDD, *Pragmatic Programmer*, Ousterhout, Feathers, Beck) — surfaced principles that earned their place on independent merits: the **Domain layer** (§1 Layer 2, ADR-0019), the **architectural vocabulary** (§8, ADR-0020), **Diagnose with discipline** (§15, ADR-0021), **vertical slicing** and **HITL/AFK tagging** (§6), and **AI mechanical / human judgment** (§12). Where Pocock's framing sharpened our own, the borrowed phrasing is acknowledged inline; everything else stays kit-original.

External claims (specific percentages, named frameworks) are cited under Sources. Everything else is operational guidance from practice or synthesis across that material — a working model, refined over time, not academic claim.

## Sources

**§1 — Spec-Driven Design**
- DESIGN.md spec (Google Labs): https://github.com/google-labs-code/design.md
- SKILL.md spec (Anthropic): https://code.claude.com/docs/en/skills
- Domain-Driven Design (Evans, 2003) — *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Source for the Domain layer (`CONTEXT.md`) and the ubiquitous-language discipline.

**§6 — Explore → Plan → Implement → Commit**
- *The Pragmatic Programmer* (Hunt & Thomas, 1999), tracer-bullet metaphor — source for the vertical-slicing principle.

**§8 — Architectural Boundaries**
- *A Philosophy of Software Design* (Ousterhout, 2018) — Module / Interface / Depth vocabulary; rejected framing of depth-as-line-ratio.
- *Working Effectively with Legacy Code* (Feathers, 2004) — Seam vocabulary.

**§12 — The Bottleneck Is Discrimination, Not Generation**
- JetBrains *DevEcosystem 2025*: https://devecosystem-2025.jetbrains.com/artificial-intelligence
- Stack Overflow *2025 Developer Survey* (AI section): https://survey.stackoverflow.co/2025/ai

**§14 — Staged Spikes With Golden Fixtures**
- Spike (XP) — Wikipedia: https://en.wikipedia.org/wiki/Spike_(software_development)
- Golden datasets — Arize: https://arize.com/resource/golden-dataset/
- Stage-segmented error analysis — Hamel Husain's evals FAQ: https://hamel.dev/blog/posts/evals-faq/
- Trajectory evaluation — LangSmith docs: https://docs.langchain.com/langsmith/trajectory-evals
- Visual CV debugging — OpenCV cvv tutorial: https://docs.opencv.org/3.4/d7/dcf/tutorial_cvv_introduction.html

**§15 — Diagnose With Discipline**
- *The Practice of Programming* (Kernighan & Pike, 1999) — chapters on debugging and testing.
- Falsifiability framing — Karl Popper, *The Logic of Scientific Discovery* (1959).
