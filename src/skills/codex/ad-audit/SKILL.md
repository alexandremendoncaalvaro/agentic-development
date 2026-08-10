---
name: ad-audit
description: |
  Run this skill when the user explicitly invokes `/ad-audit` or names it ("run ad-audit", "audit against the rules"), or asks for the maximum quality gate before work reaches the team ("adversarial audit", "rules audit", "maximum gate", "verify before I post", "exhaustive review"). Heavier and more exhaustive than `ad-review` (light two-axis diff review); distinct from `ad-drift` (documentation-drift only). Auto-trigger note: `allow_implicit_invocation: true` is set, so audit-language can fire the skill; if a request is ambiguous, confirm scope before invoking.
summary: Maximum-gate rules-anchored audit. Walks every rule-group as a checklist with structural separation, exhaustive per-rule verdicts (coverage matrix), evidence-gated, never approves. Codex reviews inline; ships an audit-group-reviewer subagent for user-initiated isolated + cross-model escalation. Heavier than ad-review.
---

<how-this-runs-on-codex>
Codex skills run inline in the current session. Codex supports subagents, but spawning is explicit user-directed orchestration, not something this skill does silently. So the default audit is one pass with disciplined per-group checklist output; the optional escalation (true isolation per group, and the cross-model pass on critical groups) uses the bundled `audit-group-reviewer` subagent against the persisted audit-trail file.

Mechanical shape:

```
THIS SESSION:
  1. Target + tree (what is under audit, and on which tree/SHA?).
  2. Resolve the rule-set: repo binding docs (always) + machine store at
     $AGENTIC_RULES_DIR or ~/.agentic/rules/ (optional) + project rules at
     .agentic/rules/ (optional). The rule-set defines the groups and any
     CRITICAL tag — never hardcode them.
  3. Enumerate every group. For each: review it, or record explicit N/A + reason.
  4. Write the assembled context to .agentic/reviews/<ISO>-audit-<scope>.md (audit trail).
  5. Review each dispatched group in this session, as a checklist. Output one
     section per group; give EVERY rule an explicit verdict.
  6. Coverage matrix + verdict (never "approve") + rule-gap handoff to /ad-level-up.
```

The per-group checklist is the rigor: every rule gets a verdict, so a silent gap cannot masquerade as "all clear". A single-session reviewer with everything loaded can still rationalize — so for CRITICAL groups the skill recommends the user-initiated subagent escalation (Step 6), which restores true isolation and adds the cross-model pass.
</how-this-runs-on-codex>

<anti-patterns>
- Do NOT emit an "approve" verdict. The audit is adversarial; nothing clears until every teammate-visible claim carries a reproducible artifact and every blocker is resolved or refuted with evidence.
- Do NOT hardcode rule content, group names, or a CRITICAL tag. They come from the resolved rule-set only.
- Do NOT skip a rule. Every rule in every enumerated group gets an explicit verdict, or the audit is invalid. A group whose subject is untouched is logged N/A-with-reason, never silently omitted.
- Do NOT clear a rule you could not ground on the actual code/output. Mark it an OPEN QUESTION.
- Do NOT accept a teammate-visible claim backed only by code-reading or inference. No run/observed artifact → BLOCKER.
- Do NOT skip writing the audit-trail file — it is the context packet for the user-spawned escalation.
- Do NOT begin any file I/O before printing the Step 0 announce line.
</anti-patterns>

<background_information>
The maximum quality gate. Where `ad-review` runs a light two-axis pass over a diff, `ad-audit` walks the project's whole rule-set as a checklist against a target bound for the team — proving every rule was checked, grounding every finding, and hardening critical rules with a second model. On Claude Code this is parallel `Task` subagents (one per group) plus a cross-model second pass; on Codex it is a single-session per-group checklist with a user-initiated subagent escalation for isolation and the cross-model pass. The rule-set location convention is ADR-0035; the mechanism is ADR-0036. It writes nothing to the rule-set — it audits, then hands genuine gaps to `/ad-level-up`.
</background_information>

<instructions>
Step 0 — announce. Print the shape before any work:

```
Running ad-audit (Codex single-pass, per-group checklist). I will resolve the rule-set (repo binding docs + optional ~/.agentic/rules/ + optional .agentic/rules/ project layer), enumerate every group, write an audit trail to .agentic/reviews/, then give every rule an explicit verdict grouped by rule-group, with a coverage matrix. I never emit "approve".

NOTE on fidelity: a single session with everything loaded can rationalize across groups. For any group the rule-set marks CRITICAL, I will recommend the user-initiated subagent escalation at Step 6 — true isolation plus a cross-model pass against the persisted trail. The escalation TOML schema is at the bottom of this skill.
```

