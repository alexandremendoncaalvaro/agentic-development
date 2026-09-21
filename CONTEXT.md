# `@alexandrealvaro/agentic` — Domain Glossary

_Lazy artifact — only contains terms that have been resolved through grilling, spec drafting, or explicit capture. Empty entries are worse than no entry; speculation belongs elsewhere._

_Maintained by `/ad-domain`._

## Language

### Personal voice

**Definition:** the user's stable, owner-specific communication signature, expressed through observable writing and speech patterns while remaining recognizably the same across audience, relationship, channel, and language adaptations.

_Avoid_: "tone" (a temporary situational adjustment, not the stable signature); "persona" (implies a performed identity); "team voice" (other people's writing may inform channel conventions but never evidence the user's personal voice).

### Audience adaptation

**Definition:** a context-specific adjustment to how the user's personal voice addresses a particular reader or relationship without replacing or averaging away that personal voice.

_Avoid_: "voice variant" (suggests multiple identities rather than one voice adapting); "impersonation" (the target audience shapes clarity and register, not identity).

### Communicative identity

**Definition:** the user-approved, language-portable part of a personal voice: how the user takes a position, exposes reasoning, uses examples, expresses certainty, relates to the reader, and balances directness with warmth. It is grounded in observable communication, especially in the user's native language, and rendered through equivalent conventions in another language.

_Avoid_: "psychological profile" (the feature neither diagnoses nor infers hidden traits); "personality type" (a categorical label is not communication evidence); "literal style translation" (surface markers such as fillers and contractions are language-specific).

### Accommodation corpus

**Definition:** an authorized set of messages from the target community, such as a team Slack scope, used to learn shared vocabulary, formality, brevity, politeness, and channel conventions. It shapes how the user's voice fits the community but never counts as evidence of the user's identity.

_Avoid_: "team voice" (the corpus provides conventions, not an identity to imitate); "owner sample" (other authors remain separately attributed); "style target" (distinctive individual phrasing must not be copied).

### Artifact template

**Definition:** a versioned, artifact-type-specific contract for the information,
ordering, selection conditions, provenance, strengths, trade-offs, and limitations
that a publication or report must apply. It stores derived structural rules and
source locators, not raw source artifacts or personal identity.

_Avoid_: "voice template" (personal voice is a separate layer); "prompt" (the
template is durable state with provenance and validation, not transient model
instructions); "example library" (authorized examples may ground a template but
are not retained as the template itself).

**Related code:** curator implementations
[`src/skills/claude-code/ad-template-tune/`](src/skills/claude-code/ad-template-tune/)
and
[`src/skills/codex/ad-template-tune/`](src/skills/codex/ad-template-tune/);
read-only consumers
[`src/skills/claude-code/ad-publish/`](src/skills/claude-code/ad-publish/),
[`src/skills/codex/ad-publish/`](src/skills/codex/ad-publish/),
[`src/skills/claude-code/ad-report/`](src/skills/claude-code/ad-report/), and
[`src/skills/codex/ad-report/`](src/skills/codex/ad-report/). Governed by
[`doc/adr/0071-layer-publication-templates.md`](doc/adr/0071-layer-publication-templates.md).

### Evaluation domain adapter

**Definition:** the optional project-local Markdown contract at
`.agentic/prism/domain.md` that supplies recurring product scope, decision
owners, evidence surfaces, constraints, measures, guardrails, vocabulary, and
rollout controls to the otherwise domain-agnostic `ad-prism` method. Its absence
is valid; live inspected evidence outranks its defaults.

_Avoid_: "company profile" (the adapter is project-scoped and contains no
secrets, personal data, or broad organizational handbook); "Prism config"
(suggests mandatory machine configuration rather than optional evaluation
context); "source store" (it records locators and provenance, not source bodies).

**Related code:**
[`src/skills/codex/ad-prism/references/domain-adapter.md`](src/skills/codex/ad-prism/references/domain-adapter.md)
and its Claude Code twin; governed by
[`doc/adr/0077-adopt-generic-prism-evaluations.md`](doc/adr/0077-adopt-generic-prism-evaluations.md).

