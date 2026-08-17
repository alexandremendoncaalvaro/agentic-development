---
name: ad-ground
description: Four-source pre-implementation research — official docs, validated implementation references (open-source repos, Stack Overflow / forum answers, blog posts, gists), in-repo patterns, and git history — then synthesize a happy path, persist its claim-to-source evidence as an auditable project record, and gate any deviation before code is written. Grades evidence and confidence per WORKFLOW §17; routes insufficient evidence to ad-spike. Auto-invokes on non-trivial work, refactors, library or pattern selection, "research before coding", "before implementing", "which library", "which pattern", "how to approach", "ground before coding". Workflow-operational counterpart to WORKFLOW.md §4 + §5.
summary: Four-source pre-implementation research + versioned claim-to-source evidence record, happy-path synthesis, deviation gate, and proportional evidence grading. WORKFLOW §4 + §5 + §17.
allowed-tools: Read, Glob, Grep, Bash, WebFetch, WebSearch
---

# /ad-ground

Implements WORKFLOW §4 + §5 end-to-end as a single research pass. The four sources are joined by **AND**, not OR — every non-trivial change runs the full research pass, then synthesizes a happy path, persists the evidence trail, then justifies any deviation. This skill writes a ground record, never production code.

## Step 0 — Scope the research scope

Confirm what is being researched. The research scope is the smallest verifiable surface that captures the change: a function to add, a library to pick, a pattern to apply. State it in one sentence before research starts. If the surface is broader than one sentence captures, ask the user to narrow it; broad research scopes produce diluted research.

If the change is genuinely trivial (rename, typo, one-line refactor on a tested path), skip this skill.

## Step 1 — Four-source research pass (all four required)

### Source A — official documentation

For each language and library in scope, cite the canonical doc URL and version. Use `WebFetch` to confirm the page exists and read the relevant section; use `WebSearch` to locate it if the URL is unknown. If neither produces a confident hit, ask the user for a known-good link rather than fabricating one. Output: bulleted citations, one per language/library, each with URL plus a one-line summary of the relevant guidance.

### Source B — validated implementation references

Find ≥1 (prefer 2–3) public implementation references solving the same *technical* research scope with similar techniques. References include open-source repos, Stack Overflow / forum answers, blog posts, and gists — anything with citable code or an explicit code-bearing answer. The match is technical, not domain — a CRUD-app-with-auth and a CLI-with-auth both hit "auth flow", and either is valid for the auth research scope. Use `WebSearch` (e.g. `site:github.com <research scope> language:<lang>`, `site:stackoverflow.com <research scope>`, `<library> <research scope> example`) and follow up with `WebFetch` of the specific page. Cite `<source>:<locator>` — `<repo>:<path>:<line-range>` for repos, `<URL>` for Stack Overflow / forum / blog / gist — and quote the relevant block. Never paraphrase code from training memory. If search is inconclusive, ask the user for a known reference.

### Source C — in-repo examples

Grep / glob the current repo for analogous patterns. Cite `<file>:<line>` plus a one-line description of how the existing example handles the same shape. If the codebase has no analog, state that explicitly (real signal, not a gap).

### Source D — git history

Run `git log --all --oneline -- <relevant-paths>`, `git log --all --grep=<keyword>`, and a sweep of sibling active branches (`git branch -a`, then `git log <branch> -- <paths>` on those that look related). Surface any prior attempt or sibling solution — including abandoned ones — with `<commit-sha>` plus the touching file path and a one-line description. If the search is genuinely empty, state "no prior attempt found" — that is the valid Source D outcome when there isn't one. Narrow with `--grep` or `-S` on multi-thousand-commit repos.

## Step 2 — Happy path synthesis

In one paragraph, name the most-grounded approach for the research scope and cite at least one source per Source A / B / C. Source D is included when it produced a hit; otherwise mark "no prior attempt found." The paragraph is the canonical answer the engineer would give if asked "what is the canonical, idiomatic way to solve this here?" — the question WORKFLOW.md §4 frames.

## Step 3 — Deviation gate

If the implementation the user (or you) is about to write deviates from the synthesized happy path, write the justification before any code lands. The justification must name the specific constraint, evidence, or trade-off forcing the deviation — generic "we want it differently" is insufficient. If the justification cannot be written confidently, loop back to Step 1 and look harder; do not deviate without it.

The gate is prescriptive, not descriptive: WORKFLOW §4 asks "was the deviation deliberate?"; this gate asks "is the deviation defensible against the four sources?" Write the answer down.