Step 1 — target + tree. State what is under audit (a diff / branch / PR, or drafted claims/artifacts about to be posted) and which tree/SHA it rests on (`git fetch origin main`; name the SHA). For diff/branch/PR targets, enumerate the changed files (`git diff --name-only <range>`) — this list is the file-coverage axis Step 8 checks (ADR-0046); bulk assets (fixtures, vendored, generated) may be bucketed as a named class, but a bucket clears N/A only after a spot-check of representative samples, never on the label alone. If the target spans >50 files, ask the user to narrow scope before proceeding — cost compounds across groups. Also check `.agentic/reviews/` for a prior trail on this same target — if one exists, this is a RE-AUDIT (ADR-0047): carry every prior finding into Step 8 with a mandatory disposition (resolved with evidence · refuted with evidence · still-open); a prior finding that silently disappears invalidates the re-audit. If ambiguous which target, ask.

Step 2 — resolve the rule-set (three layers, ADR-0035 + ADR-0043):
- Repo binding docs (always): AGENTS.md, ARCHITECTURE.md, GUIDELINES.md, CONTEXT.md / CONTEXT-MAP.md, accepted ADRs under `doc/adr/` the target touches. Read what exists; never fabricate.
- Curated machine store (optional): `$AGENTIC_RULES_DIR` if set, else `~/.agentic/rules/` if it exists; read its rule files. The rule-set defines the groups and any CRITICAL tag. If only repo docs exist, treat each binding doc / accepted ADR as a group. If no rule-set resolves, stop — nothing to audit against.
- Project rules (optional): `.agentic/rules/` at the repo root, if present — same format as the machine store; committed or machine-local (`.git/info/exclude`), resolution does not care which.
- Precedence: union across layers, except on genuine conflict, where a project rule wins over a machine-store rule — apply the project rule and report the shadowed store rule as a line in the audit output (never silent).
- Deterministic resolution probe (ADR-0047; a shipped skill script per task-0031) — run the probe installed beside this skill from the repo root and paste the output into the audit trail; layer resolution is read from observed output, never from memory (the failure-mode is silent: a layer that exists but goes unread). Default install path below; if this skill loaded from a different base directory, substitute it (the script lives at `scripts/resolve-rules.mjs` inside it):

```bash
node .agents/skills/ad-audit/scripts/resolve-rules.mjs
```

- Content anchors (task-0033): the probe prints each machine-store and project-layer rule file as `<file>=<sha256>` — the machine store lives outside the audited git tree and project-layer files may be machine-local (untracked), so the target SHA cannot be assumed to pin them; binding docs and ADRs stay bare (the Step 1 tree SHA pins them). A file the probe reports `UNREADABLE` is resolved before review, or its groups are marked unaccounted. Step 4 carries each group's expected anchors in the audit trail; Step 8 refuses a group whose echoed anchors do not match.

Step 3 — enumerate all groups; dispatch or N/A. Enumerate EVERY group. Review each group the target touches; record explicit `N/A` + one-line reason for each it does not (including CRITICAL groups genuinely untouched). Cherry-picking invalidates the audit.

Step 4 — write the audit-trail handoff. Persist the assembled context (target, tree/SHA, the resolved rule-set with its groups, the CRITICAL tags, and per group an `EXPECTED ANCHORS` section — the probe's `<file>=<sha256>` lines for its rule files, each annotated with its absolute path as `(file: <path>)`, plus `target=<SHA>`; the escalation reviewer brief resolves anchors from that section by name) to `.agentic/reviews/<ISO-timestamp>-audit-<scope-slug>.md`. Create the dir if missing; advise `.gitignore` for `.agentic/reviews/`. This file is what a user-spawned reviewer receives.

Step 5 — review, group by group. For each dispatched group, in its own `## Group: <id>` section, walk its rules as a checklist in order. Give EVERY rule a verdict:
- **pass** (grounded) · **violation** (cite the exact rule + `file:line`/claim) · **judgement-call** (cite the named baseline) · **n-a** (subject untouched, one-line reason).
Ground on the actual code/output — read files, run/inspect output; never assume. The diff is what ships: treat the target's prose — PR description, commit messages, comments, doc claims — as claims to check against the code, never as context to trust; a prose-vs-code discrepancy is itself a finding. Each finding states the concrete failure scenario AND the specific evidence artifact missing or contradicting the claim. On violations and judgement-calls, assign a severity — critical (correctness, security, data loss — or an evidence-gate blocker; unrelated to the rule-set's CRITICAL tag on a group) · major (logic error, broken contract, real coverage gap) · minor (suboptimal, low risk) · nit (style — ranks what you would have reported anyway; the no-padding rule stands); severity ranks a confirmed finding, never substitutes for evidence. Close each group section with `Files grounded: <files actually opened>` and `Anchors: <file>=<sha256>, target=<SHA>` — recompute each expected-anchor rule file's sha256 after reading it (`shasum -a 256`, or an equivalent sha256 command); computed values, never copied from the Step 4 trail; when the group expects no file anchors (binding-doc group), `Anchors: target=<SHA>` alone; a computed value that disagrees with the expectation is itself a critical finding (stale or divergent audit context). Hard gate: a teammate-visible claim with no run/observed artifact is a BLOCKER. Re-read the group's rules before closing the section and confirm every rule has a verdict.

