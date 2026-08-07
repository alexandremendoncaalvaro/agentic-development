# `@alexandrealvaro/agentic` — Domain Glossary

_Lazy artifact — only contains terms that have been resolved through grilling, spec drafting, or explicit capture. Empty entries are worse than no entry; speculation belongs elsewhere._

_Maintained by `/ad-domain`._

## Language

### Kit

**Definition:** the `@alexandrealvaro/agentic` npm package — a CLI plus the source-of-truth `src/skills/` tree that installs the `ad-*` skill set (and bundled Claude Code subagents) into a target project's agent surface.

_Avoid_: "framework" (the kit prescribes nothing at runtime; it just installs files); "tool" (overloaded with host primitives like `Read` / `Bash`); "CLI" (the CLI is `bin/agentic.js` — one part of the kit, not the whole).

**Related code:** [`package.json`](package.json), [`bin/agentic.js`](bin/agentic.js), [`src/skills/`](src/skills/).

### Profile

**Definition:** a project-maturity tier (`poc` / `solo` / `team` / `mature`) declared in the install state file. Bounds which skills auto-install and which conditional rules apply. Tiers form a monotone superset chain — `poc ⊆ solo ⊆ team ⊆ mature`.

_Avoid_: "mode" (mode is detected from filesystem signals: `audit | greenfield | brownfield` — orthogonal axis); "level" (overloaded with severity); "tier" (acceptable in prose but not as the canonical noun).

**Related code:** [`src/lib/profiles.js`](src/lib/profiles.js), [`src/commands/profile.js`](src/commands/profile.js).

### Workflow-operational skill

**Definition:** a skill that **executes a process** rather than producing a persistent artifact. Examples: `ad-review` (runs a §10 review), `ad-commit` (drafts and writes a commit), `ad-handoff` (compacts a session), `ad-diagnose` (runs the §15 diagnosis loop), `ad-philosophy` (loads posture guardrails).

_Avoid_: "command" (`/ad-review` is the *invocation*, not the skill); "behavior skill" (vague).

**Related code:** [`doc/adr/0007-workflow-operational-skills.md`](doc/adr/0007-workflow-operational-skills.md), [`src/skills/claude-code/ad-review/`](src/skills/claude-code/ad-review/), [`src/skills/claude-code/ad-commit/`](src/skills/claude-code/ad-commit/).

### Spec-driven skill

**Definition:** a skill that **produces a persistent artifact** at a known path. Examples: `ad-spec` (writes `doc/specs/NNNN-<slug>.md`), `ad-task` (writes `doc/tasks/NNNN-<slug>.md`), `ad-adr` (writes `doc/adr/NNNN-<slug>.md`), `ad-architecture` (writes `ARCHITECTURE.md`), `ad-bootstrap` (writes `AGENTS.md`), `ad-domain` (writes `CONTEXT.md`).

_Avoid_: "generator skill" (implies one-shot; spec-driven skills are lazy and reentrant); "artifact skill" (clumsy).

**Related code:** [`doc/adr/0007-workflow-operational-skills.md`](doc/adr/0007-workflow-operational-skills.md), [`src/skills/claude-code/ad-spec/`](src/skills/claude-code/ad-spec/), [`src/skills/claude-code/ad-task/`](src/skills/claude-code/ad-task/).

### Fresh-context review

**Definition:** WORKFLOW §10 practice — a code review performed without inherited bias from the session that wrote the code. The reviewer reads only the assembled handoff (diff plus spec slice); no conversation history; no prior context. Implementation differs per host (see **Two-axis review**).

_Avoid_: "clean-context review" (non-standard); "independent review" (ambiguous — could mean independent reviewer-as-human); "PR review" (PR is one scope of `ad-review`, not the practice).

**Related code:** [`WORKFLOW.md`](WORKFLOW.md), [`doc/adr/0007-workflow-operational-skills.md`](doc/adr/0007-workflow-operational-skills.md), [`src/skills/claude-code/ad-review/`](src/skills/claude-code/ad-review/).

### Two-axis review

**Definition:** the kit's implementation of fresh-context review — splits the review into two independent axes so neither can mask the other:

- **Standards axis** — does the diff conform to AGENTS.md / ARCHITECTURE.md / GUIDELINES.md / CONTEXT.md / accepted ADRs? Bugs, coupling, edge cases, vocabulary drift.
- **Spec axis** — does the diff match what the originating task / spec / PRD asked for? Missing requirements, scope creep, wrong implementation against quoted spec line.

