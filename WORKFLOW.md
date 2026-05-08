# Pragmatic Workflow: Engineering with LLMs

Engineering production code with LLMs. Agentic, not vibe coding.

**The principle behind the rest:** context engineering beats prompt engineering. Context is finite and decays as it fills. The goal is the *smallest* set of high-signal tokens that gets the outcome — not the longest, not the most decorative, just enough.

## TL;DR

Agents do not replace engineering. They speed up execution, but they make specification, context, validation, and review *more* important than before.

Ten things to keep in mind:

1. **Context is the product.** The agent performs only as well as the context you give it. Small, clear, relevant context beats large, noisy context.
2. **Spec before code.** Define rules, constraints, architecture, acceptance criteria, and expected output before any implementation.
3. **Real examples beat generic instructions.** "Follow this existing file" lands harder than "follow best practices."
4. **A good prompt has a stop condition.** Say what to do, what not to do, and where to stop.
5. **Plan before execution.** For non-trivial work: explore, plan, review the plan, implement, verify.
6. **Format helps, but does not save bad thinking.** Markdown, XML, YAML, and JSON only reduce ambiguity. They don't replace clarity.
7. **The bottleneck is judgment, not generation.** Agents generate fast; the hard part is catching what's almost right but wrong.
8. **Review needs distance.** The context that produced a solution tends to defend it. Review with a fresh context — diff plus spec, no history.
9. **Automation needs rails.** Hooks, tests, lint, CI, sandboxing, and permissions matter more than advisory text the agent can forget.
10. **Autonomy requires observability.** If the agent makes decisions, log the trajectory: tool calls, intermediate outputs, failures.

> Working with agents means trading typing for technical direction. The value is in giving the right context, setting boundaries, validating the result, and keeping "almost right" out of production.

## 1. Spec-Driven Design

Define the rules before the agent writes a line. The temptation is to dump everything into `AGENTS.md` and hope it works — that always backfires. Treat your context files as having distinct purposes, because they do.

There are three kinds of context, each with a different job.

**Operational context is advisory.** `AGENTS.md` (or `CLAUDE.md` for Claude Code, which can mirror or import the same content via `@AGENTS.md`) tells the agent how to build, test, and lint, and where the security boundaries are. The agent reads it as a guide, not a contract.

**Canonical specs are constraints, not advice.** `DESIGN.md` (the visual contract — YAML tokens plus Markdown rationale, per Google Labs' open standard), `ARCHITECTURE.md` (system patterns and boundaries), and ADRs in `doc/adr/*.md` (Michael Nygard's pattern, with status lifecycle and superseded markers) are facts the agent must obey. If a token or pattern isn't declared here, it doesn't exist. The agent must never invent one.

**On-demand context is `SKILL.md`.** Description loads at session start (the listing is capped at 1,536 characters per the spec) and body loads only when the skill is invoked. Use it for repeatable workflows or domain knowledge that shouldn't pay a token cost on every turn.

Two rules apply across all three:

- **Acceptance criteria must be measurable.** "Build a dashboard" fails. "Loads in under 2 seconds, shows 6 months of history, passes axe accessibility" succeeds.
- **Prune.** If removing a line wouldn't make the agent fail, cut it. Bloat causes the model to ignore the file entirely — over-explanation reads like noise, not law.

## 2. Docs vs. Code

Avoid putting implementation code in docs unless it's executable, generated, or a minimal API/contract surface. Docs define intent, constraints, contracts, and decisions; production logic lives in code.

The split is simple. **Docs are for the *why*** — decisions, not history. Git tracks history; docs explain the reasoning that won't survive otherwise. **Code is for the *what*** — clean naming and small units make logic self-evident, and the more your code does this work, the less your docs need to.

Comments are exceptions. They justify *why* a non-obvious choice was made — never *what* the line does. No commented-out code, and no orphan `TODO` or `FIXME`: every deferred item references an issue, ADR, or explicit follow-up.

## 3. Format by Evidence

Structure reduces ambiguity, but format isn't magic. Pick the right one for the surface:

