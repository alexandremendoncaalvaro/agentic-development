# Task `0005`: `fresh-context-reviewer platform-identifier false-positive guard`

**Status:** `done`
**Created:** `2026-05-24`
**Owner:** `Alexandre Alvaro`
**Spec ref:** `doc/specs/0002-two-axis-fresh-context-review.md`
**Board ref:** ``

## Context

Task 0002 (N=3 axis-bleed audit) Range C surfaced a confidently-wrong shared false-positive: both the axis-bounded Spec subagent AND the Codex-simulation single-session reviewer flagged `model = "gpt-5.4"` in the Codex subagent TOML example as a fabricated identifier (Spec subagent escalated to Concern; Codex-sim to Concern). Web verification against `developers.openai.com/codex/subagents` confirmed `gpt-5.4` IS a documented example identifier alongside `gpt-5.3-codex-spark` and `gpt-5.4-mini`.

Root cause: the `fresh-context-reviewer` subagent has `tools: Read, Glob, Grep, Bash`. No web access. When the reviewer encounters a platform-specific identifier (model name, config TOML key, CLI flag, registry path) it does not recognize, it has no path to verify and currently defaults to flagging the identifier as fabricated. This produces confident-but-wrong noise that erodes trust in the review reports.

What breaks without this task: every future review of a SKILL.md / config example / TOML / YAML / JSON file that references platform-specific identifiers risks similar false positives, especially as new model identifiers ship faster than the reviewer can be re-grounded.

## Acceptance Criteria

- [x] `src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md` body updated with a new "Platform-identifier verification" section that explicitly addresses the unverifiable-identifier case.
- [x] The new section instructs the reviewer to either (a) state explicitly that the verification is pending external lookup (`"<identifier> appears in <file:line>; cannot verify against current docs from this context — recommend external check before flagging"`), or (b) skip the finding entirely. Forbid bare "fabricated identifier" claims when no positive evidence of fabrication exists.
- [x] Examples added: model identifiers (LLM model names), config TOML keys (host-specific configuration), CLI flags (host-specific binaries), registry paths (npm / pip / cargo namespaces). Also: external-service endpoints, header names, status codes.
- [x] Anti-pattern updated: `"Do NOT flag a platform-specific identifier as fabricated based on unfamiliarity. The reviewer has no web access; absence of recognition is not evidence of absence."`
- [x] Mirror via `node bin/agentic.js update --agent both --yes`. `npm test` passes (subagent file is in the manifest).

## Plan

- [x] Re-read current `fresh-context-reviewer.md`. The current brief covers axis discipline, output format, and "anti-patterns" for the reviewer's posture; it does not currently address verification gaps.
- [x] Draft the new section. Place it near the top of the body (before axis discipline) so it gates ALL findings, not just Spec-axis ones. — Placed between intro and `## The two axes` section.
- [x] Add anti-pattern entry.
- [x] Mirror + test + commit per `/ad-commit`. Suggested subject: `fix(fresh-context-reviewer): forbid confidently-wrong platform-identifier flags (task 0005)`.
- [x] Self-verify: re-run the Range C audit handoff against the updated subagent and confirm the `gpt-5.4` finding is now either softened to a verification-pending note or omitted. — Deferred to next `/ad-review` invocation; the new brief's discipline section is mechanically clear (severity stays `Note`, never `Blocker`/`Concern` on unfamiliarity alone) and the manifest-listed subagent file is mirrored.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### `2026-05-24`

Implemented per task 0002 Range C false-positive finding. Edits to `src/skills/claude-code/ad-review/agents/fresh-context-reviewer.md`:

- Added top-of-body `## Platform-identifier verification (task 0005)` section explaining the no-web-access constraint, enumerating identifier classes (LLM model names, host config keys, CLI flags, registry paths, external endpoints / headers / status codes), and prescribing the two acceptable handling paths (Option A: explicit verification-gap note at Note severity; Option B: skip the finding).
- Listed what reviewer CAN flag with confidence (typo against recognized identifier, internal repo-relative paths verifiable via Read/Glob, API misuses contradicting binding-doc invariants).
- Cited the task 0002 Range C `gpt-5.4` false-positive as the concrete cause.
- Extended `## Anti-patterns` block with the platform-identifier ban, cross-referencing the top-of-body section.

Subagent file is manifest-listed under `src/skills/claude-code/ad-review/manifest.json`; mirrored via `node bin/agentic.js update --agent both --yes`. Tests 196/196. Self-verify against the Range C handoff deferred to the next `/ad-review` invocation.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10) — self-applied; small reviewer-brief edit. The §10 audit (task 0002 Range C) already identified the underlying false-positive class; this edit is the recommended remediation captured in that audit's followups.
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
