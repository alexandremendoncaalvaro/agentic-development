# Task `0001`: Implement the pre-commit house-IP leak-guard

**Status:** in-progress
**Created:** 2026-07-27
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit repo is public, and the upcoming `ad-audit` / `ad-level-up` port is authored next to private, house-specific source material. Without a deterministic backstop, one pasted rule block or one dereferenced symlink leaks house IP into a public, indexed repo. [ADR-0033](../adr/0033-house-ip-leak-guard.md) decides a fail-closed pre-commit lefthook gate as that backstop. This task implements it, and lands before the higher-risk W1 authoring so the guard is active during it.

## Acceptance Criteria

- [x] Committing staged content that matches a pattern in `.agentic/leak-denylist.txt` is blocked with a non-zero exit naming the offending path and pattern.
- [x] Committing a staged file added under `rules/` is blocked, independent of any denylist.
- [x] Committing a staged symlink whose resolved target escapes the repo root is blocked.
- [x] A clean staged change commits without interference.
- [x] With no `.agentic/leak-denylist.txt` present, the denylist check is a silent no-op while the `rules/` and symlink checks still fire.
- [ ] `npm test` passes on Node 20 and 22, including the new `test/leak-guard.test.js`. (Green locally on Node 24; 20/22 confirmed by CI on the PR — not installed in the dev env.)
- [x] The guard adds no skill surface and no `src/lib/profiles.js` entry.

## Plan

- [x] Write `test/leak-guard.test.js` (`node:test` + `node:assert/strict`, modeled on `test/skills.test.js`) covering all block/pass behaviors — red first.
- [x] Write `src/leak-guard.js` (ESM, `node:` built-ins only): read `git diff --cached` (`--raw -z` for verbatim paths), load patterns from `.agentic/leak-denylist.txt` if present, block on any denylist match / `rules/` path add / repo-escaping symlink; exit non-zero with offending path + pattern.
- [x] Add the `pre-commit` block to [`lefthook.yml`](../../lefthook.yml) running `node src/leak-guard.js`, matching the existing `pre-push` shape.
- [x] Add `.agentic/leak-denylist.txt` to [`.gitignore`](../../.gitignore) (root-anchored `/rules/` too); keep `.agentic/leak-denylist.example.txt` committed.
- [x] Ship `.agentic/leak-denylist.example.txt` with generic placeholder patterns and a README section documenting the copy-and-fill setup step.
- [x] Verify `npm pack --dry-run` still ships the guard (`src/` already in `package.json#files`).
- [x] Run `npm test` green; fresh-context `/ad-review` before PR.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-07-27

Task drafted from ADR-0033. First workstream (W2) of the AD-kit-improvements program; sequenced before W1 so the backstop is live during the generic port authoring.

Implemented via TDD (red then green): `src/leak-guard.js` with a pure policy core (`parseRawDiff`, `extractAddedLines`, `loadDenylist`, `findViolations`) plus a thin git-calling `main()`; `test/leak-guard.test.js` covers every branch. Two-axis fresh-context review (WORKFLOW §10, Standards + Spec) ran adversarially. Both axes found the same blocker: git's default `core.quotepath=true` C-quotes non-ASCII paths in `--raw`, so a `rules/` path with an accented character slipped the guard (false-negative). Fixed by switching the raw diff to `--raw -z` (verbatim NUL-delimited paths) plus `-c core.quotepath=false` on the content diff; added a non-ASCII regression test and re-verified end-to-end (the non-ASCII `rules/` case now blocks). Also applied: `lefthook.yml` comment scoped to the real CI mirror; `.gitignore` `rules/` root-anchored to `/rules/`; `main()` wrapped in fail-closed try/catch; `src/leak-guard.js` documented in AGENTS.md layout; known-limitation note (per-line literal substring) added to the example and ADR. Rejected the reviewer suggestion to move the script out of `src/` — ADR-0033 chose `src/` deliberately and the reusability goal wants it shipped. Full suite green: 216/216 on Node 24 (20/22 pending CI).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
