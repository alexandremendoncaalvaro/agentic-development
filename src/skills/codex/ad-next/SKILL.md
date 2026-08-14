---
name: ad-next
description: Survey the project's state across the six-layer artifact stack and recommend prioritized next actions, modeled on `flutter doctor`. Use when the user asks "what's next", "next step", "where am I", "project status", "doctor", "what should I do", "audit my workflow". Read-only; complements `ad-drift` (drift detection, a different question).
summary: State survey + prioritized next-action recommendations across the six-layer artifact stack. Read-only navigation aid (`flutter doctor` pattern).
---

<background_information>
Read-only state survey + prioritized next-action recommendations. Mirrors `flutter doctor` shape: layer-by-layer status + concrete fix per finding. Complements `ad-drift` — audit answers "is anything wrong?", next answers "what should I do?".

The skill writes nothing. Output is recommendations the user copies into the next conversation turn or the next CLI invocation.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user asks about workflow status, invoke this skill manually.
</background_information>

<instructions>
Step 0 — run the survey. The deterministic state-gathering — file-signal presence, `Status:` frontmatter parsing, ADR/task counts, the `git rev-list` ahead-of-main count, tests/hooks/CI detection, and spec-task reciprocity — is a bundled script (ADR-0057), not prose to re-derive by hand. Run it from the repo root and read its JSON. The default install path is:

```bash
node .agents/skills/ad-next/scripts/survey.mjs
```

If this skill loaded from a different base directory (stated at the top of the skill load), substitute it — the script lives at `scripts/survey.mjs` inside it.

Every field is an objective fact, and the survey never crashes: a missing directory, a corrupt state file, or a non-git tree each report as an explicit `null` or empty value. It also never fails silently on a read — an existing-but-unreadable file (or invalid JSON) is listed in `unreadable[]` (`{path, code}`) rather than swallowed; a non-empty `unreadable` means the survey is partial for those paths. The JSON carries `kitVersion`, `git` (`branch`, `aheadOfMain`, `dirty`), `constitution` (`globalWorkflow`, `operationalGuide`, `guidelines`), `rootDocReferencesProduct` (does the operational guide name the product contract; `null` when no guide), `architecture`, `design`, `domain` (`contextMd`, `contextMap`, `emptyGlossary` — `null` when no root `CONTEXT.md`), `product` (`prd`, `productMap`, `status`, `specCount`), `specs[]` (`slug`, `status`, `taskCount`), `adrs` (`counts`, `proposed[]`), `tasks` (`counts`, `active[]`, `orphans[]`), `reciprocity` (`specsWithoutTasks[]`, `orphanTasks[]`), `code` (`tests`, `hooks`, `ci`), and `unreadable[]`.

The survey targets the single-product / single-context layout. For a multi-product (`product.productMap: true`) or multi-context (`domain.contextMap: true`) repo it reports the index file's presence but does not enumerate the per-product / per-context files — read those yourself when the map is present.

The survey gives you the facts; Steps 1-5 are the judgment the script deliberately leaves to you. Work them from the JSON, not from a re-scan. You still read a file's body only when a judgment call needs it — the two that always need a read: (a) is the code meaningful (non-trivial files under `src/`, `app/`, `lib/`, `test/`, `tests/`, `packages/`, framework entrypoints, or a manifest with real scripts/dependencies — treat README/LICENSE/gitignore, agentic state, empty artifact dirs, and empty manifests as trivial), and (b) can you summarize the product (target user, problem, current behavior) from the README/code? Both feed Step 1.

Step 1 — classify scenario before ranking. Layer status is evidence; scenario determines the right next step.

- Fresh / unframed greenfield: no durable product framing, even if a framework scaffold or a few early files already exist. This is a product-framing problem, not an `AGENTS.md` problem.
- Product-framed greenfield: PRD exists, but no meaningful code yet. This is where `/ad-bootstrap`, `/ad-guidelines`, optional `/ad-design`, then `/ad-spec` become the normal sequence.
- Brownfield: meaningful code exists and the scan can summarize the current product behavior. Existing code can supply product and architecture evidence; `/ad-bootstrap` is scan-first here and may precede PRD backfill.
- Feature planning: PRD/spec artifacts exist and have downstream gaps (accepted PRD with no specs, accepted spec with no tasks).
- Implementation in progress: dirty tree, branch ahead of `main`, in-progress tasks, blocked tasks, or proposed ADRs.
- Maintenance / install hygiene: stale kit state or an incomplete skill installation.