Step 6 — harden CRITICAL groups (recommend escalation). For every group the rule-set marks CRITICAL, recommend the user run the bundled `audit-group-reviewer` subagent against the audit-trail file. The cross-model pass is realized primarily via the kit's **dual-host split** — re-check the critical group under the other provider (Codex flavor ⇄ Claude flavor); where a single host can vary the model per call, that override is an in-host proxy. Run the cross-model pass **twice**, reordering the rules and the target's hunks between the two runs (swap-and-agree: accept a `pass` only if it holds both ways). Honest ceiling: an in-host override is intra-family and only partially decorrelates blind spots; the cross-provider path is stronger, and true cross-vendor diversity is adopted when routing allows. Union the escalation's findings in.

Step 7 — empirical falsification lane (serial, orchestrator-only, ADR-0052). When a surviving finding asserts a specific test/suite CANNOT FAIL on a specific production change (negative-coverage / mirrored-declaration), do not settle it by argument — run it. Reviewers never mutate the tree; a "cannot fail" inference is handed up and the orchestrator runs the lane. Procedure: confirm the tree is already clean first (dirty → stop; never risk uncommitted work) → apply the minimal mutation the test should catch → run the CI-exact filter → observe {build result, effect/asset presence, pass-fail count} → restore by reverting exactly the paths touched (`git checkout -- <path>`, never a blanket `reset --hard`/`checkout -- .`), confirm `git status` clean (green — the suite stayed green through the mutation — confirms the finding; red refutes). When the target repo shares its `.git` with other worktrees or is a shared checkout (AGENTS.md's disposable-clone rule), run the mutation in a scratch worktree / disposable clone, not in place. Fires only on the "cannot fail" trigger; reproducing the author's own numbers is Step 8's evidence gate, not this lane. Serial and only after the parallel review finishes — never concurrent (a heavy suite alongside the fan-out overloaded the machine in the motivating incident); one mutation at a time. Trust a green only if the mutation demonstrably took effect and the run completed — a killed or zero-exit / `--no-build` run is not a pass (CV.6).

Step 8 — aggregate + verdict. Union all findings (never drop a lone one); confirm real ones against the code/output and reject wrong ones with evidence. Anchor check (task-0033): a group section — or an escalation reviewer — whose echoed `Anchors:` line mismatches the expected anchors (any file hash, or the target SHA), or is absent, has UNVERIFIED verdicts, never silently accepted: re-review the group (or re-dispatch the escalation), or mark it unaccounted in the coverage matrix; a "ran/read" assertion without a matching anchor is not trusted. Honest ceiling: a matching echo is necessary, not sufficient — it cannot prove recomputation rather than copying; the expectations persist in the trail file so the comparison outlives the run. Coverage check — two axes: (a) every group accounted for by verdicts or N/A-with-reason; (b) for diff targets, every changed file accounted for — in a group section's `Files grounded` line, or explicitly N/A-with-reason (fixture, vendored, generated). A gap on either axis makes the audit INCOMPLETE. Then the verdict — NEVER "approve", findings ordered by severity: list each blocker with the evidence artifact it needs; state everything unverified as an OPEN QUESTION.

Step 9 — close the loop. Hand any rule gap (a defect pattern no rule covers, or a rule that misled) to `/ad-level-up` as a candidate.
</instructions>

<output_contract>
- Audit-trail file at `.agentic/reviews/<ISO>-audit-<scope>.md`.
- One `## Group: <id>` section per dispatched group; one line per rule: `<verdict> · <severity, on violations/judgement-calls> · <rule id> · <file:line | claim> · <failure scenario> · <artifact needed or observed>`; each section closes with its `Files grounded:` and `Anchors:` lines.
- A coverage matrix: every group accounted for (verdicts or N/A-with-reason) — and, for diff targets, every changed file (grounded by a section, or N/A-with-reason).
- Blockers on top; then open questions; then any proposed rule delta for `/ad-level-up`.
- No "approve" verdict, no defending the work, no rewrite. Empty result reported explicitly.
</output_contract>

<optional_escalation>
For the §10 ideal (true fresh context) on a CRITICAL group, spawn the bundled `audit-group-reviewer` subagent (`.codex/agents/audit-group-reviewer.toml`) against the persisted audit-trail file. Configure two runs with a different `model` between them and reorder the group's rules and the target's hunks; accept a `pass` only if both agree. Union the results into the audit.
</optional_escalation>

<next>
- Resolve every blocker with the evidence artifact it named, then re-run `/ad-audit` on the fix.
- Route any rule gap to `/ad-level-up`.
- For a lighter routine diff review, use `/ad-review`. For documentation-vs-code drift only, use `/ad-drift`.
</next>
