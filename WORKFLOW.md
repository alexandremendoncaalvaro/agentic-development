# Pragmatic Workflow: Engineering with LLMs

Engineering production code with LLMs. Agentic, not vibe coding.

**Principle: context engineering beats prompt engineering.** Context is finite and decays as it fills — aim for the smallest set of high-signal tokens that gets the outcome.

## TL;DR
The core idea:
**Agents do not replace engineering. They speed up execution, but make specification, context, validation, and review more important.**

What you need to keep in mind:

1. **Context is the product**
   The agent performs only as well as the context you give it. Small, clear, relevant context beats large, noisy context.

2. **Spec before code**
   Define rules, constraints, architecture, acceptance criteria, and expected output before implementation.

3. **Real examples beat generic instructions**
   “Follow this existing file” is stronger than “follow best practices.”

4. **A good prompt has a stop condition**
   Say exactly what to do, what not to do, and where to stop.

5. **Plan before execution**
   For non-trivial work: explore, plan, review the plan, implement, verify.

6. **Format helps, but does not save bad thinking**
   Markdown, XML, YAML, and JSON only reduce ambiguity. They do not replace clarity.

7. **The bottleneck is judgment, not generation**
   Agents generate fast. The hard part is catching what is almost right, but wrong.

8. **Review needs distance**
   The same context that produced the solution tends to defend it. Review with a fresh context: diff + spec.

9. **Automation needs rails**
   Hooks, tests, lint, CI, sandboxing, and permissions matter more than advisory text.

10. **Autonomy requires observability**
    If the agent makes decisions, log the trajectory, tool calls, intermediate outputs, and failures.

Shortest version:

> Working with agents means trading typing for technical direction.
> The value is in giving the right context, setting boundaries, validating the result, and keeping “almost right” out of production.


## 1. Spec-Driven Design

Define the rules before the agent writes a line.