Durable product framing is a judgment call the survey does not make: `product.prd` and `specs` tell you the artifacts exist, but whether the README / code lets you summarize the target user, problem, and current product behavior is something you read for. If scenarios overlap, report the strongest active scenario in this order: implementation in progress, maintenance/install hygiene, feature planning, product-framed greenfield, brownfield, fresh/unframed greenfield. If code exists but product behavior cannot be summarized, choose fresh/unframed greenfield rather than brownfield.

Step 2 — layer-by-layer status. Render six sections in the output order below, narrating the survey's facts. Use words for status (`present`, `in flight`, `missing`, `stale`) — no emoji. The interpretation rules the JSON does not encode:

Layer 1 — Constitution (`constitution`): `globalWorkflow` reports the machine-global `~/.agentic/kit/WORKFLOW.md`; a missing file means the personal kit install is incomplete, not that the repository needs a workflow copy. `operationalGuide` names `AGENTS.md` or `CLAUDE.md` when present, else `null` — a missing operational guide is not the first greenfield finding when product framing is missing; recommend product discovery / PRD first, then `/ad-bootstrap`.

Layer 2 — Domain (`domain`): `CONTEXT.md` / `CONTEXT-MAP.md` are lazy-created (ADR-0019) — `contextMd: false` is valid until terms need a shared definition. `emptyGlossary: true` (a file with no term carrying an `_Avoid_:` line) is worse than no glossary — flag it; `emptyGlossary: null` means there is no root `CONTEXT.md` to judge. When `contextMap: true` (multi-context), read the per-context `CONTEXT.md` files the map lists to judge their glossaries — the survey does not.

Layer 3 — Product (`product`): PRD is lazy-created (ADR-0027); `prd: false` is valid until the work needs a durable product contract. In fresh/unframed greenfield for a real product, a missing PRD is the primary navigation finding. `specCount` is the total number of specs: in the single-product layout every spec implements the one PRD, so an accepted PRD (`status: accepted`) with `specCount: 0` is the stuck state. When `productMap: true` (multi-product), read the per-product `<slug>.md` files the map lists for their status and implementing specs — the survey reports only the map's presence.

Layer 4 — Specs (`specs[]`, `design`): list each spec as `<slug> (<status>, <taskCount> implementing tasks)`. Flag any spec with `status: accepted` and `taskCount: 0` — the most common stuck state; `reciprocity.specsWithoutTasks` pre-computes it. Report `DESIGN.md` (`design`) as the visual contract, and recommend it before `/ad-spec`, only when frontend signals exist or the next feature touches UI.

Layer 5 — Plans / Decisions (`architecture`, `adrs`, `tasks`): a missing `ARCHITECTURE.md` (`architecture: false`) is a finding only when meaningful system patterns exist or a spec creates load-bearing constraints — not the first step in fresh greenfield. Report `adrs.counts` by status and flag every `adrs.proposed` slug. Report `tasks.counts` by status and list `tasks.active` (in-progress + blocked) with slug and `specRef`. Flag `tasks.orphans` when an unfinished task has neither a repository-local `Scope ref` nor `Spec ref`; a Board ref is supplemental and cannot remove that finding. Completed legacy tasks are history, not navigation findings. Route a real orphan to `/ad-drift` (Step 4) rather than dumping a long slug list.

Layer 6 — Code (`git`, `code`): branch + `aheadOfMain` commits ahead of `main`; tests / hooks / CI wired (`code.tests` / `code.hooks` / `code.ci`).