## Step 4 — Confidence checkpoint

Before handing off to implementation, report a soft verdict. Two modes, chosen by stakes times irreversibility.

**Quick mode — the default for small, reversible scopes.** The coverage checklist:

- A consulted (≥1 official-doc citation per language/library)
- B consulted (≥1 implementation-reference citation, with cite-and-fetched code)
- C consulted (in-repo analog cited or "no analog found" stated)
- D checked (commits / branches surveyed; hit cited or "no prior attempt found")
- Happy path declared (Step 2)
- Deviation, if any, justified (Step 3)

**Full mode — when stakes times irreversibility justify it.** Grade the evidence per WORKFLOW §17, on top of the coverage checks:

- Seal each load-bearing claim in the happy path High / Medium / Low / Very-low (Axis 1), each with its provenance — citation, date, access method. A claim you cannot source cannot be sealed High. Where sources genuinely disagree, record the positions side by side rather than forcing a consensus.
- Report one Axis-2 verdict for the decision: **Strong** (proceed), **Conditional** (proceed with a named mitigation), or **Insufficient / spike-first** (do not proceed; the gap is retirable by experiment). The bar for Strong scales with stakes times irreversibility.
- An Insufficient / spike-first verdict is the handoff to `/ad-spike` (WORKFLOW §14): the technique is not yet grounded enough to build on, and a staged spike is how it gets retired.

If any coverage check fails, or the full-mode Axis-2 verdict is not Strong, surface the gap to the user and ask before proceeding rather than blocking. The user retains the authority to skip; the discipline is in surfacing, not in enforcement.

When the host exposes `AskUserQuestion`, render the checkpoint as a structured multi-choice card — the coverage checks with their yes/no/n.a. status, the Axis-2 verdict in full mode, and a final `proceed / pause for more research / run a spike` selector — instead of dropping the verdict as plain text. Falls back to numbered text on hosts without the primitive (Codex).

## Step 5 — Persist the evidence receipt

Chat citations are not an audit trail. Before the decision directs a non-trivial repository change, write a versioned ground record under `doc/research/`. It is a receipt for an already-defined implementation path, not an `ad-research` study answering an open question; both share the directory and monotonic number ledger.

When this pass is the Acquire phase of `/ad-research`, the study is already the durable evidence artifact: put the same claim-to-source map in that study and do **not** create a duplicate ground receipt.

From the consumer root, determine the next number with the installed shared probe:

```bash
node .claude/skills/ad-adr/scripts/next-number.mjs doc/research
```

Use JSON `next`. Stop until access is resolved if `unreadable` is non-empty, or for a numbering decision if `exhausted` is true. Write `doc/research/<NNNN>-ground-<slug>.md` from [references/record-template.md](references/record-template.md). Every load-bearing claim gets an `E<N>` section with a §17 strength and one or more source IDs; the source register carries at least one `A`, `B`, `C`, and `D` source, each with citation, access date, and access method. Record an empty git-history search as `D1`, including the command and its `no prior attempt found` result — absence is evidence only when the search is reproducible.

Set `Decision ref` to the task, spec, ADR, or other durable project artifact the record supports. Add the ground record's repository-relative path to that artifact's `Evidence ref` field; when a task tracks the work, update that field or append the path to its dated Notes entry. Do not create a new planning artifact solely to hold a trivial decision.

Validate the completed receipt before implementation:

```bash
node .claude/skills/ad-ground/scripts/validate-record.mjs \
  doc/research/<NNNN>-ground-<slug>.md
```

Proceed only when `valid` is `true` and `unreadable` is empty. The offline checker proves the claim-to-source map is structurally complete; it does not prove an external source's content. Reopen every cited source during review or audit. A receipt without that re-check is a trace, not proof.

## Output contract

The output-format skeleton lives in [references/output-format.md](references/output-format.md) — a single structured message that reports the record path, validation result, decision, and confidence in that order.

No production code is written by this skill. The durable ground record feeds the next turn (or `/ad-task`, `/ad-philosophy`'s Goal-Driven Execution, or freeform implementation).

## Next

- Implement per the synthesized happy path and link the validated ground record from the governing task, spec, or ADR.
- `/ad-task` if the work needs explicit decomposition into checkbox-toggle work units.
- `/ad-review main..HEAD` (or current scope) before merge — WORKFLOW §10.
- `/ad-adr` if the deviation gate surfaced a binding architectural decision.
