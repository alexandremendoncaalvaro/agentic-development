# Agentic Development

A starter kit for engineering production code with LLMs. Lean templates and init prompts grounded in established standards: [Anthropic Skills](https://code.claude.com/docs/en/skills), [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [Codex subagents](https://developers.openai.com/codex/subagents), [agents.md](https://agents.md), Nygard ADRs, [GitHub Spec Kit](https://github.com/github/spec-kit), and [Google Labs DESIGN.md](https://github.com/google-labs-code/design.md).

**The framing.** An LLM is the super-soldier serum; the engineer is Steve Rogers. The serum amplifies what the engineer already brings — solid bases, investigation, care for quality, architecture, clean code, observability, maintainability. The kit encodes those bases as skills, ADRs, and gates so the amplification compounds in the right direction. See [WORKFLOW.md](WORKFLOW.md) for the principles.

The CLI installs a universal skill set at the default `team` profile plus four conditional skills (`ad-design` for frontend, `ad-subagent` for Claude Code or Codex, `ad-skill` opt-in, `ad-hooks` opt-in / recommended at `mature`) into the agent's native location. The full skill table is below; profile counts and exclusions are summarized under [Project maturity profiles](#project-maturity-profiles). Each skill produces its artifact or runs its operation via the agent's native conversational UI; `agentic update` keeps installed skills in sync with upstream kit changes via a state-aware three-way diff. Report rough edges via [GitHub Issues](https://github.com/alexandremendoncaalvaro/agentic-development/issues); releases live under [GitHub Releases](https://github.com/alexandremendoncaalvaro/agentic-development/releases).

## Prerequisites

An agentic coding tool that reads markdown files. Examples here use **Claude Code** and **Codex CLI** (primary tools the author uses); the kit also works with [Antigravity](https://antigravity.google), [Gemini CLI](https://github.com/google-gemini/gemini-cli), Cursor, Continue, Aider, and any other tool that follows the [agents.md](https://agents.md) open standard.

For the CLI path: Node.js 20+ (Node 18 is past EOL and `@clack/prompts` 1.x requires `node:util` `styleText`, which only ships in Node 20+). The CLI is the recommended path. Paste-into-agent prompts (see [Manual prompts](#manual-prompts) below) remain as an alternative for users who don't want to run an installer — same artifacts, same patterns.

For the philosophy and full reasoning behind the kit, see [WORKFLOW.md](WORKFLOW.md).

## Install & use

```bash
cd your-project
npx @alexandrealvaro/agentic@beta init
```

The CLI installs the universal skill set into your agent's native location, plus conditional skills based on what your project needs:

* **Claude Code:** `.claude/skills/<skill-name>/SKILL.md` (plus `.claude/agents/<name>.md` for skills that ship a subagent)
* **Codex:** `.agents/skills/<skill-name>/SKILL.md` (+ `agents/openai.yaml`, plus `.codex/agents/<name>.toml` for skills that ship a subagent)

Two categories ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)) and two installation modes (universal = always; conditional = depends on project signals or opt-in):

| Skill | Category | Installs | What it does | Invoke |
| --- | --- | --- | --- | --- |
| `ad-bootstrap` | spec-driven | universal | Scans the repo, writes `AGENTS.md` ≤150 lines | `/ad-bootstrap` |
| `ad-architecture` | spec-driven | universal | Scans the code, writes `ARCHITECTURE.md` | `/ad-architecture` |
| `ad-adr` | spec-driven | universal | Drafts `doc/adr/NNNN-<slug>.md` from the conversation | `/ad-adr` |
| `ad-prd` | spec-driven | universal in `solo` / `team` / `mature` | Drafts or updates `doc/product/PRD.md` (or per-product `<slug>.md`) — Layer 3, product-level scope (target user, problem, success metrics, multi-feature roadmap) feature specs inherit from. Distinct from `ad-spec` (feature-level). Lazy lifecycle. | `/ad-prd` |
| `ad-guidelines` | spec-driven | universal in `solo` / `team` / `mature` | Drafts or updates `GUIDELINES.md` — the project's full engineering reference (Clean Architecture, SOLID, Object Calisthenics loose/moderate/strict per Bay 2008, code standards, complexity discipline, testing strategy, security). Layer 1 Constitution trinity member alongside `WORKFLOW.md` and `AGENTS.md`. Scan-first; pre-suggested defaults from canon. Lazy lifecycle. | `/ad-guidelines` |
| `ad-spec` | spec-driven | universal | Drafts `doc/specs/NNNN-<slug>.md` — feature-level spec (User Scenarios, Requirements, Success Criteria) Layer 4 of the six-layer stack; references parent PRD for product-scope inheritance | `/ad-spec` |
| `ad-task` | spec-driven | universal | Drafts `doc/tasks/NNNN-<slug>.md` (checkbox + Notes format; carries `Spec ref` to link the implementing spec) | `/ad-task` |
| `ad-audit` | spec-driven | universal | Read-only drift report (AGENTS.md / ARCHITECTURE.md / ADRs) | `/ad-audit` |
| `ad-philosophy` | workflow-operational | universal | Universal agent guardrails — auto-loads on non-trivial work | implicit |
| `ad-review` | workflow-operational | universal | Two-axis code review per WORKFLOW §10. Standards axis (binding docs — AGENTS.md / ARCHITECTURE.md / GUIDELINES.md / CONTEXT.md / accepted ADRs) and Spec axis (originating task / spec / PRD). Claude Code spawns two parallel `Task` sub-agents with fresh context; Codex runs a single-session pass by default, writes an audit-trail handoff, and ships a `fresh-context-reviewer` subagent for explicit escalation against that file. Reports side-by-side, no cross-axis re-ranking, no "approve" verdict | `/ad-review <range>` |
| `ad-ground` | workflow-operational | universal | Four-source pre-implementation research (docs / impl-refs / in-repo / git history) + happy-path synthesis + deviation gate per WORKFLOW §4 + §5 | `/ad-ground` |
| `ad-next` | workflow-operational | universal | State-aware navigation aid (`flutter doctor` pattern) — surveys the six-layer artifact stack and recommends prioritized next actions; complements `ad-audit` (drift) | `/ad-next` |
| `ad-spike` | workflow-operational | universal | Staged spike with golden fixtures per WORKFLOW §14, for cases where the *technique* is uncertain across multiple plausible approaches; produces `spikes/NNNN-<slug>/` with discovery + fixture + pipeline-with-gates + two-layer evaluation | `/ad-spike` |
| `ad-tdg` | workflow-operational | universal | Outcome-based prompting per WORKFLOW §9 — ground truth pair + Test Dependency Map + three approaches + single-criterion selection, for cases where the technique is known but the implementation strategy is uncertain | `/ad-tdg` |
| `ad-tdd` | workflow-operational | universal | Test-Driven Development per WORKFLOW §16 — red-green-refactor as deterministic LLM guardrail. Five phases — confirm regime, plan vertically, tracer bullet, incremental loop, refactor while green. Distinct from `ad-tdg`; routes to it for strategy selection inside the GREEN phase | `/ad-tdd` |
| `ad-domain` | spec-driven | universal | Lazy lifecycle owner of `CONTEXT.md` (Layer 2 — ubiquitous language per Evans 2003); single-context or `CONTEXT-MAP.md` multi-context | `/ad-domain` |
| `ad-grill` | workflow-operational | universal | Interview-before-research grilling — one question at a time with recommendation, codebase-first, sharpens vocabulary against `CONTEXT.md`, captures terms via `ad-domain` and decisions via `ad-adr` (three-criteria rule); upstream of `ad-ground` | `/ad-grill` |
| `ad-deepen` | workflow-operational | universal in `team` + `mature` only | Surface deepening opportunities using WORKFLOW §8 vocabulary (Module / Interface / Depth / Seam / Adapter / Leverage / Locality); three phases — explore, present numbered candidates with deletion-test framing, grill the chosen one; pairs with `ad-audit` | `/ad-deepen` |
| `ad-diagnose` | workflow-operational | universal | Disciplined diagnosis loop for hard bugs and performance regressions per WORKFLOW §15; five phases — build a feedback loop (the skill itself), reproduce, hypothesise (3-5 ranked falsifiable), instrument (one variable at a time), fix + regression-test | `/ad-diagnose` |
| `ad-commit` | workflow-operational | universal in `solo` / `team` / `mature` | Atomic Conventional Commits with DCO `Signed-off-by` sign-off; four phases — scope intake, stage-split when concerns mix, draft message, sign + write. Identity from `git config`. No `Co-Authored-By`. Helper, not blocker | `/ad-commit` |
| `ad-pr` | workflow-operational | universal in `solo` / `team` / `mature` | Open a GitHub PR with a uniform body shape (Summary / Test plan / Links); four phases — preflight (`gh` auth + branch pushed), scope assembly, draft body, open + report URL. Title format = Conventional Commits | `/ad-pr` |
| `ad-merge` | workflow-operational | universal in `solo` / `team` / `mature` | Evaluate (CI / fresh-context review / linked task / unresolved comments / mergeability) and merge a GitHub PR; CI green = hard gate (yields to explicit user override); others = warnings. Merge mode auto-detected from `gh repo view`; `--delete-branch` by default | `/ad-merge` |
| `ad-handoff` | workflow-operational | universal | Compact the current session into `${TMPDIR:-/tmp}/agentic-handoffs/<ISO>-<slug>.md` so a fresh agent (or post-`/clear` continuation) can pick up. Captures live state, references PRD / spec / task / ADR by path (never duplicates them), suggests next skills, redacts secrets. Ephemeral — never written into the repo | `/ad-handoff` |
| `ad-design` | spec-driven | auto if frontend detected | Bootstrap `DESIGN.md` from existing tokens (Figma, tailwind.config, tokens.json, CSS custom props) | `/ad-design` |
| `ad-subagent` | spec-driven | auto if installing for Claude Code or Codex | Drafts `.claude/agents/<name>.md` or `.codex/agents/<name>.toml` for bounded delegated work | `/ad-subagent` |
| `ad-skill` | spec-driven | opt-in only | Drafts a new Claude Code or Codex skill at the appropriate path | `/ad-skill` |
| `ad-hooks` | workflow-operational | opt-in only | Scaffolds deterministic quality gates per WORKFLOW §11 (pre-commit + pre-push); detects stack and recommends a runner (Husky / lefthook / pre-commit / native) | `/ad-hooks` |

A short TUI shows the detected mode, agent, and feature signals (frontend / `.claude/` / `.agents/` presence) and lets you toggle the conditional skills. Non-interactive flags: `--agent claude-code | codex | both`, `--yes` to skip confirmations — auto-checked conditionals (e.g., `ad-design` if the project has React) install; `ad-skill` stays opt-in. Re-running on an installed project is idempotent — unchanged files report `·`, divergent ones prompt to replace.

If your project already has an `AGENTS.md` (or `CLAUDE.md`), the installer appends a managed `Skills installed by agentic` section bracketed by `<!-- agentic-managed-skills:start -->` / `:end -->` markers. User content outside those markers is byte-preserved; re-runs update only the managed block.

## Project maturity profiles

The kit ships four profiles that select which skills auto-install. Same WORKFLOW principles bind every profile; only the artifact set scales.

| Profile | Universal install set | Conditional posture | Recommended for |
| --- | --- | --- | --- |
| `poc` | 12 — philosophy, ground, audit, next, archive, spike, tdg, tdd, domain, grill, diagnose, handoff | all blocked; `ad-prd` + `ad-guidelines` blocked | spike, hackathon, exploration |
| `solo` | 21 — + bootstrap, prd, guidelines, spec, task, review, commit, pr, merge | architecture / adr / hooks opt-in; design auto if frontend; subagent auto for Claude Code or Codex | solo developer shipping a real product |
| `team` (default) | 24 — + architecture, adr, deepen | hooks opt-in; design / subagent / skill follow autoIf | team product, shared discipline |
| `mature` | 24 — same as team | hooks **recommended**; deepening surfaced via `ad-deepen` | regulated / public-facing production |

Select at init time:

```bash
npx @alexandrealvaro/agentic@beta init --profile poc
```

Or change later:

```bash
npx @alexandrealvaro/agentic@beta profile set solo    # add solo's universal skills
npx @alexandrealvaro/agentic@beta profile show        # show current per-agent profile
npx @alexandrealvaro/agentic@beta profile list        # list all profiles
```

`profile set` runs the equivalent of `update` after writing the new profile, so the install set matches. The state-aware three-way diff prompts before overwriting user-edited files.

## Updating an existing project

To pull upstream kit changes into a project that already has agentic skills installed:

```bash
cd your-project
npx @alexandrealvaro/agentic@beta update
```

`update` is a separate command from `init` (clearer intent) and runs a three-way diff against a state file the kit writes at install time:

* `.claude/agentic-state.json` — for Claude Code installs.
* `.agents/agentic-state.json` — for Codex installs.

These state files are committed to your repo so the whole team shares one view of what skill version is in place. They record kit version, per-skill version, and the SHA of every shipped file at the time of last install. The three-way diff uses those SHAs to distinguish *user-edited* files from *kit-changed* files and acts accordingly:

| File state | Action |
| --- | --- |
| New file in the kit | install |
| Kit unchanged, you didn't touch it | report unchanged |
| Kit unchanged, you edited it | keep your edits |
| Kit changed, you didn't touch it | silent update |
| Kit changed, you also edited it | prompt with diff (default: skip) |
| Skill removed from the kit or de-selected | prompt before removing your file (default: keep) |

Useful flags:

* `--dry-run` — print the action plan without writing anything. Always start here when you're not sure what will happen.
* `--force` — overwrite user-edited files on conflict (non-interactive default: no). Escape hatch when you genuinely want kit-side content to win.
* `--agent claude-code | codex | both` — restrict the update to one agent.
* `--yes` — non-interactive, accepts defaults (skip on conflict, keep orphans). Combine with `--force` if you want overwrites in CI.

The `ad-review` skill writes the assembled WORKFLOW §10 handoff to `.agentic/reviews/<ISO-timestamp>-<scope>.md` before delegating to the fresh-context reviewer (Claude Code), or as an audit-trail artifact when reviewing inline by default (Codex). Codex installs a bundled `.codex/agents/fresh-context-reviewer.toml` so users can explicitly escalate that file to a fresh subagent when needed. Review handoffs are ephemeral — add `.agentic/reviews/` to your `.gitignore`.

For persistent install:

```bash
npm install -g @alexandrealvaro/agentic@beta
agentic init
```

## Recommended daily sequence

The sequence below is a happy path for the three flows that cover most daily work. Skip steps that don't apply; the kit never enforces order. Profile-specific install sets and conditional skills are summarized under [Project maturity profiles](#project-maturity-profiles).

**Greenfield project, first non-trivial feature:**

1. `agentic init` — install skills only.
2. `/ad-grill` — interview-before-research when the product idea is fuzzy; resolves vocabulary into `CONTEXT.md` via `/ad-domain` as terms surface.
3. `/ad-prd` — first durable product contract: target user, problem, success metrics, constraints, and multi-feature roadmap at `doc/product/PRD.md`. Excluded from `poc` profile.
4. `/ad-bootstrap` — produce `AGENTS.md` (distilled session-load rules) from the product context instead of inventing it.
5. `/ad-guidelines` — produce `GUIDELINES.md` (full engineering reference: Clean Architecture, SOLID, Object Calisthenics tier, testing strategy, security). Excluded from `poc`. After writing, refresh `AGENTS.md` so its engineering sections point to `GUIDELINES.md`.
6. `/ad-design` — frontend projects only; bootstrap `DESIGN.md` from tokens / styles.
7. `/ad-spec` — feature-level spec at `doc/specs/NNNN-<slug>.md`; inherits target user, success metrics, and constraints from the PRD.
8. `/ad-architecture` — produce or update `ARCHITECTURE.md` once the feature spec creates load-bearing system patterns.
9. `/ad-adr` — only when the feature forces a binding architectural decision worth recording for posterity (three-criteria rule: hard to reverse, surprising without context, real trade-off).
10. `/ad-task` — work-unit decomposition; reference the spec via `Spec ref`.
11. `/ad-ground` — four-source research before code (`ad-philosophy` auto-loads in parallel).
12. Implement — `/ad-tdd` when the behavior is test-expressible up front (red-green-refactor); `/ad-tdg` when the technique is known but the implementation strategy is uncertain.
13. `/ad-review main..HEAD` — fresh-context §10 review before merge.
14. `/ad-audit` — periodic drift check across operational docs, PRD, guidelines, specs, and the `CONTEXT.md` glossary.

**Brownfield project, quick fix:**

1. `agentic update` (only if you want upstream kit changes).
2. Fix. `ad-philosophy` auto-loads if the change is non-trivial.
3. `/ad-review` only if the fix is non-trivial. Trivial diffs skip the review.
4. Commit.

**Brownfield project, research-only ("what's the best way to add X?"):**

1. `/ad-ground` — runs the four-source research pass and surfaces the happy path with citations.
2. Decide whether the answer becomes a spec (`/ad-spec`) or a one-off task (`/ad-task`).
3. Continue from the technical-plan portion of the greenfield flow (`/ad-architecture` / `/ad-adr` if needed, then `/ad-task`).

The kit's discipline scales with the project's maturity. A solo PoC may legitimately skip `/ad-spec` and `/ad-adr` (the WORKFLOW §1 prune principle applies — don't add an artifact that wouldn't change agent behavior). A team product running on this kit is expected to use the full sequence and additionally invoke `/ad-hooks` once to scaffold the deterministic gates per WORKFLOW §11 (pre-commit lint / format / secret-scan; pre-push build / unit / integration).

**Lost mid-flow?** Invoke `/ad-next` at any time to survey the project's state across the six-layer artifact stack (Constitution → Domain → Product → Spec → Plan/Decisions → Code) and get prioritized next-action recommendations. Read-only; complements `/ad-audit` (drift detection — different question).

**Technique uncertain across multiple plausible approaches?** Invoke `/ad-spike` (per WORKFLOW §14) when the spec is clear but the *how* is unknown — library choice, multi-stage transformation, novel domain. The skill scaffolds a staged spike with golden fixtures + per-stage debug artifacts + two-layer evaluation under `spikes/NNNN-<slug>/`. The directory is throwaway by design; conclude with `/ad-adr` and delete.

**Technique known but implementation strategy uncertain?** Invoke `/ad-tdg` (per WORKFLOW §9) when multiple algorithms could produce the expected output with different trade-offs along readability / performance / testability. The skill forces a ground-truth pair, lists the tests covering the file (Test Dependency Map), generates three implementation candidates, and commits to one by a single named criterion — refusing the "optimize for all three at once" failure mode. No file written; the verified implementation is the artifact, with the candidate set + criterion landing in the commit message body.

**Behavior is test-expressible up front?** Invoke `/ad-tdd` (per WORKFLOW §16) when the change has a clear behavior to express as a test — a new API capability, a bug-driven regression test, a refactor with a known contract. Red-green-refactor as deterministic LLM guardrail: one test → red → minimum code → green → repeat. Horizontal-slicing anti-pattern (bulk-write tests, then bulk-write code) is rejected. Distinct from `/ad-tdg`; route to `/ad-tdg` inside the GREEN phase when the strategy for that test cycle is uncertain.

**Question is fuzzy?** Invoke `/ad-grill` before research. One question at a time with a recommended answer; codebase-first when the answer is in code; sharpens vocabulary against `CONTEXT.md`. Routes to `/ad-ground` (research-ready), `/ad-tdg` (implement-ready), `/ad-spike` (technique-uncertain), or `/ad-diagnose` (it turned out to be a bug) when the question is sharp.

**Bug or performance regression?** Invoke `/ad-diagnose` (per WORKFLOW §15). Five phases — build a feedback loop (the skill itself), reproduce, hypothesise (3-5 ranked falsifiable), instrument (one variable at a time), fix + regression-test. The loop is the skill; everything else is mechanical.

**Stable codebase friction?** Invoke `/ad-deepen` (per WORKFLOW §8, [ADR-0020](doc/adr/0020-deep-modules-vocabulary.md)) on `team` / `mature` profiles. Surfaces deepening opportunities using the Module / Interface / Depth / Seam / Adapter / Leverage / Locality vocabulary and the deletion test. Premature on `poc` / `solo` — auto-install excludes them.

## Manual prompts

If you prefer to skip the installer, the same artifacts can be generated by pasting prompts directly into your agent. Each prompt file has the literal text to copy, plus the matching template structure:

| Artifact | Prompt | Template | Lives at |
| --- | --- | --- | --- |
| `AGENTS.md` | [prompts/agents.md](prompts/agents.md) | [agents-project](templates/agents-project.md) | repo root |
| `ARCHITECTURE.md` | [prompts/architecture.md](prompts/architecture.md) | [architecture](templates/architecture.md) | repo root |
| ADR | [prompts/adr.md](prompts/adr.md) | [adr](templates/adr.md) | `doc/adr/NNNN-<title>.md` |
| Task | [prompts/task.md](prompts/task.md) | [task](templates/task.md) | `doc/tasks/NNNN-<slug>.md` |
| `DESIGN.md` | [prompts/design.md](prompts/design.md) | (no template — bootstrap from existing tokens) | repo root |
| Skill | [prompts/skill.md](prompts/skill.md) | [skill](templates/skill.md) | `.claude/skills/<name>/SKILL.md` |
| Subagent | [prompts/subagent.md](prompts/subagent.md) | [subagent](templates/subagent.md) / [codex-subagent](templates/codex-subagent.toml) | `.claude/agents/<name>.md` or `.codex/agents/<name>.toml` |

Prompts reference templates by relative path. Two ways to give your agent access:

- **Browse on GitHub.** Open the prompt and template files in tabs, copy both into your agent session. No install.
- **Use the npm-installed package as a kit folder.** If you ran `npm install -g @alexandrealvaro/agentic@beta`, the kit is already on disk. For Claude Code from your project's directory:
  ```bash
  claude --add-dir "$(npm root -g)/@alexandrealvaro/agentic"
  ```
  The agent then reads the templates locally via the paths the prompts use.

## Workflows by scenario

**New project (greenfield).** Initialize git and project structure, then run `agentic init` to install the universal skill set plus any auto-detected conditional skills. Product discovery comes next: use `/ad-grill` when the idea is fuzzy, `/ad-domain` as vocabulary stabilizes, and `/ad-prd` for the first durable business/product contract. After that, `/ad-bootstrap` produces `AGENTS.md` from the product context, `/ad-guidelines` records engineering standards, `/ad-design` bootstraps `DESIGN.md` from tokens (frontend projects), `/ad-spec` scopes one feature, `/ad-architecture` and `/ad-adr` record technical patterns and decisions only when the spec creates them, `/ad-task` opens trackable work items, `/ad-review <range>` reviews a diff, and `/ad-audit` flags drift. `ad-philosophy` auto-loads on non-trivial work.

**Existing project (brownfield).** Same flow. The project-wide skills (`/ad-bootstrap`, `/ad-architecture`) follow a **scan-first pattern**: the agent reads the codebase first, pre-fills every placeholder it can verify, then asks you only about the genuine gaps and conflicts — no philosophical questions, no interview-by-section. The per-artifact skills (`/ad-adr`, `/ad-task`, `/ad-design`, `/ad-skill`, `/ad-subagent`) work on a single decision or asset and don't need codebase-wide verification. Backfill ADRs only for decisions that matter going forward.

**Revisiting / auditing existing specs.** Run `/ad-audit` from inside Claude Code or Codex. The skill reads `AGENTS.md`, `ARCHITECTURE.md`, and `doc/adr/` and produces a drift list — one finding per line, format `[file or section]: spec says X, code says Y. Suggested resolution: change spec / change code / discuss.` Read-only — never rewrites specs. Apply judgment manually before changing anything.

**Reviewing your own diff.** Run `/ad-review <range>` (e.g. `/ad-review main..HEAD` or `/ad-review PR#42`). The skill splits the review into two axes — **Standards** (does the diff conform to `AGENTS.md` / `ARCHITECTURE.md` / `GUIDELINES.md` / `CONTEXT.md` / accepted ADRs?) and **Spec** (does the diff match the originating task's Acceptance Criteria, the implementing spec, or the parent PRD?). On Claude Code, the two axes run as **parallel `Task` sub-agents** with fresh context. On Codex, the default is **a single-session pass with axis-separated output** plus a persisted audit-trail file; for the §10 ideal, explicitly spawn the bundled `.codex/agents/fresh-context-reviewer.toml` against that audit file. Reports findings side-by-side with no cross-axis re-ranking, so a Spec pass cannot mask a Standards fail (and vice versa). Adversarial — no "approve" verdict. The dichotomy is adapted from [mattpocock/skills/review](https://github.com/mattpocock/skills/blob/main/skills/in-progress/review/SKILL.md) and bound to this kit's six-layer artifact stack.

**Researching before implementation.** Run `/ad-ground` (or let it auto-trigger on non-trivial work). The skill runs a four-source research pass — official docs, validated implementation references (open-source repos, Stack Overflow / forum answers, blog posts, gists), in-repo patterns, and git history — synthesizes a happy path with citations from each source, and gates any deviation behind an irrefutable justification before code is written (WORKFLOW §4 + §5). Output is the input to whatever produces the implementation plan; the skill does not write code.

**Scoping a product.** Run `/ad-prd` when you are scoping a product (not a single feature) — target user, problem, success metrics across multiple features, roadmap, cross-feature constraints. The skill scaffolds `doc/product/PRD.md` (single-product) or `doc/product/<slug>.md` plus `doc/product/PRODUCT-MAP.md` (multi-product). Layer 3 of the six-layer stack; feature specs (`/ad-spec`) reference back to it for product-scope inheritance. Excluded from `poc` profile.

**Defining engineering standards.** Run `/ad-guidelines` to write `GUIDELINES.md` — the project's full engineering reference: Clean Architecture binding, SOLID, Object Calisthenics tier (loose / moderate / strict per Bay 2008), naming conventions, error handling, complexity discipline, testing strategy, security policy. Scan-first — reads the language toolchain, existing test/lint/format config, and existing `AGENTS.md` engineering sections; pre-fills detected fields; asks only the genuine gaps and preference questions. Layer 1 Constitution trinity member alongside `WORKFLOW.md` (kit-shipped philosophy) and `AGENTS.md` (distilled session-load rules). Excluded from `poc` profile.

**Specifying a feature.** Run `/ad-spec` (or `/ad-spec` with a feature name). The skill scaffolds `doc/specs/NNNN-<slug>.md` with industry-aligned mandatory sections (User Scenarios, Functional / Non-functional Requirements, Success Criteria, Edge Cases, Out of Scope, Open Questions, Related). Specs are Layer 4 of the six-layer artifact stack — Constitution → Domain → Product → Spec → Plan/Decisions → Code. One spec per feature; multiple tasks (`/ad-task`) implement one spec; the task template carries a `Spec ref` field linking back to the spec; the spec references its parent PRD for product-scope inheritance.

**Project already built with agents.** Treat missing artifacts as brownfield (run the relevant skill) and existing artifacts as audit (`/ad-audit`).

**Delegating bounded work.** Use agents when the packet is self-contained: goal, sources, write scope, output format, and stop condition. Good fits are sidecar research, docs/API verification, test design, bug reproduction loops, bounded workers on disjoint files, and fresh-context review. Keep product judgment, visual taste, frequent back-and-forth, and tightly coupled implementation in the main session. `/ad-task` marks this explicitly with `Execution: AFK | HITL`; `/ad-subagent` creates reusable Claude Code or Codex subagents only when the role repeats or needs scoped tools/model/sandbox.

## What ends up in your target project

Only the generated outputs — never templates, prompts, or this guide:

```
your-project/
├── AGENTS.md                   (with a managed "Skills installed by agentic" section
│                                appended below your content if AGENTS.md already existed)
├── ARCHITECTURE.md
├── DESIGN.md                   (optional, frontend projects)
├── doc/
│   ├── adr/
│   │   └── NNNN-<title>.md
│   └── tasks/
│       └── NNNN-<slug>.md
├── .agentic/
│   └── reviews/                (gitignored — ephemeral §10 review handoffs)
├── .claude/                    (Claude Code targets)
│   ├── agentic-state.json      (kit install state — committed)
│   ├── skills/ad-*/SKILL.md
│   └── agents/fresh-context-reviewer.md
├── .agents/                    (Codex skill targets, cc-sdd convention)
│   ├── agentic-state.json      (kit install state — committed)
│   └── skills/ad-*/{SKILL.md, agents/openai.yaml}
└── .codex/
    └── agents/fresh-context-reviewer.toml
```

The pattern matches how [GitHub's spec-kit](https://github.com/github/spec-kit) and [cookiecutter](https://cookiecutter.readthedocs.io/) handle distribution — templates in one place, outputs in another, never mixed.

## Develop or fork

Want to contribute, fork, or run the CLI from source?

```bash
git clone https://github.com/alexandremendoncaalvaro/agentic-development.git
cd agentic-development
npm install
node bin/agentic.js init
lefthook install                 # wire the local git hooks (one-time)
```

Branch layout:
- `main` — single source of truth. Kit + CLI live together; npm beta releases are published from here.

### House-IP leak-guard (contributors)

This repository is public. A fail-closed pre-commit gate (`src/leak-guard.js`, [ADR-0033](doc/adr/0033-house-ip-leak-guard.md)) blocks any commit whose staged content adds a path under `rules/`, adds a symlink pointing outside the repo, or matches a marker in your local denylist. One-time setup:

```bash
cp .agentic/leak-denylist.example.txt .agentic/leak-denylist.txt
```

Then edit `.agentic/leak-denylist.txt` (gitignored) to list the private markers that must never reach this public repo — internal codenames, private tooling names, internal host/path fragments. The `rules/` and symlink checks fire even without a denylist. The gate honors the no-bypass rule (WORKFLOW.md §11): do not commit with `--no-verify`.

## License

MIT — see [LICENSE](LICENSE).
