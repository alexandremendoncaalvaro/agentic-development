# ADR-0010: Workflow-operational skill `agentic-ground` for four-source pre-implementation research

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

Real engineering practice in this kit's owner's workflow includes a four-source research pass before any non-trivial change:

1. **Official documentation** for the languages and libraries in scope.
2. **Validated open-source examples** — repos that solve the same *technical* research scope (not the same business model) with similar techniques.
3. **In-repo examples** — patterns the codebase already uses for analogous problems.
4. **Historical examples** — git log, diffs of previous attempts, active branches that may have already tried (or solved) the same thing.

The four are joined by AND, not OR. After the research pass, the engineer states the most-grounded happy path, compares the proposed approach against it, and either confirms alignment or surfaces an irrefutable justification for any deviation. Only with that synthesis in hand does the engineer feel confident enough to decide.

The kit covers parts of this:

- [`WORKFLOW.md` §4 "Find the Happy Path"](../../WORKFLOW.md) tells the agent to ask for the canonical/idiomatic path with official-doc citations and to check mid-flight whether deviation was deliberate. Source 1 partial; the deviation gate is loose ("Are we still on the happy path? If we deviated, was it deliberate?" — no requirement that the justification be irrefutable).
- [`WORKFLOW.md` §5 "Ground in Real Patterns"](../../WORKFLOW.md) tells the agent to find an existing example in the codebase. Source 3 covered.
- [`agentic-philosophy/SKILL.md`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) "Ground Before Coding" mirrors §4 + §5: canonical/idiomatic way, existing example in codebase, cite specific files. Same partial coverage.
- [ADR-0007](0007-workflow-operational-skills.md) §6 listed `agentic-ground` (mapped to §5) and `agentic-happy-path` (mapped to §4) as deferred v0.3 candidates. Each was framed as a separate skill.

Two gaps remain unaddressed:

- **Source 2 (validated open-source examples)** — neither WORKFLOW.md nor any skill mentions cross-repo OSS as a research input. In practice this is where most "is this the canonical way at scale?" answers come from.
- **Source 4 (git history / other branches)** — neither the WORKFLOW nor the philosophy skill mentions checking `git log --all`, recent diffs, or sibling branches. In a long-lived repo this is the cheapest way to discover "I already tried this six weeks ago and abandoned it because…" or "this is solved on branch X already."

The "AND not OR" requirement is also unstated — §4 and §5 read as independent practices, not as components of a combined research pass. The deviation gate is descriptive ("was it deliberate?") rather than prescriptive ("write the irrefutable justification or do not deviate"). And there is no explicit confidence checkpoint before implementation begins.

## Decision

We will introduce a single workflow-operational skill, **`agentic-ground`**, that codifies the four-source research pass + happy-path-with-deviation-gate as one indivisible flow. Combined into one skill rather than split across the two ADR-0007-§6 candidates because the practice is one flow in the engineer's hands and splitting it would force users to invoke two skills sequentially with overlapping outputs.

1. **Skill name `agentic-ground`.** Workflow-operational per [ADR-0007](0007-workflow-operational-skills.md). Auto-installed alongside the universal skill set; lazy-loads on auto-trigger keywords (`research before coding`, `before implementing`, `which library`, `which pattern`, `non-trivial change`, `how to approach`).

2. **Four-source research pass, all four required, in this order:**
   - **Source A — official docs.** For each language/library in scope, cite the canonical doc URL and version. WebFetch / WebSearch when available; fall back to ask the user for a known-good link.
   - **Source B — validated open-source examples.** ≥1 repo, prefer 2–3, that solve the same *technical* research scope. Cite `<repo>:<path>:<line>` and fetch via tools — never paraphrase code from training. If search is inconclusive, ask the user for a known reference; do not fabricate.
   - **Source C — in-repo examples.** Grep / glob for analogous patterns. Cite `<file>:<line>`.
   - **Source D — git history.** `git log --all --diff-filter=AM --grep`, recent commits, sibling branches. Surface any prior attempt or sibling solution. Cite `<commit-sha>` plus the touching file path.

3. **Happy path synthesis.** After the four sources are populated, the agent writes a single "happy path" paragraph that names the chosen approach and cites at least one source per Source A/B/C; Source D is included when it produced a hit, otherwise marked "no prior attempt found."

4. **Deviation gate.** If the proposed implementation deviates from the synthesized happy path, the agent writes a justification — irrefutable in the sense that it must name the specific constraint, evidence, or trade-off that forces the deviation. Without that justification the agent loops back to (2) before any code is written.

5. **Confidence checkpoint.** The agent reports a soft "do I have enough information?" verdict against four checks: each of A/B/C consulted, D checked (hit or "no prior attempt"), happy path declared, deviations (if any) justified. If any check fails, the agent surfaces the gap to the user and asks before proceeding rather than hard-blocking.

6. **Codex parity is asymmetric.** Auto-trigger on Codex is less mature than Claude Code's; the Codex variant of the skill states that the skill should be invoked manually for non-trivial changes when auto-trigger does not fire. Same posture as [ADR-0007](0007-workflow-operational-skills.md) on `agentic-review`.

