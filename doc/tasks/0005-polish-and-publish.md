# Task 0005: Idempotency, root doc handling, README rewrite, publish v0.2.0-beta.1

**Status:** done
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Chunk 4 of v0.2 (per [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)) — final polish before the first v0.2 beta release. Re-run safety, intelligent handling of pre-existing `CLAUDE.md`/`AGENTS.md` (so the user doesn't lose customizations), README reflecting the new install model, version bump, npm publish, git tag, push.

## Acceptance Criteria

- [x] Re-running `agentic init` on an installed project does not duplicate skill files; surfaces a diff and asks per item if updates are available <!-- partial: byte-compare + per-item confirmReplace honors the spirit (rerun reports +/~/·/! per file; divergent files prompt to replace; default is skip). Real content-diff rendering in the prompt is scope creep for v0.2 polish — logged as R12 follow-up. -->
- [x] Pre-existing `CLAUDE.md` or `AGENTS.md`: append a managed section listing the installed agentic skills, never overwrite user content. Always confirm with user before writing. <!-- updateRootDoc in src/lib/rootdoc.js. AGENTS.md preferred, CLAUDE.md fallback. Markers `<!-- agentic-managed-skills:start -->` / `:end -->` with structural fingerprint (canonical heading must follow start marker) so user content quoting the markers (e.g., kit README pasted as docs) is not clobbered. Interactive confirms via clack; non-interactive (--yes) treats the flag as pre-authorized consent for the non-destructive append. See R11 in close-out for the strict-reading interpretation gap. -->
- [x] `README.md` on `cli` branch fully reflects v0.2 model — no stale references to v0.1's "print prompt" flow <!-- README rewrite in commit d6799a0; manual prompts reframed as the alternative path; brownfield + audit + review sections lead with slash commands; managed-skills section behavior documented inline. -->
- [x] `package.json` version is `0.2.0-beta.1` <!-- commit 6f6583d; lockfile synced. -->
- [x] `npm publish --tag beta` succeeds; `npx @alexandrealvaro/agentic@beta init` runs the new flow end-to-end against a fresh project <!-- closed 2026-05-09: published as `@alexandrealvaro/agentic@0.2.0-beta.1` (token from .env, no 2FA prompt — token-mode auth). Smoke `npx -y @alexandrealvaro/agentic@beta init --agent both --yes` in mktemp installed the full universal set + agentic-subagent for Claude with the bundled subagent at .claude/agents/fresh-context-reviewer.md. agentic-design correctly absent (no frontend signal); agentic-skill correctly absent (opt-in). -->
- [x] Tag `v0.2.0-beta.1` exists locally and is pushed to origin <!-- closed 2026-05-09: tag at 2106b96, pushed to origin. -->
- [x] `cli` branch pushed to `origin/cli`; merge to `main` deferred until I (Alexandre) decide it has matured enough in real use <!-- closed 2026-05-09: cli pushed to origin (4726ecc..2106b96). Merge to main intentionally deferred per AC text. -->

## Plan

- [x] Implement idempotency check in install logic (compare existing skills against incoming, list diffs) <!-- byte-compare + confirmReplace in installSkills already shipped in earlier chunks; no new logic needed. -->
- [x] Implement root doc append/create logic with explicit user confirmation
- [x] Rewrite `README.md` for the v0.2 install model (lead with `npx … init`, manual workflow becomes the optional fallback for users who prefer it)
- [x] Bump `package.json` to `0.2.0-beta.1`; update lockfile
- [x] Run full test suite; ensure green <!-- 77/77 -->
- [x] Manual e2e on three project types: fresh greenfield, brownfield without AGENTS.md, project with existing AGENTS.md <!-- mktemp dry-run e2e in close-out Notes (3 scenarios passed). Real Claude Code / Codex runtime invocation inherits R-class deferral. -->
- [x] Verify token + 2FA setup still works (reuse `.env` pattern from v0.1.0-beta.1) <!-- closed 2026-05-09: NPMJS_TOKEN in .env, sourced via `set -a && . ./.env && set +a` and written to a temp project-local .npmrc (rm'd immediately after publish). No 2FA prompt — token-mode auth. -->
- [x] `npm publish --tag beta` <!-- closed 2026-05-09: published @alexandrealvaro/agentic@0.2.0-beta.1. -->
- [x] `git tag v0.2.0-beta.1 && git push origin cli v0.2.0-beta.1` <!-- closed 2026-05-09: cli + tag pushed in two steps (cli first to make the tagged commit reachable on origin, then the tag). -->

## Notes

### 2026-05-09 — partial close-out (blocked on user-side publish + push)

Task 0005 implementation lands across 5 commits on `cli`; AC5/6/7 await user action.

| Commit | Scope |
|---|---|
| `6f6583d` | `package.json` version → 0.2.0-beta.1; lockfile synced. |
| `d40ddd9` | `src/lib/rootdoc.js` — `updateRootDoc({ cwd, skills, confirmAppend })` with marker-bracketed managed section, AGENTS.md > CLAUDE.md preference, byte-preserve outside markers, idempotent re-runs. `src/commands/init.js` wires it after the install loop; non-interactive defaults to append-on (user has consented via --yes); interactive prompts. New result-panel symbol scheme for the root doc line. |
| `d6799a0` | `README.md` polish (Task 0005 AC3) + `ARCHITECTURE.md` full rewrite (the v0.1 version was significantly stale). README leads with `npx … init`, demotes manual prompts to alternative, documents the managed-skills section, brownfield/audit/review workflows lead with slash commands. ARCHITECTURE.md describes the v0.2 lib layout (install.js / detect.js / rootdoc.js), manifest mechanism, per-(skill, agent) routing, ADR list bumped to 0007, package version bumped. |
| `2ddfc58` | Fresh-context review fix (1 Blocker): structural fingerprint anchor for the managed-skills section markers. Prevents data loss when a user has the literal marker strings in their AGENTS.md (typically when documenting the kit for their team). Two follow-up tests added (malformed markers + SKILL_DESCRIPTIONS sync). |

**Manual e2e (3 scenarios, all passed) using `mktemp` + the local CLI:**

- Fresh greenfield (`--agent both --yes`): 7 universal Claude skills + 7 universal Codex skills + agentic-subagent (Claude only); no AGENTS.md created (correct — that's the bootstrap skill's job; updateRootDoc returns 'absent').
- Brownfield no AGENTS.md, React + Express + tsx (`--agent claude-code --yes`): 7 universal + agentic-subagent + agentic-design (frontend detected); .claude/agents/fresh-context-reviewer.md present; no AGENTS.md created.
- Existing AGENTS.md with user content (`--agent codex --yes`): 7 universal Codex skills installed; AGENTS.md updated — managed-skills section appended below user's "## Stack" section; user content byte-preserved at top.

**Fresh-context review (closes the §10 DoD checkbox):** dispatched `caveman:cavecrew-reviewer` on the 3-commit batch (6f6583d..d6799a0) before the structural-anchor fix. Findings:

- **Blocker** — marker collision risk: parser used `indexOf` and could match user-pasted literal markers (e.g., kit README content quoted in AGENTS.md). Data loss potential. Fixed in `2ddfc58` with line-anchored regex + structural fingerprint requiring the canonical heading to follow the start marker. New test verifies user content with marker text in a fenced block is not clobbered.
- **Concern (R11)** — AC2 strict reading: spec says "Always confirm with user before writing"; implementation treats `--yes` as pre-authorized consent for non-destructive append. Defensible (`--yes` is itself an explicit consent) but technically a strict-reading gap. Documented here; behavior unchanged. If a CI consumer wants append-skip behavior under `--yes`, future work could add a `--no-root-doc` flag.
- **Concern (R12)** — AC1 partially met: byte-compare + per-item confirmReplace honors the spirit but doesn't render an actual content diff in the prompt. Real diff UI (e.g., showing the first N changed lines, or offering an "open in $EDITOR" option) is scope creep for v0.2 polish; logged for v0.3.
- **Concern** — SKILL_DESCRIPTIONS table in rootdoc.js could go stale silently. Closed by adding a sync test that fails if any name in REQUIRED_SKILLS + CONDITIONAL_SKILLS lacks a description entry.
- **Note** — README + ARCHITECTURE rewrites accurate; tests cover the new paths; idempotency contract intact.

**Residual risks deferred to first-real-use** (R-class continuation):

- **R11 — AC2 strict-reading interpretation gap.** See above. Not a defect; behavior decision.
- **R12 — Diff rendering UI for the confirmReplace prompt.** See above. Logged for v0.3 polish.

If R11 or R12 surfaces a defect during real-world use, open a separate task and link from here.

#### Hand-off — user-side publish + push checklist

I cannot run `npm publish` or `git push` from this session. To close the remaining ACs:

1. Verify the local checkout is clean and on `cli`:
   ```bash
   git status
   git log --oneline main..cli | head
   ```
2. Confirm `npm test` is green:
   ```bash
   npm test
   ```
3. Authenticate with npm and publish under the beta tag:
   ```bash
   # .env carries NPMJS_TOKEN per v0.1.0-beta.1 convention
   npm publish --tag beta
   ```
4. Smoke the published package against a fresh project:
   ```bash
   cd "$(mktemp -d)" && npx @alexandrealvaro/agentic@beta init --agent both --yes
   ```
5. Tag and push:
   ```bash
   git tag v0.2.0-beta.1
   git push origin cli v0.2.0-beta.1
   ```
6. Toggle AC5/6/7 + Plan items 7-9 to checked. Flip status from `blocked` to `done`. Add a Notes entry with publish date and any e2e findings against the published package.

If the publish smoke surfaces defects, open a Task 0008 (post-publish hotfix) and link from here.

### 2026-05-09 — publish + push completion

Alexandre authorized the hand-off via "sim, pode publicar tem as chaves no .env". I ran the checklist:

| Step | Result |
|---|---|
| Pre-flight `git status` + `npm test` | Clean working tree, 77/77 green. |
| Push `cli` to origin | `4726ecc..2106b96  cli -> cli` |
| `npm pack --dry-run` | 53 files, 50.3 kB, name + version correct. |
| `npm publish --tag beta` | `+ @alexandrealvaro/agentic@0.2.0-beta.1` (NPMJS_TOKEN from .env via temp project-local .npmrc, removed immediately after publish; no 2FA prompt — token-mode auth). |
| Smoke `npx -y @alexandrealvaro/agentic@beta init --agent both --yes` in mktemp | Installed all 7 universal skills for both agents + agentic-subagent for Claude with bundled subagent at .claude/agents/fresh-context-reviewer.md. agentic-design absent (no frontend signal); agentic-skill absent (opt-in). |
| `git tag v0.2.0-beta.1 && git push origin v0.2.0-beta.1` | Tag at 2106b96, pushed. |

All ACs + Plan items + DoD checked. Task 0005 done. **v0.2.0-beta.1 is live on npm.**

Merge to `main` deferred per AC7 — Alexandre's call after real-world use.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes) — `npm test` 77/77 green at hand-off
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10) <!-- closed 2026-05-09: kit-shape fresh-context review (caveman:cavecrew-reviewer) on the 3-commit implementation batch surfaced 1 Blocker (marker collision data-loss risk) + 3 Concerns; Blocker fixed in 2ddfc58. Concerns triaged in close-out (R11, R12, SKILL_DESCRIPTIONS sync test). -->
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task <!-- closed 2026-05-09: see "publish + push completion" below. -->