### Project evidence source

**Definition:** an explicitly resolved place from which a state-reading skill
gathers current project facts. The repository is always available; an optional
GitHub source may contribute bounded issue and pull-request metadata as primary
or supporting evidence, with provenance, freshness, and failures retained.

_Avoid_: "documentation source" (active evidence can be GitHub work metadata,
not only documents); "project adapter" (conflicts with the evaluation domain
adapter); "source of truth" (authority is expressed by primary and supporting
roles rather than an absolute claim).

**Related code:**
[`src/skills/codex/ad-project-state/`](src/skills/codex/ad-project-state/) and its
Claude Code twin; governed by
[`doc/adr/0079-compose-configurable-project-evidence.md`](doc/adr/0079-compose-configurable-project-evidence.md).

### Project-state packet

**Definition:** the bounded, read-only snapshot produced from resolved project
evidence sources. It carries configuration provenance, observation time, source
roles and status, selected work metadata, and independent failures for a
consumer such as `ad-next`, project-scoped `ad-roadmap`, or standalone
`ad-brief`.

_Avoid_: "roadmap packet" (the collector does not reconcile a roadmap);
"GitHub state" (the repository remains part of the packet); "project summary"
(presentation belongs to the consuming skill).

**Related code:**
[`src/skills/codex/ad-project-state/scripts/project-state.mjs`](src/skills/codex/ad-project-state/scripts/project-state.mjs)
and its Claude Code twin.

### Material evaluation

**Definition:** an evaluation whose result will support a rollout, a
consequential or hard-to-reverse decision, a durable analytical artifact, or a
public material claim. It requires a settled artifact receipt and methodology
audit before its claims enter reporting or publication; ordinary tests and
routine collaboration replies do not.

_Avoid_: "important test" (does not express the decision and publication
consequences); "published evaluation" (materiality applies before publication);
"validated result" (collapses technical verification and fit-for-purpose
validation into one ambiguous verdict).

**Related code:**
[`src/skills/codex/ad-prism/references/assurance.md`](src/skills/codex/ad-prism/references/assurance.md)
and its Claude Code twin; governed by
[`doc/adr/0077-adopt-generic-prism-evaluations.md`](doc/adr/0077-adopt-generic-prism-evaluations.md).

### Collaboration reply

**Definition:** a compact publication inside an active Slack, Discord, GitHub
issue, or pull-request thread. It answers the unresolved question or action with
the smallest grounded, net-new delta the current participants need; it is not
required to stand alone outside that thread.

_Avoid_: "short report" (a reply inherits shared thread context rather than
rebuilding it); "summary" (recapping settled discussion is normally a defect);
"message" alone (too broad to express the active-thread contract).

**Related code:** bundled template
[`src/skills/codex/ad-publish/references/templates/publication/collaboration-reply.md`](src/skills/codex/ad-publish/references/templates/publication/collaboration-reply.md)
and its Claude Code twin; governed by
[`doc/specs/0005-compose-publication-reporting.md`](doc/specs/0005-compose-publication-reporting.md).

### Source-role ledger

**Definition:** the private pre-draft classification of supplied material as
target-thread context, intended outward content, supporting evidence, private
owner-agent deliberation, or constraints. The role determines whether an item may
appear in a publication; only intended outward content creates preservation
invariants.

_Avoid_: "context ledger" (context is only one role); "source list" (a list does
not control inclusion); "publication outline" (the ledger is private selection
state, not visible structure).

**Related code:** [`src/skills/codex/ad-publish/references/evaluation.md`](src/skills/codex/ad-publish/references/evaluation.md)
and [`src/skills/codex/ad-voice/references/application.md`](src/skills/codex/ad-voice/references/application.md),
with byte-identical Claude Code counterparts.

### Kit

**Definition:** the `@alexandrealvaro/agentic` npm package — a CLI plus the source-of-truth `src/skills/` tree that installs the `ad-*` skill set (and bundled Claude Code subagents) into a target project's agent surface.

