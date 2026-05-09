# Pragmatic Workflow: Engineering with LLMs

Engineering production code with LLMs. Agentic, not vibe coding.

**The principle behind the rest:** context engineering beats prompt engineering. Context is finite and decays as it fills — aim for the smallest set of high-signal tokens that gets the outcome.

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

> Working with agents means trading typing for technical direction. The value is in giving the right context, setting boundaries, validating the result, and keeping "almost right" out of production.

## 1. Spec-Driven Design

Define the rules before the agent writes a line. The temptation is to dump everything into `AGENTS.md` and hope it works — but bloat causes the model to ignore the file. Keep one topic per Markdown file: lean and focused. And treat the three kinds of context as distinct artifacts with distinct jobs.

**Operational context is advisory.** `AGENTS.md` (or `CLAUDE.md` for Claude Code, which can mirror or import the same content via `@AGENTS.md`) tells the agent how to build, test, follow conventions, and where the security boundaries are. The agent reads it as a guide, not a contract. Open standard `AGENTS.md` is native in most agentic IDEs.

**Canonical specs are constraints, not advice.** `DESIGN.md` (the visual contract — YAML tokens plus Markdown rationale, per Google Labs' open standard), `ARCHITECTURE.md` (system patterns and boundaries), and ADRs in `doc/adr/*.md` (Michael Nygard's pattern, with status lifecycle and superseded markers) are facts the agent must obey. If a token or pattern isn't declared here, it doesn't exist. The agent must never invent one.

**On-demand context is `SKILL.md`.** Description loads at session start (the listing is capped at 1,536 characters per the spec) and body loads only when the skill is invoked. Use it for repeatable workflows or domain knowledge that shouldn't pay a token cost on every turn.

Two rules apply across all three:

- **Acceptance criteria must be measurable.** "Build a dashboard" fails. "Loads in under 2 seconds, shows 6 months of history, passes axe accessibility" succeeds.
- **Prune.** If removing a line wouldn't make the agent fail, cut it.

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

No format is universally best. **An observation from my practice, not benchmarked:** I've seen consistent gains when shifting prompts to XML — most noticeably with autonomous agents, where the prompt has to land alone without conversational refinement. Direct interactive use (Claude Code, Codex) tolerates loose Markdown; unattended agents don't. Claude in particular seems to respond well to XML, which I attribute to its training, but I haven't benchmarked it. Treat this as a starting hypothesis worth testing on your own target model and task before standardizing.

## 4. Find the Happy Path

Before implementing, ask:

> *"What is the canonical, idiomatic way to implement [X] in [stack]? Cite official docs. List common deviations and why people take them."*

Then check continuously, especially mid-implementation:

> *"We are at step Y. Are we still on the happy path? If we deviated, was it deliberate?"*

Sometimes you can't follow the happy path — that's fine. But always know where it is and why you left it.

## 5. Ground in Real Patterns

Don't dump the codebase into context. Anchor the model in a specific, project-relevant example.

> *"Find an existing example of [similar feature]; use that exact structure."*

Cite specific files, not "the codebase." Use just-in-time retrieval: pass paths or IDs and let the agent fetch via tools when it needs to read them.

## 6. Explore → Plan → Implement → Commit

For non-trivial changes, four phases:

1. **Explore (read-only).** Plan mode in your agent. Read, build a mental model, no edits.
2. **Plan.** Agent writes a Markdown plan. You edit before approving. For non-trivial multi-step work, structure the plan as a per-task file (`doc/tasks/<NNNN>-<slug>.md`) with checkbox acceptance criteria and execution steps — the agent toggles checkboxes as it works rather than rewriting paragraphs, keeping edits cheap and resumable across sessions.
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

Two 2025 industry surveys point at the same wall. JetBrains' DevEcosystem 2025 reports that only **44%** of developers have AI fully or partially integrated into their workflow. Stack Overflow's 2025 Developer Survey adds: **66%** of developers cite "AI solutions that are almost right, but not quite" as their top frustration, and **45%** say debugging AI-generated code is more time-consuming.

The takeaway: §10 (Reviewer) and §11 (Quality Gates) are not optional. Skipping them is where bug density grows.

## 13. Evals for Anything Autonomous

If your agent is making decisions on its own, you need evals. A few principles:

- **Trajectory beats final output.** Output-only eval hides failures in tool calls, retrieval, and intermediate decisions that the final answer can mask. Log tool calls and intermediate states.
- **Observability before evals.** Get traces first; build the eval suite on top.
- **LLM-as-judge for breadth, humans for depth.**
- **The unit under test is prompt + scaffold + model.** Changing any of the three is a release.

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

## How this guide was built

This is not theory I read and copied. Most of the practices here come from years of shipping production code, with and without LLMs.

**Patterns I was already using when I drafted this guide.** Several of them I used before knowing they had established names; once the industry converged on a label, I adopted it to make the conversation easier: **Spec-Driven Design** (§1), **Docs-vs-Code separation** (§2), **pattern matching by real examples** (§5), **explicit Action Commands** (§7), **Architectural Boundaries** (§8), **Outcome-Based Prompting / TDG** (§9), the **senior-reviewer technique** (§10), and **deterministic Quality Gates** (§11).

**The XML observation in §3** is also drawn from practice, not benchmarks. It's a hypothesis worth testing on your own setup, not a settled finding.

**Practices that came in through iteration on this guide.** They weren't in my original draft, but each matches a problem I'd already encountered or a habit I'd only formalized loosely: **Find the Happy Path** (§4), **Explore → Plan → Implement → Commit** (§6), **The Bottleneck Is Discrimination, Not Generation** (§12 — the 2025 industry statistics ground the principle, they didn't generate it), and **Evals for Anything Autonomous** (§13).

**§14 (Staged Spikes With Golden Fixtures) is my own working technique.** I haven't seen it documented end-to-end as a single named pattern, but each component (spike, golden dataset, stage-segmented error analysis, trajectory evaluation, visual CV debugging) has its own lineage in the literature listed under Sources. The combination — discovery → fixture → staged pipeline with debug artifacts → two-layer evaluation — is how I attack problems where the *technique* itself is uncertain.

External claims (specific percentages, named frameworks) are cited under Sources. Everything else is operational guidance from practice or synthesis across that material — a working model, refined over time, not academic claim.

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