On Claude Code, the two axes run as parallel `Task` sub-agent calls with axis-bounded handoffs. On Codex, they run as a single-session pass with axis-separated output (Codex skills cannot programmatically spawn sub-agents — see ADR-0007 Addendum 2026-05-24). Each axis ends with its own verdict; no cross-axis re-ranking; no synthesized "approve".

_Avoid_: "dual review" (ambiguous — could mean two reviewers of the same axis); "Standards/Spec split" (clumsy as a noun phrase); "split review" (unclear what's split).

**Related code:** [`src/skills/claude-code/ad-review/SKILL.md`](src/skills/claude-code/ad-review/SKILL.md), [`src/skills/codex/ad-review/SKILL.md`](src/skills/codex/ad-review/SKILL.md), [`src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md`](src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md).

### Handoff

**Definition:** a structured markdown file the kit writes to carry context from one session to another. The kit ships **three** disjoint handoff flavours that share the noun — see **Session handoff**, **Review handoff**, and **Audit handoff** for the disambiguated definitions. Bare "handoff" is ambiguous; in prose, always qualify.

_Avoid_: using "handoff" without a qualifier (`session` / `review` / `audit`) — the flavours differ in producer, path, and purpose (Review and Audit share the `.agentic/reviews/` directory but not the producer or shape).

**Related code:** see the two disambiguated entries.

### Session handoff

**Definition:** the markdown file `ad-handoff` writes to `${TMPDIR:-/tmp}/agentic-handoffs/<ISO>-<slug>.md`. Compacts the current agent session — live working-tree state, open artifacts, unresolved decisions, in-flight diff, recent errors, suggested next skills — so a fresh agent (post-`/clear`, agent switch, or context-window pressure) can pick the work up cold. References PRD / spec / task / ADR by path; never duplicates them. Redacts secrets before writing. Per-session OS-temp-dir ephemeral; never committed.

_Avoid_: "context dump" (passive — `ad-handoff` curates, doesn't dump); "session export" (implies the agent state is portable; only the curated subset is); "handoff file" (acceptable in informal prose but not as the canonical noun).

**Related code:** [`src/skills/claude-code/ad-handoff/SKILL.md`](src/skills/claude-code/ad-handoff/SKILL.md), [`src/skills/codex/ad-handoff/SKILL.md`](src/skills/codex/ad-handoff/SKILL.md).

### Review handoff

**Definition:** the markdown file `ad-review` writes to `.agentic/reviews/<ISO>-<scope>{,-standards,-spec}.md`. Carries the diff plus the spec slice the fresh-context reviewer receives. Serves as the audit trail for the review — the user can replay the review against an updated diff or share it with a teammate. Ephemeral per-review artifact; `.agentic/reviews/` belongs in `.gitignore`. On Claude Code, two files (`-standards.md` + `-spec.md`) when two-axis runs; on Codex, one combined file (per ADR-0007 Addendum 2026-05-24).

_Avoid_: "review snapshot" (snapshot implies frozen-in-time database state); "review log" (log implies append-only history); "review context" (too generic).

**Related code:** [`src/skills/claude-code/ad-review/SKILL.md`](src/skills/claude-code/ad-review/SKILL.md), [`src/skills/codex/ad-review/SKILL.md`](src/skills/codex/ad-review/SKILL.md), [`.agentic/reviews/`](.agentic/reviews/).

### Audit handoff

**Definition:** the markdown file `ad-audit` writes to `.agentic/reviews/<ISO>-audit-<scope>.md` (Claude Code: one per dispatched rule-group; Codex: one combined audit trail). Carries the target plus the resolved rule-set slice each `audit-group-reviewer` receives — one rule-group's rules, the tree/SHA, and the critical tag. Serves as the audit trail for the maximum-gate audit and the context packet for a user-spawned reviewer escalation. Ephemeral per-audit artifact; shares the `.agentic/reviews/` directory (and its `.gitignore` entry) with the Review handoff.

_Avoid_: conflating it with the **Review handoff** — same directory, different producer (`ad-audit` vs `ad-review`) and shape (per-rule-group vs per-axis).

**Related code:** [`src/skills/claude-code/ad-audit/SKILL.md`](src/skills/claude-code/ad-audit/SKILL.md), [`src/skills/codex/ad-audit/SKILL.md`](src/skills/codex/ad-audit/SKILL.md), [`.agentic/reviews/`](.agentic/reviews/).

### Rule-set layer

**Definition:** one of the three sources `ad-audit` unions into the rule-set it audits against ([ADR-0035](doc/adr/0035-rules-location-convention.md), [ADR-0043](doc/adr/0043-per-project-rules-layer.md)): **binding docs** (the repo's `AGENTS.md` / `ARCHITECTURE.md` / `GUIDELINES.md` / accepted ADRs — always in scope), the **machine store** (`$AGENTIC_RULES_DIR`, else `~/.agentic/rules/` — the practitioner's portable, you-everywhere conventions), and **project rules** (`.agentic/rules/` at the repo root — this-project conventions, committed or machine-local via `.git/info/exclude`). On genuine conflict a project rule shadows a machine-store rule, and the audit reports the shadowing.

_Avoid_: "global rules" for the machine store (ambiguous with the binding docs, which are also always-on); "local rules" (ambiguous between machine-local visibility and the project layer itself); "rule level" (levels imply severity — the layers are scopes, not severities).

**Related code:** [`src/skills/claude-code/ad-audit/SKILL.md`](src/skills/claude-code/ad-audit/SKILL.md), [`src/skills/codex/ad-audit/SKILL.md`](src/skills/codex/ad-audit/SKILL.md), [`src/skills/claude-code/ad-level-up/SKILL.md`](src/skills/claude-code/ad-level-up/SKILL.md), [`src/skills/codex/ad-level-up/SKILL.md`](src/skills/codex/ad-level-up/SKILL.md).

### File-coverage axis

**Definition:** the second dimension of `ad-audit`'s coverage matrix ([ADR-0046](doc/adr/0046-ad-audit-file-coverage-severity-prose.md)): beyond every rule-group being accounted for, every changed file in a diff target must appear in at least one reviewer's `Files grounded:` line or carry an explicit N/A-with-reason (bulk assets bucketable as a named class, cleared only after a spot-check). A gap on either axis makes the audit INCOMPLETE.

_Avoid_: "file coverage" bare (collides with test-coverage tooling vocabulary); "second matrix" (it is one matrix, two axes).

**Related code:** [`src/skills/claude-code/ad-audit/SKILL.md`](src/skills/claude-code/ad-audit/SKILL.md), [`src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md`](src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md).

### Severity scale

**Definition:** the four-tier ranking `critical · major · minor · nit` that `ad-audit` reviewers assign to violations and judgement-calls ([ADR-0046](doc/adr/0046-ad-audit-file-coverage-severity-prose.md)). Severity ranks a *confirmed* finding for triage; it never substitutes for evidence and never gates (the evidence bar gates). The severity value `critical` is unrelated to the rule-set's CRITICAL tag on a *group*, which triggers cross-model hardening.

_Avoid_: using "critical" bare where group-tag vs finding-severity is ambiguous — qualify ("a critical finding" / "a CRITICAL group"); "blocker" as a severity (a blocker is an evidence-gate state, not a rank).

**Related code:** [`src/skills/claude-code/ad-audit/SKILL.md`](src/skills/claude-code/ad-audit/SKILL.md), [`src/skills/codex/ad-audit/agents/audit-group-reviewer.toml`](src/skills/codex/ad-audit/agents/audit-group-reviewer.toml).

### Prose-vs-code posture

**Definition:** the reviewer-contract rule that the target's own prose — PR description, commit messages, comments, doc claims — is a set of claims to verify against the code, never context to trust; a prose-vs-code discrepancy is itself a finding ("the diff is what ships", [ADR-0046](doc/adr/0046-ad-audit-file-coverage-severity-prose.md)). Generalises the machine-store CV group's "a code comment is not evidence" to the whole metadata surface. Ships unmeasured with an explicit ADR-0045-shaped revisit trigger.

_Avoid_: "prose check" (sounds like style/grammar review); "distrust the author" (the posture targets artifacts, not people).

**Related code:** [`src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md`](src/skills/claude-code/ad-audit/agents/audit-group-reviewer.md), [`doc/adr/0046-ad-audit-file-coverage-severity-prose.md`](doc/adr/0046-ad-audit-file-coverage-severity-prose.md).

### Empirical falsification lane

**Definition:** the `ad-audit` step that **runs** a claim instead of arguing it ([ADR-0052](doc/adr/0052-ad-audit-empirical-falsification-lane.md)) — when a reviewer finding asserts a specific test or suite *cannot fail* on a specific production change, the orchestrator applies the minimal mutation, runs the CI-exact filter, observes the result, and restores the tree. Serial and only after the parallel reviewers finish; orchestrator-only (reviewers hand the trigger up, never mutate); a green counts only if the mutation demonstrably took effect and the run completed. Fires solely on the negative-coverage ("cannot fail") trigger — reproducing the author's own numbers is the evidence gate's job, not the lane's.

_Avoid_: "reproduction step" (the evidence gate already reproduces author claims; the lane is narrower — it falsifies a "cannot fail" inference); "mutation testing" (that is a coverage-tooling technique over a whole suite; this is one targeted mutation to settle one finding).

**Related code:** [`src/skills/claude-code/ad-audit/SKILL.md`](src/skills/claude-code/ad-audit/SKILL.md), [`src/skills/codex/ad-audit/SKILL.md`](src/skills/codex/ad-audit/SKILL.md), [`doc/adr/0052-ad-audit-empirical-falsification-lane.md`](doc/adr/0052-ad-audit-empirical-falsification-lane.md).

### Skill script

**Definition:** an executable file under `scripts/` beside a skill's `SKILL.md`, shipped and installed with the skill (SHA-tracked and three-way-diffed like any skill file) and invoked by path from the skill text. Host copies are byte-identical twins, enforced by test. First instance: `ad-audit`'s deterministic rules-resolution probe, `resolve-rules.mjs` (ADR-0047 Decision 1 realization, task-0031).

_Avoid_: "preflight script" as the canonical noun (preflight is a common *role* of a skill script, not the concept's name); "helper script" (ambiguous with the repo-level `scripts/` release tooling, which never ships to npm).

**Related code:** [`src/skills/claude-code/ad-audit/scripts/resolve-rules.mjs`](src/skills/claude-code/ad-audit/scripts/resolve-rules.mjs), [`src/lib/install.js`](src/lib/install.js), [`test/skills.test.js`](test/skills.test.js), [`test/skill-scripts.test.js`](test/skill-scripts.test.js).

## Relationships

- A **Kit** install bounds itself by a single **Profile** per agent surface (`.claude/skills/` and `.agents/skills/` each carry their own profile state).
- A **Profile** declares which **Workflow-operational skills** and **Spec-driven skills** install universally and which install conditionally.
- A **Fresh-context review** is implemented as a **Two-axis review** on every kit-supported host; the implementation differs per host but the noun does not.
- A **Two-axis review** produces one or more **Review handoffs** as its audit trail.
- A **Session handoff** and a **Review handoff** are sibling flavours of **Handoff**; they share neither path nor lifecycle. Each is owned by exactly one skill (`ad-handoff` and `ad-review` respectively).
- An **Audit handoff** is the maximum-gate sibling flavour, owned by `ad-audit`. It shares the `.agentic/reviews/` directory with the **Review handoff** but differs in producer and shape (per rule-group, not per axis).
- An `ad-audit` run resolves its rule-set as the union of the three **Rule-set layers**; `ad-level-up` writes to exactly one curated layer per accepted rule (machine store or project rules — binding docs belong to their own skills).

## Flagged ambiguities

- "**handoff**" was used in commit messages and skill bodies during the v0.17 cycle to mean both **Session handoff** (output of `ad-handoff`) and **Review handoff** (output of `ad-review`) — resolved by this glossary. Both flavours retain the unqualified noun in informal prose, but commits / SKILL.md / specs / ADRs must qualify going forward.

- "**fresh-context review**" vs "**two-axis review**" — not synonyms. Fresh-context is the WORKFLOW §10 practice (the *what*); two-axis is the kit's implementation (the *how*). Other implementations of fresh-context review are conceivable (one-axis with rotating reviewers, n-axis split, etc.) — the kit ships the two-axis flavour today. Specs and ADRs that discuss the practice use "fresh-context"; those that discuss the implementation use "two-axis".

- "**subagent**" — the Claude Code primitive (`.claude/agents/<name>.md`) is distinct from a Codex sub-agent role (`[agents]` block in `~/.codex/config.toml`). Both are *user-side* role declarations consumed by their host. The kit ships three bundled reviewers on each host — `fresh-context-reviewer` (`ad-review`), `audit-group-reviewer` (`ad-audit`), and `rule-candidate-reviewer` (`ad-level-up`) — as `.claude/agents/<name>.md` for Claude Code and `.codex/agents/<name>.toml` for Codex. On Codex the `.toml` files are role declarations only; dispatch stays user-initiated per ADR-0007 Addendum 2026-05-24. When the host is ambiguous in prose, write "Claude Code subagent" or "Codex sub-agent" explicitly.