_Avoid_: "framework" (the kit prescribes nothing at runtime; it just installs files); "tool" (overloaded with host primitives like `Read` / `Bash`); "CLI" (the CLI is `bin/agentic.js` — one part of the kit, not the whole).

**Related code:** [`package.json`](package.json), [`bin/agentic.js`](bin/agentic.js), [`src/skills/`](src/skills/).

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

On Claude Code, the two axes run as parallel `Task` subagent calls with axis-bounded handoffs. On Codex, they run as a single-session pass with axis-separated output (Codex skills cannot programmatically spawn sub-agents — see ADR-0007 Addendum 2026-05-24). Each axis ends with its own verdict; no cross-axis re-ranking; no synthesized "approve".

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

### Review verdicts

**Definition:** the markdown file `ad-review` writes to `.agentic/reviews/<ISO>-<scope>-verdicts.md` at review time, carrying both reviewers' reports verbatim under the Standards and Spec headings. The **Review handoff** proves what a reviewer was given; the verdicts file proves what the review found. A contemporaneous artifact on the reviewing machine, not durable evidence: it shares the gitignored `.agentic/reviews/` directory, so a finding that must outlive the machine is quoted into the tracked record or labelled an open question.

_Avoid_: "review report" (the reply in the session is the report; this is its persisted copy); "verdict file" without the qualifier (the audit's verdict trail is a different producer); "durable evidence" (it is not versioned).

**Related code:** [`src/skills/claude-code/ad-review/SKILL.md`](src/skills/claude-code/ad-review/SKILL.md), [`src/skills/codex/ad-review/SKILL.md`](src/skills/codex/ad-review/SKILL.md).

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

### Release-plan approval

**Definition:** one explicit authorization bound by SHA-256 to a release's
package name and version, dist-tag, release kind or resume tag, base and release
branches, exact PR draft, prerelease flag, and complete direct or delegated
effect list. It remains valid across unchanged stages and non-mutating
interruptions; any target or effect change invalidates it.

_Avoid_: "approve everything" (not bound to a target); "release permission"
(does not express the exact-plan constraint); "bypass" (technical gates remain
mandatory).

**Related code:**
[`src/skills/codex/ad-release/scripts/release-plan.mjs`](src/skills/codex/ad-release/scripts/release-plan.mjs)
and its Claude Code twin; governed by
[`doc/adr/0072-bind-one-approval-to-the-release-plan.md`](doc/adr/0072-bind-one-approval-to-the-release-plan.md).

### Evaluation case

**Definition:** one frozen, versioned unit of skill evaluation: a stable
identifier, a natural request that never names the target skill or its
vocabulary, a sanitized fixture, the expected route and outcome, allowed and
forbidden effects, required approval stops, declared graders, exclusions, and,
for a case the live lane runs, the `fixture_skills` the lane installs into each
trial copy.

_Avoid_: "eval" or "test case" (the unit is the frozen case, not one run of it);
"prompt" as a name for the case (the request is one field of the case; calling
the model-facing request text a prompt, as Spec 0007 R3 does, is fine).

**Related code:** [`eval/cases/`](eval/cases/),
[`eval/lib/replay.mjs`](eval/lib/replay.mjs); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R1).

### Evaluation corpus

**Definition:** the tracked set of evaluation cases and their receipts under
`eval/`, where every case names its **representative** (the skill under
evaluation) and its **case type** (`positive`, `close-negative`, `dormancy`, or
`coexistence`); the corpus gate evaluates every tracked pair and fails on any
uncovered category intersection or representative missing one of its three case
types.

_Avoid_: "test suite" (the unit suite under `test/` runs the harness; the corpus
is what the harness evaluates); "benchmark" (no universal score exists).

**Related code:** [`eval/lib/corpus.mjs`](eval/lib/corpus.mjs),
[`eval/run.mjs`](eval/run.mjs); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R2, R3, R6).

### Evaluation fixture

**Definition:** a tracked, sanitized synthetic micro-repository that an
evaluation case runs against, whose directory digest is frozen into every
receipt; a healthy fixture satisfies its prerequisites and an intentionally
broken one fails for exactly its declared reason.

