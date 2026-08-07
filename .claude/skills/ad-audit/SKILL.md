---
name: ad-audit
description: Maximum-gate, rules-anchored adversarial audit — the strongest quality gate before work reaches the team. Audits a target (diff, branch, PR, or drafted claims/artifacts about to be posted) against the project's rule-set (repo binding docs plus optional curated machine and project rule layers), fanning out one isolated fresh-context reviewer per rule-group. Every rule gets an explicit verdict (pass / violation / judgement-call / n-a — none skipped, so coverage is a matrix, not a hope), every finding is grounded on the actual code/output and cites the exact rule, and every teammate-visible claim needs a real evidence artifact or it is a blocker. Rule-groups the rule-set marks critical get a second, cross-model pass via the kit's dual-host split. Findings combine by union then filter; never emits an "approve" verdict. Use before posting to the team, opening a PR, or handing off, or on "audit against the rules", "adversarial audit", "maximum gate", "rules audit", "verify before I post", "exhaustive review", "/ad-audit". Heavier and more exhaustive than `ad-review` (light two-axis diff review); distinct from `ad-drift` (documentation-drift only).
summary: Maximum-gate rules-anchored audit. Fans out one fresh-context reviewer per rule-group, exhaustive per-rule verdicts (coverage matrix), cross-model on critical groups via the dual-host split, evidence-gated, never approves. Heavier than ad-review; hands rule gaps to ad-level-up.
allowed-tools: Read, Glob, Grep, Bash, Task
---

# /ad-audit

The maximum quality gate. Where `ad-review` runs a light two-axis pass over a diff, `ad-audit` walks the project's **whole rule-set as a checklist** against a target bound for the team — proving every rule was checked (not just the ones that failed), grounding every finding on real evidence, and hardening the rules that matter most with a second model. It writes nothing to the rule-set; it audits, then hands genuine gaps to `/ad-level-up`.

Adversarial by construction: nothing is approved until every teammate-visible claim carries a reproducible evidence artifact and every blocker is resolved or refuted with evidence.

## Step 0 — Target + tree

State exactly what is under review and which tree it rests on — the tree is part of every claim.

- **Target:** a diff / branch / PR (`git diff <range>`), or a set of drafted claims and artifacts about to be posted (a message, a board comment, a report, a handoff). If ambiguous which, ask.
- **Tree/SHA:** working-tree vs `origin/main` vs a deployed env. `git fetch origin main` and name the SHA under audit.
- **Changed files (diff/branch/PR targets):** enumerate them (`git diff --name-only <range>`) — this list is the file-coverage axis Step 6 checks (ADR-0046). Bulk assets (fixtures, vendored, generated) may be bucketed as a named class rather than listed one by one — but a bucket clears N/A only after a spot-check of representative samples or a mechanical verification of the class, never on the label alone.

**Re-audit (prior trail exists — ADR-0047).** Check `.agentic/reviews/` for a prior trail on this same target. If one exists, this run is a RE-AUDIT: load the latest trail and carry every prior finding into Step 6 with a mandatory disposition — **resolved** (evidence of the fix) · **refuted** (evidence it was wrong) · **still-open**. A prior finding that silently disappears invalidates the re-audit; findings are threads, not snapshots.

When the host exposes `AskUserQuestion`, confirm the target as a multi-choice card.

## Step 1 — Resolve the rule-set (three layers)

Per ADR-0035 and ADR-0043, the rule-set is the union of:

1. **Repo binding docs (always).** `AGENTS.md`, `ARCHITECTURE.md`, `GUIDELINES.md`, `CONTEXT.md` / `CONTEXT-MAP.md`, and accepted ADRs under `doc/adr/` whose subject the target touches. Read what exists; never fabricate.
2. **Curated machine store (optional).** Resolve the path: use `$AGENTIC_RULES_DIR` if set; else `~/.agentic/rules/` if it exists; else skip this layer. Read every rule file it contains.
3. **Project rules (optional).** `.agentic/rules/` at the repo root, if present — same file format as the machine store. It may be committed or machine-local (excluded via `.git/info/exclude`); resolution does not care which.

**Precedence:** union across layers, except on genuine conflict, where a project rule wins over a machine-store rule. Shadowing is never silent — apply the project rule and report the shadowed machine-store rule as a line in the audit output.