* **One topic per Markdown file.** Lean. Focused.
* **Three kinds of context — distinct purposes. `AGENTS.md` is not a junk drawer.**
  * **Operational** (advisory): `AGENTS.md` / `CLAUDE.md` — build, test, conventions, security boundaries. Open standard `AGENTS.md` is native in most agentic IDEs; Claude Code reads `CLAUDE.md` (symlink or `@AGENTS.md` import to share).
  * **Canonical specs** (constraints, not advisory): `DESIGN.md` (visual contract — [Google Labs open standard](https://github.com/google-labs-code/design.md), YAML tokens + Markdown rationale), `ARCHITECTURE.md` (system patterns and boundaries), `doc/adr/*.md` (Nygard decisions; mark superseded). Token/pattern not declared = doesn't exist; the agent never invents.
  * **On-demand**: `SKILL.md` — domain knowledge or repeatable workflows. ~100 tokens of metadata at startup, body loaded when invoked.
* **Acceptance criteria must be measurable.** *"Build a dashboard"* fails. *"…loads <2s, 6 months of history, passes axe"* succeeds.
* **Prune.** Test: *"if removing this line wouldn't make the agent fail, cut it."* Bloat causes the model to ignore the file.

## 2. Docs vs. Code

* **Avoid implementation code in docs** unless it's executable, generated, or a minimal API/contract surface. Docs define intent, constraints, contracts, decisions; production logic lives in code.
* **Docs are for the *why*.** Decisions, not history. Git tracks history.
* **Code is the *what*.** Clean naming and small units make logic self-evident.
* **Comments are exceptions.** *Why* a non-obvious choice was made — never *what* the line does. No commented-out code; no orphan `TODO`/`FIXME` — every deferred item references an issue, ADR, or explicit follow-up.

## 3. Format by Evidence

Structure reduces ambiguity. Format is not magic.

* **Markdown** for repo files (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`, specs, ADRs). Readable, diffable, agent-friendly.
* **XML-style tags** inside prompts only when boundaries matter: `<instructions>`, `<context>`, `<examples>`, `<input>`, `<constraints>`, `<output_format>`.
* **YAML** for metadata/frontmatter and declarative config.
* **JSON / schema** for machine-validated output.

Use XML when the prompt mixes instructions, retrieved context, examples, user input, or expected output.

Skip XML for simple prompts. If Markdown headings or plain text are clear enough, use them.

No format is universally best. Claude documents XML heavily; OpenAI and Gemini support both Markdown and XML-style structure. Standardize only after testing on the target model and task.

## 4. Find the Happy Path

> *"What is the canonical, idiomatic way to implement [X] in [stack]? Cite official docs. List common deviations and why people take them."*

Then check continuously:

> *"We are at step Y. Are we still on the happy path? If we deviated, was it deliberate?"*

Sometimes you can't follow it — but always know where it is and why you left.

## 5. Ground in Real Patterns

Don't dump the codebase into context. Anchor the model in a project-specific example.

* *"Find an existing example of [similar feature]; use that exact structure."*
* **Cite specific files**, not "the codebase".
* **Just-in-time retrieval.** Pass paths/IDs; let the agent fetch via tools when needed.

## 6. Explore → Plan → Implement → Commit

For non-trivial changes:

1. **Explore (read-only).** Plan mode. Agent reads, builds a model, no edits.
2. **Plan.** Agent writes a Markdown plan. You edit before approving.
3. **Implement.** Execute the approved plan; verify each step.
4. **Commit.** One logical change per commit.

Skip for diffs you can describe in one sentence.

## 7. Action Commands With Stop Criteria

Leave no room for interpretation. Tell the model where to stop.

* **Avoid:** *"Here is the data. What do you think?"*
* **Prefer:** *"Analyze this data. List the top 3 bottlenecks. Stop there — don't propose fixes unless I ask."*

The stop criterion is as important as the action.

## 8. Architectural Boundaries

Put in `AGENTS.md`/`CLAUDE.md`:

> "Apply: **Clean Architecture** — isolate core logic from frameworks. **Small units** — single-responsibility, low indentation, no `else` chains. **Modular and testable** — no over-engineering."

## 9. Outcome-Based Prompting (TDG)

Give the finish line first, not the path.

1. **Ground truth.** Raw input + exact expected output.
2. **Command the implementation.** Algorithm that connects the two.
3. **Iterate by criterion.** Ask for 3 approaches; pick by *one* explicit criterion (readability / performance / testability).
4. **Test Dependency Map, not procedural TDD.** *"Do TDD"* increases regressions in benchmarks. Instead: *"Before modifying X.ts, list which tests cover it. Run. Modify. Run. If none cover it, write one first."*

## 10. Reviewer With Fresh Context

The agent that wrote the code is biased about it.

> *"Open a fresh agent with no history. Give it only the diff and the spec. Review as a strict Senior reviewing a Junior PR. Be ruthless about bugs, coupling, edge cases."*

In Claude Code: subagent (`Task` tool, custom `.claude/agents/*.md`). Otherwise: `/clear`, new context, paste diff + spec.

## 11. Quality Gates: Determinism Over Persuasion

`AGENTS.md` is advisory. Hooks and CI are deterministic.

* **Hooks** for inviolable rules (formatter, secret-scan, lint). Not text the agent might forget.
* **Pre-commit fast** (lint, format, secrets). **Pre-push thorough** (build + unit + integration). Slow pre-commits push devs to `--no-verify`.
* **Visual/E2E for UI.** Type-check confirms code, not the feature. Open the browser (Claude in Chrome, DevTools MCP).
* **Sandboxing + scoped permissions** for autonomy: allowlists, OS sandbox, classifier-reviewed auto mode.
* **Never bypass.** No `--no-verify`. Failing tests = not ready.

## 12. The Bottleneck Is Discrimination, Not Generation

Modern agents handle most routine implementation. The work is now in catching what they got wrong.

JetBrains *DevEcosystem 2025*: only **44% of developers have AI integrated into their workflow**; **45% spend more time debugging AI code than they save**; **66% say AI output is "almost right, but not quite"**.

§10 (Reviewer) and §11 (Quality Gates) are not optional. Skipping them is where bug density grows.

## 13. Evals for Anything Autonomous

* **Trajectory > final output.** Output-only eval misses 20–40% of failures. Log tool calls and intermediate states.
* **Observability before evals.** Get traces first; build the eval suite on top.
* **LLM-as-judge for breadth, humans for depth.**
* **The unit under test is prompt + scaffold + model.** Changing any of the three is a release.

## 14. Staged Spikes With Golden Fixtures

When the *technique* is uncertain (not the spec), don't ask the agent to solve end-to-end. Break the problem into staged spikes, validate each against curated ground truth.

1. **Discovery first.** Agent lists canonical approaches grounded in official docs and real examples. Pick by one explicit criterion. Output is information, not code.
2. **Golden fixture.** Inputs with rich expected outputs — for vision: bounding boxes, sizes, lighting, difficulty tags, edge cases. JSON keyed by input path.
3. **Pipeline with gates.** One technique per stage; each gate emits a debug artifact (`debug/01-preprocess/*.png`, intermediate JSON, log row).
4. **Two layers.** End-to-end against the fixture *and* per-stage debug to locate where it diverged.

**Why:** §9 (TDG) assumes the path is known. When you don't know it, end-to-end evaluation tells you *that* it failed, not *where*. Stage-level artifacts make the divergence inspectable, so you fix the right gate instead of guessing at the final output.

**Use when** the unknown is *how* — a library choice, a CV technique, a multi-stage transformation. Skip when the *how* is routine.

Combines established practices, not new terminology: [Spike (XP)](https://en.wikipedia.org/wiki/Spike_(software_development)), [golden datasets](https://arize.com/resource/golden-dataset/), [stage-segmented error analysis](https://hamel.dev/blog/posts/evals-faq/), [trajectory evaluation](https://docs.langchain.com/langsmith/trajectory-evals), [visual CV debugging](https://docs.opencv.org/3.4/d7/dcf/tutorial_cvv_introduction.html).

---

These are starting points. Prune what doesn't fit your codebase.