_Avoid_: "sample repo" (fixtures are digest-frozen inputs, not illustrations);
"test fixture" (the `test/fixtures/` JSON files serve the unit suite, not
evaluation cases).

**Related code:** [`eval/fixtures/`](eval/fixtures/).

### Trial copy

**Definition:** the per-trial working copy of an evaluation fixture that the
live lane spawns the host in: a fresh copy under the lane's temporary work
root, with the skills the case declares in `fixture_skills` installed at the
host's project skills directory, discarded with the run. A trial's recorded
paths are relative to its trial copy.

_Avoid_: "trial" for the directory (a trial is the recorded run, the copy is
where it ran); "fixture" for the copy (the fixture is the tracked, digest-frozen
input; the copy is disposable). The code names the copy's path `trialRoot`.

**Related code:** [`eval/lib/live.mjs`](eval/lib/live.mjs),
[`eval/lib/fixture-skills.mjs`](eval/lib/fixture-skills.mjs).

### Evaluation receipt

**Definition:** the frozen record of one evaluation of a case: origin, frozen
inputs and digests, and one or more trials with their normalized events,
outcome, and recorded judgments; the replay lane evaluates receipts, it does
not create them.

_Avoid_: "result" (the result is what evaluating a receipt produces); "trace"
(a trace is one trial's raw event stream, not the receipt); "freeze receipt"
(the `ad-prism` artifact receipt is a digest of a settled package, not an
evaluation record).

**Related code:** [`eval/receipts/`](eval/receipts/),
[`eval/lib/replay.mjs`](eval/lib/replay.mjs).

### Receipt origin

**Definition:** the declared provenance of an evaluation receipt: `synthetic`
receipts exercise harness mechanics and never carry a behavioral claim; `live`
receipts were recorded by an authorized host run, freeze the canonical skill
digest and grader versions, and are the only receipts that can support a
behavioral claim.

_Avoid_: "lane" (the lane is how a receipt is evaluated; origin is where it came
from); "real" versus "fake" (a synthetic receipt is a legitimate fixture, not a
fake result).

**Related code:** [`eval/lib/replay.mjs`](eval/lib/replay.mjs); decision
recorded in
[`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md`](doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md).

### Evidence lane

**Definition:** the way evaluation evidence is produced: the **replay lane**
verifies and grades tracked receipts offline, without credentials, in the
normal local and CI gate; the **live lane** generates fresh trajectories through
an explicitly authorized host runner and records them as live receipts.

_Avoid_: "mode" (lanes make different claims, not different settings); "CI
lane" (CI runs the replay lane; the lane is defined by what it can claim, not
where it runs).

**Related code:** [`eval/run.mjs`](eval/run.mjs); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R6, R7).

### Behavioral claim

**Definition:** the statement a live receipt may support about current skill
behavior: `current` while its frozen skill digest and grader versions still
match the canonical sources, `stale` once any of them changed; a synthetic
receipt carries `none`.

_Avoid_: "pass" (grading can pass while the claim is stale; the two are reported
separately); "validity" (a stale receipt is still a valid, auditable record of
what happened).

**Related code:** [`eval/lib/replay.mjs`](eval/lib/replay.mjs); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R8, R13).

### Grader

**Definition:** one declared, versioned check applied to every trial of a case:
deterministic graders assert exact facts such as route, files, effects, and
approval stops; judgment graders apply anchored rubrics calibrated against
blind human labels.

_Avoid_: "assertion" (one grader may hold several assertions); "judge" alone
(only a judgment grader is a judge; a deterministic grader is not).

**Related code:** [`eval/lib/replay.mjs`](eval/lib/replay.mjs); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R11).

### Trial

**Definition:** one recorded run of a case inside a receipt, with its own
normalized event stream, outcome, and judgments; repeated trials stay grouped
under their case, which remains the independent unit.

_Avoid_: "run" (a run is the act; the trial is the recorded unit); "sample"
(statistical vocabulary that hides the grouping under the case).

**Related code:** [`eval/receipts/`](eval/receipts/).

### Approval stop