7. **Skill scope is research, not planning.** `agentic-ground` produces the research pass + happy path + deviation justification; it does not produce a per-task file or an implementation plan. `agentic-task` and `agentic-philosophy` (Goal-Driven Execution) own those. The output of `agentic-ground` is the input to whichever skill or freeform turn produces the plan.

## Consequences

Positive:

- Closes the documented-but-unautomated gaps on Sources 2 and 4. Source 1 (official docs) and Source 3 (in-repo) gain a single binding place where they're required jointly rather than independently suggested.
- The deviation gate stops being descriptive ("was it deliberate?") and becomes prescriptive ("write the justification or do not deviate"), making "drift away from the canonical path" a visible event rather than a silent omission.
- The confidence checkpoint gives the user a single moment to redirect the work before code is written — much cheaper than catching the same misalignment in review.
- Combining the four sources into one skill matches how the practice runs in real life. Splitting it would force users to invoke two skills with overlapping research outputs, fragmenting context.
- Satisfies one of the two `agentic-happy-path` / `agentic-ground` candidates ADR-0007 §6 deferred to v0.3, with expanded scope. The other v0.3 candidates (`agentic-spike`, `agentic-tdg`, `agentic-hooks`, `agentic-plan-mode`) remain deferred and each still gets its own ADR if/when proposed.

Negative / trade-offs:

- **Skill size.** `agentic-ground` is the largest workflow-operational skill so far — four research stages plus synthesis plus gate plus checkpoint. Description must stay under the 1,536-character cap; body must remain digestible. Mitigation: structure the skill body as four numbered steps with one-paragraph rationale each, mirror the layout users already know from `agentic-review` and `agentic-bootstrap`.
- **Source B (OSS) carries hallucination risk.** An agent asked for "an open-source example of X" can fabricate a plausible-sounding repo path. Mitigation: the skill body requires the agent to fetch the cited code via tools (not paraphrase) and to fall back to "ask the user for a known reference" when web search returns nothing decisive.
- **Source D adds shell calls per invocation.** `git log --all` plus a few `git show <sha>` reads. Cheap on a small repo, expensive on a multi-thousand-commit monorepo. Mitigation: the skill body suggests narrowing with `--grep` or `-S` when the repo is large, and accepts "no prior attempt found" as a valid Source D result when the search is genuinely empty.
- **Confidence gate is soft, not hard.** The agent surfaces gaps but does not block. A user who wants to skip the research pass can. Mitigation: this matches the kit's existing posture (idempotency-default skip, default-keep on orphan) — power users get an escape hatch; the default surface enforces the discipline.
- **Codex auto-trigger is best-effort.** Description-triggered skills work well in Claude Code; Codex is uneven. Mitigation: documented in the skill body; users running Codex are advised to invoke the skill manually for non-trivial changes when auto-trigger does not fire.

## Alternatives Considered

- **Two skills, `agentic-happy-path` + `agentic-research`, per ADR-0007 §6's original framing.** Rejected per E1. The four-source research pass and the happy-path synthesis are one indivisible flow in practice; splitting forces users to invoke two skills with overlapping research outputs and fragments the context the synthesis depends on. The same scrutiny clause in [ADR-0007](0007-workflow-operational-skills.md) §6 ("each new workflow-operational skill needs its own ADR") applies — but the right unit here is one skill, not two.
- **Expand `agentic-philosophy`'s "Ground Before Coding" section instead of shipping a new skill.** Rejected. The philosophy skill is **posture** — universal, lazy-loaded, light-touch, applied to every non-trivial turn. The four-source research pass is **process** — orchestrated, heavier, applied when the user (or auto-trigger) asks for structured pre-implementation research. Same line ADR-0007 drew between `agentic-philosophy` (posture) and `agentic-review` (process). Mixing them would inflate the philosophy skill beyond its current size and hide the process behind a posture trigger.
- **Make Source B opt-in only.** Rejected per E2. Source B is the highest-value addition over the existing kit (Sources 1 and 3 are already partially covered); making it opt-in would reproduce the same gap the ADR is closing. Hallucination risk is mitigated by the cite-and-fetch requirement.
- **Hard-block on the confidence checkpoint.** Rejected per E5. Hard-blocks force users into adversarial workarounds when the gate fires inappropriately. A soft surface that names the gap and asks before proceeding aligns with the kit's existing default-skip / default-keep posture and respects the user's authority to decide.
- **Include git history beyond the current repo (submodules, sibling repos).** Rejected per E4. Cross-repo history adds complexity without a clear gain — most "have I tried this before?" hits live in the current repo's log and active branches.
- **Defer to v0.4 and ship `agentic-happy-path` + `agentic-ground` separately as ADR-0007 §6 originally framed.** Rejected. ADR-0007 §6 explicitly framed those candidates as deferred *because* they hadn't been designed yet; the actual practice the user runs combines them. Shipping the combined skill in v0.4 honors the ADR-0007 deferral while consolidating the design before splitting prematurely.
