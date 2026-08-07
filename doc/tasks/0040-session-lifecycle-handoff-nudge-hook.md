# Task `0040`: Ship the session-lifecycle handoff-nudge `Stop` hook in `ad-hooks`

**Status:** done
**Created:** 2026-08-07
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

Long sessions degrade as context fills and compaction is lossy. `ad-handoff` produces a durable, resumable packet but is user-initiated — nothing prompts it before context is lost. This task implements the ADR-0055 decision: a Claude Code `Stop` hook that, once per session and only above a measured size threshold, emits a `systemMessage` nudging the user to run `/ad-handoff`. Delivered as a new session-lifecycle tier in `ad-hooks`, shipped as a Node zero-dependency skill script, and dogfooded in this repo.

The load-bearing runtime finding (verified against the official hooks docs) is recorded in ADR-0055: `PreCompact` cannot inject a message; a `Stop` hook returning `{"systemMessage": …}` on exit 0 with no `decision` stops the session normally, so the nudge cannot loop.

## Acceptance Criteria

- [x] Verified the `Stop` hook contract against official docs and built against the real mechanism (`systemMessage`, non-looping).
- [x] Hook script is Node-only, zero-dependency, cross-platform (`resolve-rules.mjs` precedent).
- [x] Size-gated: silent below threshold; nudges above.
- [x] Once-per-session guard keyed on `session_id` (temp-dir flag file); silent if already fired.
- [x] `stop_hook_active` honored so it cannot loop.
- [x] Contract-tested by mock-stdin invocation: over-threshold→nudge, under→silent, flag-set→silent, `stop_hook_active`→silent, degraded input→silent.
- [x] Script shipped byte-identical to both host trees (byte-parity test).
- [x] `ad-hooks` SKILL.md (both hosts) extended with the session-lifecycle tier; Codex body states it is CC-scoped; frontmatter within test caps.
- [x] Dogfood-wired in `.claude/settings.json` (permissions in `.claude/settings.local.json` preserved).
- [x] `npm test` green.
- [x] ADR-0055 accepted by the owner (ship gate).

## Plan

- [x] Ground the `Stop` contract (WebFetch official hooks docs).
- [x] Measure real transcript-size distribution to set a defensible default threshold.
- [x] Write `src/skills/claude-code/ad-hooks/scripts/handoff-nudge.mjs`; copy byte-identical to codex.
- [x] Add contract tests to `test/skill-scripts.test.js`.
- [x] Write ADR-0055 (proposed) and this task.
- [x] Extend both `ad-hooks/SKILL.md` files (CC tier + Codex scope note).
- [x] Update the README skills-table row for `ad-hooks`.
- [x] Create `.claude/settings.json` with the `Stop` hooks block pointing at the in-tree script.
- [x] Run `npm test` and `node bin/agentic.js update --yes`.

## Notes

### 2026-08-07

- Verified Stop contract: stdin carries `session_id`, `transcript_path`, `stop_hook_active`, `last_assistant_message`, etc. `decision:"block"` and `hookSpecificOutput.additionalContext` both *continue* the turn (loop-prone). `systemMessage` on exit 0 with no `decision` stops normally → chosen as the non-looping nudge surface. Source: https://code.claude.com/docs/en/hooks.md.
- Threshold default 750000 bytes chosen from 2129 real transcripts (median ~0.19 MB, p90 ~0.55 MB, p95 ~0.88 MB) → ≈p93; env-overridable via `AD_HANDOFF_NUDGE_THRESHOLD_BYTES`. Byte size is a heuristic proxy (transcript JSON-Lines schema is undocumented; on-disk size is schema-proof).
- Once-per-session flag in the OS temp dir keyed on sanitized `session_id`; dir overridable via `AD_HANDOFF_NUDGE_STATE_DIR` for tests.
- Codex: session-lifecycle wiring is out of scope (compact-hook context-injection parity undocumented). Script ships to both host trees only to satisfy the byte-parity discipline; Codex does not wire it.
- Dogfood: `.claude/settings.json` points at the in-tree source script (`src/skills/claude-code/ad-hooks/scripts/handoff-nudge.mjs`) rather than an installed copy — `ad-hooks` is not in this repo's installed skill set, and for the kit's own repo the source tree *is* the canonical copy (survives `update`). `.claude/settings.local.json` (permissions) left untouched.
- No git commit per instructions. ADR left `proposed` — owner acceptance is the ship gate.

### 2026-08-07 (fresh-context review fixes)

- Fixed a crash-on-valid-JSON blocker: parseable-but-non-object stdin (`null`, `true`, `42`, `"str"`, `[]`) reached `event.stop_hook_active` and threw a TypeError (exit 1), violating the "always degrade silent" contract. Added a plain-object guard right after the `JSON.parse` try/catch in both host twins of `handoff-nudge.mjs` (kept byte-identical), plus a covering test class in `test/skill-scripts.test.js` (all five payloads → silent exit 0).
- Aligned the threshold-measurement citation across all three places (task, ADR-0055, script docstring): median ~0.19 MB, p90 ~0.55 MB, p95 ~0.88 MB, n=2129, threshold ≈ p93 — the p95 figure was previously present only here.
- Noted in the script header that manual smoke-tests must pipe stdin (blocking `readFileSync(0, …)` hangs in an interactive terminal otherwise).
- Flag-file garbage collection: acknowledged and deliberately NOT added. The once-per-session temp flag has no GC; accepted as low-risk — the files are tiny, idempotent, and live in the OS temp dir the OS itself reclaims.

### 2026-08-07 (close)

Owner accepted ADR-0055. Ratified `proposed` → `accepted`; the ADR state projection updated to 31 accepted ADRs in this same commit. The load-bearing `systemMessage` mechanism was independently re-verified against the official hooks docs before acceptance (documented user-facing warning field; returned alone on exit 0 with no `decision`, the turn stops normally — no loop). Fresh-context Standards review passed after the one blocker (crash on parseable-but-non-object stdin) was fixed and covered by a test. Full suite green at 423. Task closed.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