- **Markdown** for repo files (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`, specs, ADRs). Readable, diffable, agent-friendly.
- **XML-style tags** inside prompts when boundaries matter: `<instructions>`, `<context>`, `<examples>`, `<input>`, `<constraints>`, `<output_format>`.
- **YAML** for metadata, frontmatter, and declarative config.
- **JSON or schema** for machine-validated output.

Use XML when the prompt mixes instructions, retrieved context, examples, user input, and expected output — the separation pays off when there's noise to fight. Skip it for simple prompts; if Markdown headings or plain text are clear enough, use them.

No format is universally best. Claude documents XML heavily, while OpenAI and Gemini support both Markdown and XML-style structure. Standardize only after testing on the target model and task.

## 4. Find the Happy Path

Before implementing, ask:

> *"What is the canonical, idiomatic way to implement [X] in [stack]? Cite official docs. List common deviations and why people take them."*

Then check continuously, especially mid-implementation:

> *"We are at step Y. Are we still on the happy path? If we deviated, was it deliberate?"*

Sometimes you can't follow the happy path — that's fine. But you should always know where it is and why you left it. "I forgot it existed" is the worst answer.

## 5. Ground in Real Patterns

Don't dump the codebase into context. Anchor the model in a specific, project-relevant example.

> *"Find an existing example of [similar feature]; use that exact structure."*

Cite specific files, not "the codebase." And use just-in-time retrieval: pass paths or IDs and let the agent fetch via tools when it needs to read them. Pre-loading what *might* be useful is just bloat.

## 6. Explore → Plan → Implement → Commit

For non-trivial changes, four phases:

1. **Explore (read-only).** Plan mode in your agent. Read, build a mental model, no edits.
2. **Plan.** Agent writes a Markdown plan. You edit before approving.
3. **Implement.** Execute the approved plan; verify each step before moving to the next.
4. **Commit.** One logical change per commit.

Skip this for diffs you can describe in one sentence. The ceremony has to earn its keep.

## 7. Action Commands With Stop Criteria

Leave no room for interpretation. Tell the model where to stop.

- **Avoid:** *"Here is the data. What do you think?"*
- **Prefer:** *"Analyze this data. List the top 3 bottlenecks. Stop there — don't propose fixes unless I ask."*

The stop criterion is as important as the action. Without it, the agent generalizes outward and you end up trimming output you didn't ask for.

## 8. Architectural Boundaries

Lock the load-bearing decisions into `AGENTS.md` or `CLAUDE.md` so the agent doesn't relitigate them every session:

> "Apply: **Clean Architecture** — isolate core logic from frameworks. **Small units** — single-responsibility, low indentation, no `else` chains. **Modular and testable** — no over-engineering."

The agent will follow what's specified and invent what isn't. Prefer specifying.

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
- **Pre-commit fast** (lint, format, secrets); **pre-push thorough** (build, unit tests, integration tests). Slow pre-commits push devs to `--no-verify`, defeating the point.
- **Visual or E2E for UI.** Type-check confirms the code compiles, not that the feature works. Open the browser (Claude in Chrome, DevTools MCP).
- **Sandboxing plus scoped permissions** for autonomy: allowlists, OS sandbox, classifier-reviewed auto mode. The bigger the autonomy, the more rails you need.
- **Never bypass.** No `--no-verify`. Failing tests means not ready. The point of a gate is that it can't be talked around.

## 12. The Bottleneck Is Discrimination, Not Generation

Modern agents handle most routine implementation. The work has shifted to catching what they got wrong.

Two 2025 industry surveys point at the same wall. JetBrains' DevEcosystem 2025 reports that only **44%** of developers have AI fully or partially integrated into their workflow. Stack Overflow's 2025 Developer Survey is sharper: **66%** of developers cite "AI solutions that are almost right, but not quite" as their top frustration, and **45%** say debugging AI-generated code is more time-consuming.

The takeaway: §10 (Reviewer) and §11 (Quality Gates) are not optional. Skipping them is where bug density grows.

## 13. Evals for Anything Autonomous

If your agent is making decisions on its own, you need evals. A few principles:

- **Trajectory beats final output.** Output-only eval hides failures in tool calls, retrieval, and intermediate decisions that the final answer can mask. Log tool calls and intermediate states.
- **Observability before evals.** Get traces first; build the eval suite on top. You can't evaluate what you can't see.
- **LLM-as-judge for breadth, humans for depth.** Automated graders scale; humans catch what graders miss.
- **The unit under test is prompt + scaffold + model.** Changing any of the three is a release. Treat them as one tested object.

## 14. Staged Spikes With Golden Fixtures

Sometimes the spec is clear but the *technique* is uncertain — you don't know which library, which CV approach, which decomposition. Don't ask the agent to solve it end-to-end. Break the problem into staged spikes and validate each one against curated ground truth.

The flow has four parts:

1. **Discovery first.** Ask the agent to list canonical approaches grounded in official docs and real examples. Pick one by an explicit criterion. The output of this step is information, not code.
2. **Golden fixture.** Curate inputs with rich expected outputs. For computer vision, that means bounding boxes, sizes, lighting, difficulty tags, edge cases — not just "three circles." Keep the fixture as JSON keyed by input path.
3. **Pipeline with gates.** One technique per stage; each gate emits a debug artifact: an image to `debug/01-preprocess/`, intermediate JSON, a log row — whatever makes the stage's output inspectable.
4. **Two layers of evaluation.** End-to-end against the fixture, *and* per-stage debug to locate where things diverged when it failed.

**Why this beats end-to-end:** §9 (TDG) assumes the path is known. When you don't know it, end-to-end evaluation tells you *that* it failed, not *where*. Stage-level artifacts make the divergence inspectable, so you fix the right gate instead of guessing at the final output.

**When to use it:** the unknown is *how* — a library choice, a CV technique, a multi-stage transformation. Skip it when the *how* is routine.

This is a combination of established practices, not new terminology: spike (XP), golden datasets, stage-segmented error analysis, trajectory evaluation, and visual debugging in CV pipelines.

---

These are starting points. Prune what doesn't fit your codebase.

## Sources

**§1 — Spec-Driven Design**
- DESIGN.md spec (Google Labs): https://github.com/google-labs-code/design.md
- SKILL.md spec (Anthropic): https://code.claude.com/docs/en/skills

**§12 — The Bottleneck Is Discrimination, Not Generation**
- JetBrains *DevEcosystem 2025*: https://devecosystem-2025.jetbrains.com/artificial-intelligence
- Stack Overflow *2025 Developer Survey* (AI section): https://survey.stackoverflow.co/2025/ai

**§14 — Staged Spikes With Golden Fixtures**
- Spike (XP) — Wikipedia: https://en.wikipedia.org/wiki/Spike_(software_development)
- Golden datasets — Arize: https://arize.com/resource/golden-dataset/
- Stage-segmented error analysis — Hamel Husain's evals FAQ: https://hamel.dev/blog/posts/evals-faq/
- Trajectory evaluation — LangSmith docs: https://docs.langchain.com/langsmith/trajectory-evals
- Visual CV debugging — OpenCV cvv tutorial: https://docs.opencv.org/3.4/d7/dcf/tutorial_cvv_introduction.html