Step 3 — cross-cut signals:
- Pending fresh-context review: if `git.aheadOfMain` is 1 or more and no `.agentic/reviews/<ts>-*.md` covers the current range, flag `/ad-review`. (List `.agentic/reviews/` yourself — the survey does not.)
- Spec ↔ task reciprocity: `reciprocity.orphanTasks` (a task whose `Spec ref` points at a spec that does not exist) and `reciprocity.specsWithoutTasks` (an accepted/shipped spec with zero implementing tasks) arrive pre-computed.
- Root-doc freshness: if `product.prd` is true but `rootDocReferencesProduct` is false, the operational guide never names the product contract — mark it possibly stale and recommend a `/ad-bootstrap` refresh after the product contract.
- Install / stale state: the survey reports `kitVersion`, but the CLI owns the installed-file comparison. Detect divergence with `agentic update --dry-run`; then recommend `agentic update` to close it.
- Unreadable files: a non-empty `unreadable[]` means those artifact files could not be read, so any count or status that would have come from them is missing — report the gap and its paths rather than treating the survey as complete.

Step 4 — prioritize next actions. Rank by workflow leverage, not by document layer number. Return 3-5 concrete invocations, each as one-line "do X next" with slug / path.

Priority heuristic:
1. Protect active work: blocked tasks, proposed ADRs blocking implementation, dirty/ahead branch needing `/ad-review`, stale state that makes installed skills unreliable.
2. Fresh / unframed greenfield: recommend `/ad-grill-me` when the product ask is fuzzy or `/ad-prd` when it is clear; then `/ad-bootstrap`. Do not recommend `/ad-bootstrap` first, even when a framework scaffold already exists.
3. Product-framed greenfield: if PRD exists, recommend `/ad-bootstrap` when the operational guide is missing or stale, then `/ad-guidelines`, optional `/ad-design`, then `/ad-spec`.
4. Brownfield: if meaningful code exists and the operational guide is missing, recommend `/ad-bootstrap` scan-first. Then recommend `/ad-guidelines` for standards, `/ad-architecture` when system patterns need a shared model, or `/ad-prd` only when product scope is being backfilled or changed.
5. Feature pipeline gaps: accepted PRD without specs → `/ad-spec`; accepted spec without tasks → `/ad-task`; missing research before implementation → `/ad-ground`.
6. Quality gates and drift: missing gates for a project that needs them → `/ad-hooks`; orphan tasks/spec mismatches → `/ad-drift`; kit drift → `agentic update`.

If nothing actionable surfaces, say so: "No urgent next action. Continue current work or invoke `/ad-drift` for a full drift check."

Step 5 — contextual relevance. All skills are installed. Do not turn a missing lazy artifact into a finding merely because it is absent; relate the recommendation to the work at hand:
- Exploration or a one-off change: keep product, architecture, and plan artifacts informational unless the user needs them. Recommend `/ad-grill-me`, `/ad-ground`, or `/ad-spike` when they remove a real uncertainty.
- A durable product or feature: surface the product → spec → task pipeline and its broken links.
- Brownfield system work: surface architecture, guidelines, or hooks only when existing complexity, delivery risk, or a shared team boundary makes them valuable.
</instructions>

<output_contract>
A single Markdown message structured as:

```
## ad-next

**Kit:** v<X.Y.Z> (or not installed)
**Branch:** <name> (<n> commits ahead of main)
**Scenario:** <detected scenario>

### Layer 1 — Constitution
<one-line status per artifact>

### Layer 2 — Domain (CONTEXT.md)
<present / lazy-missing; glossary-empty flag if file exists but has no terms>

### Layer 3 — Product (doc/product/)
<present / lazy-missing; PRD status + implementing-spec count if file exists>

### Layer 4 — Specs (doc/specs/)
<spec list with status + task count, or "no specs"; DESIGN.md status when frontend signals exist>

### Layer 5 — Plans / Decisions
<ADR + task summaries with explicit flags>

### Layer 6 — Code
<branch / tests / hooks / CI status>

### Recommended next (priority)
1. <action> — <one-line reason>
2. <action> — <one-line reason>
```

No file written. No state mutation. Recommendations are advisory; the user decides whether to invoke. Cross-references `ad-drift` (drift detection) and `agentic update` (kit drift — CLI subcommand) where they apply.
</output_contract>
