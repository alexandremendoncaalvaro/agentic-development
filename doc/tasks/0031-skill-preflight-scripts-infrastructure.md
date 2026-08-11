# task-0031: Skill preflight-scripts infrastructure

**Status:** done
**Date:** 2026-08-05
**Depends on:** ADR-0047 (which ships the minimal embedded-snippet version this task supersedes)

## Goal

Let a skill ship executable preflight scripts (`scripts/` beside `SKILL.md`) that install with the skill and that the skill text invokes by path — replacing embedded shell blocks copy-maintained per host. First consumer: `ad-audit`'s deterministic resolution probe (ADR-0047 Decision 1); second candidate: a changed-files enumerator for the file-coverage axis (ADR-0046).

## Checklist

- [x] Decide install routing: extend `manifest.json` (today: `subagents` only) with a `scripts` list, or install the whole skill dir verbatim. Weigh against the idempotency contract (byte-compare + `confirmReplace`) in `src/lib/install.js`.
- [x] Wire packaging: confirm `package.json#files` covers script paths (Gotcha: adding a dir under `src/skills/` does nothing for npm consumers unless listed). Verify with `npm pack --dry-run`.
- [x] Portability bar: scripts must run on macOS + Linux + Windows contributors' shells (the CRLF/`core.symlinks` gotchas apply); decide bash-only-with-guard vs Node scripts (`node:` ESM, matching house style). *(Decision + macOS observed + Linux via the PR's required CI checks; Windows execution remains an OPEN QUESTION — see Notes.)*
- [x] Parity tests: extend `test/skills.test.js` so a skill script present in `src/skills/claude-code/<skill>/scripts/` must have its codex twin (or a documented single-source exception), mirroring the dual-host rule for SKILL.md.
- [x] Migrate `ad-audit`'s embedded resolution probe (both hosts) to the shipped script; remove the duplicated inline blocks; update ADR-0047's "minimal realization" note.
- [x] Dogfood: `node bin/agentic.js update --yes` refreshes installed scripts; state files track their SHAs.
- [x] Self-audit the change with `/ad-audit` before PR.

## Notes

- 2026-08-05 — Created from ADR-0047. The minimal embedded-snippet version is live in `ad-audit` Step 1 (claude) / Step 2 (codex); this task exists so the duplication does not become permanent. The practice's originator ships `references/`, `scripts/`, and posting targets inside skills and names preflight scripts as the highest-leverage under-adopted lever; the kit's leak-guard (ADR-0033) is the in-repo precedent for "deterministic gate as code + tests".
- 2026-08-06 — Routing decision, grounded in `src/lib/install.js`: NO installer or manifest change needed — `walkSkill` already installs every file in the skill dir (only `manifest.json` is excluded), so `scripts/` rides the existing whole-tree walk with the same three-way idempotency contract; the manifest stays subagents-only (it exists to route files OUTSIDE the skill dir). Packaging already covered (`package.json#files` includes all of `src/`; `npm pack --dry-run` lists both host copies of `resolve-rules.mjs` in the tarball). Portability decision: Node ESM `.mjs` (unambiguous ESM without a package.json in scope; no POSIX shell assumed), zero deps, dotfiles filtered and listings sorted for `ls` parity. Observed executions: macOS locally; Linux via the required CI checks on the PR. Windows execution: OPEN QUESTION — no Windows run observed anywhere (CI is ubuntu-only); the claim is design-intent, not verified outcome.
- 2026-08-06 — Evidence (fix round after the `/ad-audit` self-audit; commands run at the final branch head recorded in the PR): `node --test test/skill-scripts.test.js test/skills.test.js` → 169/169 pass; full `npm test` → 366/366 pass, 0 fail, 0 skipped. Parity artifact: extracted the pre-migration shell block from `git show a8a7936:src/skills/claude-code/ad-audit/SKILL.md`, ran it and the new probe side by side from this repo root — `diff` is empty (IDENTICAL). This corrects the earlier note that asserted parity without a recorded artifact — and the first script version was in fact NOT identical (`ls` sorts; the script printed array order) and crashed with zero output on a file-at-rules-path (`ENOTDIR`); both were caught by the audit and are now fixed and pinned by tests ("binding docs are listed sorted", "a file where a rules dir should be reads absent, not a crash"). Test provenance, stated as observed: tests were written before the script in-session and the first run failed with `ERR_MODULE_NOT_FOUND`-class assertions, but that red run is not persisted in the repo — the durable evidence is the audit reviewers' mutation checks (breaking the script or drifting one host copy turns the suite red). Dogfood `update --yes`: `scripts/resolve-rules.mjs` present under `.claude/skills/ad-audit/` and `.agents/skills/ad-audit/`, SHAs tracked in both state files, installed SKILL.md copies carry the migrated invocation.
- 2026-08-06 — Self-audit record (`/ad-audit`): 6 group reviewers + 2 cross-model hardening passes on the CRITICAL claims-verification group (trails `.agentic/reviews/2026-08-06T1451Z-audit31-*.md`), then a closure disposition pass (`...T1509Z-audit31-closure.md`). 16 findings unioned; closure verified 13 resolved with observed evidence, the CI finding resolves via the PR's required checks (`protect-main` ruleset), and its two partials plus one new refinement were fixed here: the sort-parity claim is now scoped (listings sort in locale-independent code-unit order — matches C-locale `ls`, deliberately not the host locale, so trails reproduce across machines; pinned by a mixed-case test) and the Windows checklist item carries its OPEN QUESTION inline.
- 2026-08-06 — Naming note: this file's slug, title, and Goal predate the `CONTEXT.md` "skill script" naming decision and keep "preflight scripts" as an intentional historical record (same convention as AGENTS.md's Historical-naming gotcha); prose written after the decision uses the canonical noun.
- 2026-08-06 — Provenance note: the commits this task shipped were authored and DCO-signed as the test-fixture identity `Audit Test <audit@example.com>` — the git-env leak class later diagnosed and fixed in task-0033 (a fixture `git config` write through hook-leaked `GIT_DIR` poisoned the shared repo config, and commits picked it up). Real authorship: Alexandre Alvaro; the DCO certification intent stands. History stays the immutable ledger; this note is the durable correction.
- 2026-08-11 — Resolution of the historical Windows OPEN QUESTION: the
  current-base [`PR #94`](https://github.com/alexandremendoncaalvaro/agentic-development/pull/94)
  ran the complete suite green on `windows-latest` for Node 20.x and 22.x.
  ADR-0065 records the binding matrix decision and task-0035 records the
  observed required-check contexts. The original checklist parenthetical is
  retained as an append-only historical record; this note is its resolution.