**Definition:** an outward action, declared on an evaluation case as a command
prefix such as `git push` or `gh pr create`, that a trial may run only after an
`approval_granted` event for that action; running it without one is the
`bypassed_approval` hard failure, and a denial that stops the command is the
stop holding.

_Avoid_: "permission" (the host's mechanism; the stop is the case's declared
expectation); "confirmation" (a UI word; the harness grades the recorded event).

**Related code:** [`eval/lib/graders.mjs`](eval/lib/graders.mjs); grounded in
[`doc/research/0024-ground-approval-stops-and-dormancy-grading.md`](doc/research/0024-ground-approval-stops-and-dormancy-grading.md);
decision recorded in
[`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md`](doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R10, R12).

### Dormant skill

**Definition:** a skill, named on an evaluation case under `expected.dormant`,
that must not be invoked during the trial; typically the user-invocable-only
skill a natural request might tempt the model to fire. Its `skill_invoked`
event is the `wrong_routing` hard failure.

_Avoid_: "disabled" (the skill stays installed and available to the user);
"negative case" (a close-negative case may expect a different route, a dormancy
case expects silence from a named skill).

**Related code:** [`eval/lib/graders.mjs`](eval/lib/graders.mjs); decision
recorded in
[`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md`](doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R10, Scenario 5).

### Request kind

**Definition:** whether an evaluation case's request is `natural` (ordinary
user language that must not name the skill, route, framework, or skill
vocabulary) or `explicit` (the user's own slash command, which names the skill
by definition); the neutral-vocabulary rule binds natural requests only.

_Avoid_: "prompt type" (the request is one field of the case); "mode" (a host
word for permissions, not for how the user asked).

**Related code:** [`eval/cases/`](eval/cases/),
[`eval/lib/validate.mjs`](eval/lib/validate.mjs); decision recorded in
[`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md`](doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md).

### Hard failure

**Definition:** a named evaluation failure that is reported outside any
aggregate and cannot be overridden by a score: wrong routing, unauthorized
effects, bypassed approval, unsupported or stale claims, private-context
leakage, corrupted fixtures, and missing provenance.

_Avoid_: "blocker" (that is review vocabulary); "critical" (a severity word,
not the named category).

**Related code:** [`eval/lib/replay.mjs`](eval/lib/replay.mjs); contract in
[`doc/specs/0007-evaluate-skill-trajectories.md`](doc/specs/0007-evaluate-skill-trajectories.md) (R12).

### Host stream

**Definition:** the JSON Lines a host CLI prints in its non-interactive mode
(`claude -p --output-format stream-json --verbose`, `codex exec --json`): the
native record of a **Trial** before normalization. The kit reads it; it does not
define it, so a stream's shape is an observation the adapter tests pin.

_Avoid_: "log" (a log is diagnostic prose; the stream is the structured record
the harness reads); "transcript" (the conversation text; the stream also carries
tool calls, denials, and the result).

**Related code:** decision recorded in
[`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md`](doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md)
(item 10); grounded in
[`doc/research/0025-ground-host-stream-adapters.md`](doc/research/0025-ground-host-stream-adapters.md).

### Runner adapter

**Definition:** the harness module that turns one host's **Host stream** into a
**Trial** in the common receipt shape: normalized events of the ADR-0080
vocabulary, the outcome, every native record kept beside its event, and the
`unmapped` list of records that produced no event, keyed by host shape with
their stream lines. A *fake* runner adapter is the same module fed a sample stream instead of a
spawned host; the live runner composes a spawn with the adapter.

_Avoid_: "Evaluation domain adapter" (the `ad-prism` project-local contract, a
different thing); "parser" (the adapter also derives events the stream cannot
carry, such as an explicit invocation or a policy grant); "driver" (the spawn
is the runner's job, not the adapter's).

**Related code:** decision recorded in
[`doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md`](doc/adr/0080-build-a-bespoke-skill-evaluation-harness.md)
(items 5 and 10).

### Runtime gate

**Definition:** a deterministic check the kit runs from a host's native
lifecycle hook during the turn, over an artifact a skill just wrote or an action
the agent is about to take; the first member is the **artifact-validator gate**,
a feedback gate on `PostToolUse` that runs the owning validator and shows its
message to the model inside the turn (ADR-0083, Spec 0008).