The rule-set — not this skill — defines the **groups** and any **critical** tag. Do not invent, resize, or hardcode groups or rule content. If the machine store defines groups explicitly, use them; if only the repo docs exist, treat each binding doc (and each accepted ADR) as a group. If no rule-set resolves at all, stop and tell the user there is nothing to audit against.

**Deterministic resolution probe (ADR-0047; a shipped skill script per task-0031).** Run the probe installed beside this skill from the repo root and paste its output into the audit trail. Layer resolution is read from observed output, never from memory, because this step's failure-mode is silent (a layer that exists but goes unread). The default install path is:

```bash
node .claude/skills/ad-audit/scripts/resolve-rules.mjs
```

If this skill loaded from a different base directory (stated at the top of the skill load), substitute it — the script lives at `scripts/resolve-rules.mjs` inside it.

**Content anchors (task-0033).** The probe prints each machine-store and project-layer rule file as `<file>=<sha256>` — the machine store lives outside the audited git tree and project-layer files may be machine-local (untracked), so the target SHA cannot be assumed to pin them. Binding docs and ADRs stay bare; the Step 0 tree SHA pins them. A file the probe reports `UNREADABLE` is resolved before dispatch, or its groups are marked unaccounted. Step 3 carries each group's expected anchors into its handoff; Step 6 refuses a reviewer whose echoed anchors do not match.

A deterministic value inside a non-deterministic flow: the probe pins what can be pinned; the model reads only the rules the probe proved exist.

## Step 2 — Enumerate all groups; dispatch or record N/A

Enumerate **every** group in the rule-set. For each: **dispatch** an isolated reviewer if the target touches its subject; **record an explicit `N/A` with a one-line reason** if it does not — including critical groups (a critical group genuinely untouched is logged N/A, never silently omitted). Cherry-picking groups, or leaving one unaddressed, invalidates the audit. Coverage is the point.

## Step 3 — Build one handoff per dispatched group

Each reviewer receives **only** its group — no shared history, no other group's rules. Handoff shape:

```
=== AD-AUDIT HANDOFF — GROUP: <group id/name> ===

Audit this target against THIS GROUP's rules only. Walk them as a checklist,
in order; give EVERY rule an explicit verdict. Ground on the actual code/output —
never assume. The diff is what ships: treat the target's prose — PR description,
commit messages, comments, doc claims — as claims to check against the code,
never as context to trust; a prose-vs-code discrepancy is itself a finding.
Cite the exact rule for any flag. A teammate-visible claim backed
only by inference (no run/observed artifact) is a BLOCKER.
After reading each rule file listed under EXPECTED ANCHORS, recompute its
sha256 and echo `Anchors: <file>=<sha256>, target=<SHA>` alongside
`Files grounded` — computed values, never copied; a value that disagrees
with the expectation is itself a finding, never proceeded past silently.

--- TARGET ---
<diff, or the drafted claims/artifacts>

--- TREE/SHA ---
<the tree and SHA under audit>

--- GROUP RULES ---
<the full text of this group's rules — from the repo binding doc / ADR / machine store>

--- CRITICAL? ---
<yes | no — from the rule-set's own tag>

--- EXPECTED ANCHORS ---
<one line per rule file: the probe's `<file>=<sha256>`, annotated with its
 resolvable location as `  (file: <absolute path>)` — the reviewer holds only
 this handoff and must find the file to recompute the hash; omitted for
 binding-doc/ADR groups, which the tree SHA pins>
target=<the Step 0 SHA>

=== END HANDOFF ===
```

Persist each handoff to `.agentic/reviews/<ISO-timestamp>-audit-<group-slug>.md` (create the dir if missing; advise `.gitignore` for `.agentic/reviews/`). If the target spans >50 files, ask the user to narrow scope before dispatching — cost compounds across groups.

## Step 4 — Fan out one reviewer per group, in parallel

Send a single message with one `Task` call per dispatched group, all routing to the bundled `audit-group-reviewer` subagent, each with its group handoff. Parallel dispatch is mandatory — isolation prevents cross-contamination and sequential wastes wall time.

## Step 5 — Harden the CRITICAL groups

For every group the rule-set marks **critical**, beyond its Step-4 reviewer:

- **Cross-model second pass.** Re-run the group under a **different model**. The primary realization is the kit's **dual-host split** — re-check the critical group under the other provider (Claude flavor ⇄ Codex flavor). Where a single host can also vary the model per call (e.g. a `Task` `model` override to a different tier), use that as an in-host proxy. Honest ceiling: an in-host override is intra-family and only *partially* decorrelates blind spots; the cross-provider path is stronger, and true cross-vendor diversity beyond the two hosts is adopted the moment routing allows. Its findings union in.
- **Swap-and-agree.** Run that second pass **twice**, reordering both the rule order and the presentation order of the target's hunks between the two runs. Accept a `pass` for a rule only if it holds in both runs — a verdict that flips on order alone is unresolved, not a pass.
- **Refute pass.** Try to refute each surviving finding against the grounded artifact before it stands.

## Step 6 — Aggregate: union, then filter

- **Union first.** Coverage lives in the union of the independent reviewers — never drop a lone finding for lack of a second voice.
- **Anchor check (task-0033).** Compare each reviewer's echoed `Anchors:` line against its handoff's EXPECTED ANCHORS — every file hash and the target SHA. A mismatch, or a missing echo, makes that reviewer's verdicts **UNVERIFIED** — never silently accepted: re-dispatch the group, or mark it unaccounted in the coverage matrix. A "ran/read" assertion without a matching anchor is not trusted. Honest ceiling: a matching echo is necessary, not sufficient — it cannot prove the reviewer recomputed rather than copied; the expectations persist in the trail file so the comparison outlives the run.
- **Filter as an independent meta-judge.** Do not let reviewers debate or see each other's reasoning (shared-history debate amplifies bias). Confirm real findings against the code/output; reject wrong ones **with evidence**.
- **Coverage check — two axes.** (a) Every group accounted for — a dispatched reviewer's per-rule verdicts, or an explicit N/A-with-reason. (b) For diff targets, every changed file accounted for — it appears in at least one reviewer's `Files grounded` line, or carries an explicit N/A-with-reason (fixture, vendored, generated). A file nobody read is a coverage hole. If either axis has a gap, the audit is INCOMPLETE; resolve before the verdict.

## Step 7 — Verdict

Never emit "approve". Order findings by severity — **critical** (correctness, security, data loss — or an evidence-gate blocker) · **major** (logic error, broken contract, real coverage gap) · **minor** (suboptimal, low risk) · **nit** (style) — so the reader triages instead of wading. The severity value `critical` names a finding; it is unrelated to the rule-set's CRITICAL tag on a *group* (Step 5). Severity ranks confirmed findings; it never relaxes the evidence bar. List each blocker with the evidence artifact it needs; state everything still unverified as an OPEN QUESTION. The bar: nothing clears until every teammate-visible claim carries a reproducible artifact and every blocker is resolved or refuted with evidence.

## Step 8 — Close the loop

If the audit surfaced a defect pattern no rule covers, or a rule that misled or was ambiguous, hand it to `/ad-level-up` as a candidate (it runs the anti-overfitting gates and never writes without approval). An audit that finds a real, generalising gap and raises no candidate is incomplete.

## Output contract

- One `Task` invocation of `audit-group-reviewer` per dispatched group, in parallel; the cross-model second pass on each critical group.
- One line per rule verdict: `<verdict> · <severity, on violations/judgement-calls> · <rule id> · <file:line | claim> · <failure scenario> · <artifact needed>`.
- A **coverage matrix**: every group accounted for — dispatched (per-rule verdicts, anchors verified) or N/A-with-reason — and, for diff targets, every changed file (in a reviewer's `Files grounded` line, or N/A-with-reason) — so coverage is auditable at a glance.
- Blockers grouped on top; then the open-question / still-unverified list; then any proposed rule delta for Step 8.
- No "approve" verdict, no defending the work, no rewrite. Empty result is reported explicitly.

## Next

- Resolve every blocker with the evidence artifact it named, then re-run `/ad-audit` on the fix.
- Route any surfaced rule gap to `/ad-level-up`.
- For a lighter, faster pass on a routine diff, use `/ad-review` instead.
- For documentation-vs-code drift only, use `/ad-drift`.