_Avoid_: bare "gate" where the layer is ambiguous — qualify as **runtime gate**
(a host hook during the turn), **corpus gate** (the replay lane's `npm test`
step), or **quality gate** (a git hook or CI check); "enforcement" for the
feedback form (it cannot block: the tool already ran); "hook" as a synonym (the
hook is the host mechanism, the gate is what the kit runs on it).

**Related code:** [`src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs`](src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs);
decision recorded in [`doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md`](doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md).

### Gate terminal state

**Definition:** the one outcome a runtime gate firing ends in, from a closed
set of four: `validator-failed` and `runtime-unavailable` (the gate could not
run its check) reach the model; `validator-passed` and an unowned or malformed
event do not, and the last leaves no evidence.

_Avoid_: "verdict" for `runtime-unavailable` (a gate failure is not a verdict
on the artifact); "pass" for an unowned event (nothing was checked).

**Related code:** `runValidator` and `resolveOwner` in
[`src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs`](src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs).

### Gate evidence line

**Definition:** the one JSON line a runtime gate appends per governed firing to
its **evidence file**, `<tmpdir>/agentic-artifact-gate/<session_id>.jsonl`,
carrying the gate identifier, terminal state, path, validator output, the text
surfaced to the model, a reproduction command, and a per-session sequence
number; machine-local by default and never written inside the working tree
unless the operator redirects it.

_Avoid_: "receipt" (an **Evaluation receipt** is the harness's frozen record; a
gate line is a candidate input to one, not one); "log" (the line is a
structured record a grader can join with a **Host stream**, not diagnostic
prose); "trace".

**Related code:** `appendEvidence` in
[`src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs`](src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs);
the receipt extension is deferred in
[`doc/specs/0008-surface-validator-failures-during-the-turn.md`](doc/specs/0008-surface-validator-failures-during-the-turn.md) (Out of Scope).

### Governed artifact

**Definition:** a file an installed validator owns, identified by its location
and its first heading: under `doc/research/`, a `GROUND-NNNN` record belongs to
`validate-record.mjs` and a `PRISM-NNNN` plan to `validate-plan.mjs`; a
`RESEARCH-NNNN` study and every other path are unowned.

_Avoid_: "tracked file" (git tracking is unrelated); "validated file" (governed
names the ownership, not the outcome).

**Related code:** the owner map in
[`src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs`](src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs);
grounded in [`doc/research/0027-ground-artifact-validator-gate.md`](doc/research/0027-ground-artifact-validator-gate.md) (E4).

### Runtime layer

**Definition:** the optional set of **Runtime gates** the kit wires through the
hosts' native lifecycle hooks, bounded by ADR-0083 to feedback first, both
hosts through one byte-identical script per gate, no judgment in a gate, and
evidence outside the tree; skills-only remains a valid configuration.

_Avoid_: "harness" (the harness is `eval/`, which grades; the runtime layer
runs during the turn); "runtime" alone (the host owns the agent loop); "IDE" or
"orchestrator" (both are PRD non-goals).

**Related code:** decision recorded in
[`doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md`](doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md);
roadmap line in [`doc/product/PRD.md`](doc/product/PRD.md).

## Relationships

- An **Audience adaptation** changes the expression of a **Personal voice** for a reader or relationship; it never changes whose voice it is.
- A **Personal voice** carries the user's **Communicative identity** across languages; an **Accommodation corpus** supplies target-community conventions without supplying identity.
- An **Artifact template** defines the structure of a publication or report; a **Personal voice** defines how the owner communicates through that structure.
- A **Collaboration reply** is selected through an **Artifact template**; its
  **Source-role ledger** keeps shared context and private reasoning out of the
  intended outward content before **Personal voice** is applied.
- A **Project evidence source** contributes facts to a **Project-state packet**;
  state-reading consumers interpret that packet without moving collection or
  provider rules into their own contracts.
- A **Kit** install materializes every bundled **Workflow-operational skill** and **Spec-driven skill** for each selected agent surface (`.claude/skills/` and `.agents/skills/`).
- A **Fresh-context review** is implemented as a **Two-axis review** on every kit-supported host; the implementation differs per host but the noun does not.
- A **Two-axis review** produces one or more **Review handoffs** as its audit trail and one **Review verdicts** file as its persisted output.
- A **Session handoff** and a **Review handoff** are sibling flavours of **Handoff**; they share neither path nor lifecycle. Each is owned by exactly one skill (`ad-handoff` and `ad-review` respectively).
- An **Audit handoff** is the maximum-gate sibling flavour, owned by `ad-audit`. It shares the `.agentic/reviews/` directory with the **Review handoff** but differs in producer and shape (per rule-group, not per axis).
- An `ad-audit` run resolves its rule-set as the union of the three **Rule-set layers**; `ad-level-up` writes to exactly one curated layer per accepted rule (machine store or project rules — binding docs belong to their own skills).
- A **Release-plan approval** authorizes the unchanged release effects that
  `ad-release` delegates to `ad-pr` and release-only `ad-merge`; it never replaces
  their technical gates.
- An **Evaluation case** runs against one **Evaluation fixture** and declares
  the **Graders** applied to every **Trial**; an **Evaluation receipt** records
  one or more trials of that case.
- An **Evaluation receipt** declares a **Receipt origin**; only a `live` origin
  can carry a **Behavioral claim**, and the replay **Evidence lane** evaluates
  receipts of either origin without regenerating them.
- A **Grader** failure or a stale **Behavioral claim** may raise a **Hard
  failure**, which no aggregate result can hide.
- A **Runner adapter** normalizes one **Host stream** into a **Trial**; the
  **Request kind** and the run policy supply the `skill_invoked` and
  `approval_granted` events a non-interactive stream cannot carry.

- A **Runtime gate** runs on a host lifecycle hook and ends in one **Gate terminal state**; a firing on a **Governed artifact** appends one **Gate evidence line**; the **Runtime layer** is the set of such gates. A gate line is joinable with a **Host stream** through the session id, and may later become an **Evaluation receipt** event, a decision the harness owns.

## Flagged ambiguities

- "**handoff**" was used in commit messages and skill bodies during the v0.17 cycle to mean both **Session handoff** (output of `ad-handoff`) and **Review handoff** (output of `ad-review`) — resolved by this glossary. Both flavours retain the unqualified noun in informal prose, but commits / SKILL.md / specs / ADRs must qualify going forward.

- "**fresh-context review**" vs "**two-axis review**" — not synonyms. Fresh-context is the WORKFLOW §10 practice (the *what*); two-axis is the kit's implementation (the *how*). Other implementations of fresh-context review are conceivable (one-axis with rotating reviewers, n-axis split, etc.) — the kit ships the two-axis flavour today. Specs and ADRs that discuss the practice use "fresh-context"; those that discuss the implementation use "two-axis".

- "**subagent**" — the Claude Code primitive (`.claude/agents/<name>.md`) is distinct from a Codex sub-agent role (`[agents]` block in `~/.codex/config.toml`). Both are *user-side* role declarations consumed by their host. The kit ships three bundled reviewers on each host — `fresh-context-reviewer` (`ad-review`), `audit-group-reviewer` (`ad-audit`), and `rule-candidate-reviewer` (`ad-level-up`) — as `.claude/agents/<name>.md` for Claude Code and `.codex/agents/<name>.toml` for Codex. On Codex the `.toml` files are role declarations only; dispatch stays user-initiated per ADR-0007 Addendum 2026-05-24. When the host is ambiguous in prose, write "Claude Code subagent" or "Codex sub-agent" explicitly.

- "**gate**" is overloaded across three layers — the **Runtime gate** (a host hook during the turn, ADR-0083), the **corpus gate** (the replay lane's step inside `npm test`, ADR-0080), and the **quality gates** of `WORKFLOW.md` §11 (git hooks and CI). The unqualified noun stays acceptable where one layer is obvious from the surrounding sentence; specs, ADRs, and skill bodies qualify it.
