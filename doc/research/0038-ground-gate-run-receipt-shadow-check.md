# GROUND-0038: Record gate runs by tree and check them in shadow before push and PR

**Status:** recorded
**Decision:** A zero-dependency `gate-run.mjs` in `ad-hooks` records, after a successful CI-mirror run, a receipt keyed to the git tree of the working copy (computed through an empty temporary index outside the repository), and a zero-dependency `sequence-gate.mjs`, wired as `PreToolUse` on Bash on both hosts, logs a would-block or clear evidence line before `git push` and `gh pr create` by comparing that receipt with `HEAD^{tree}`, always exiting 0 with no output.
**Decision ref:** doc/tasks/0107-check-the-gate-run-receipt-in-shadow.md
**Confidence:** Strong

## Decision and confidence

Both hosts send the shell command to a `PreToolUse` hook as `tool_name: "Bash"` with the text in `tool_input.command`, and both let the call proceed when the hook exits 0 with empty stdout, so one byte-identical script can observe the action without influencing it, which is ADR-0089's shadow contract. The receipt is keyed to the tree, not the commit: the CI-mirror command normally runs before the commit that lands the tested change, so a commit-keyed receipt would name the parent and report a false block on every push. An empty temporary index filled with `git add -A` yields the tree the next commit will have, untracked and modified files included, without touching the real index. The evidence line and its locking reuse the artifact gate's append routine, and the script reuses the kit's precedent of importing a sibling hook script. Axis-2: Strong. The tree identity was measured, the host contract is official documentation on both hosts, and the change only logs.

## Evidence

### E1 — Both hosts pass the shell command to `PreToolUse` as Bash and proceed on exit 0 with no output

**Strength:** High
**Provenance:** A1, A2

Claude Code's input carries `session_id`, `cwd`, `tool_name: "Bash"` and `tool_input.command`; a `PreToolUse` hook's stdout on exit 0 is parsed as JSON when present, so a silent hook prints nothing (A1). Codex sends the same fields, maps `exec_command` to `Bash`, ignores plain stdout for `PreToolUse`, treats exit 0 with no output as success, and skips a new or changed hook until it is trusted (A2). Default timeouts are 600 seconds on both.

### E2 — An empty temporary index yields the tree the next commit will have, without touching the real index

**Strength:** High
**Provenance:** A3, D2, D3

`git write-tree` writes the tree of the index named by `GIT_INDEX_FILE` (A3). Measured: in a scratch repository with one modified and one untracked file, a copy of the index outside the repository refreshed by `git add -A` and written with `git write-tree` gave `8407bc34`, the real index still showed both changes, and after `git add -A` and a commit `HEAD^{tree}` was the same `8407bc34` (D2). A first attempt with the copy inside the repository gave a different tree, because the copy itself was added: the index must live outside the working tree. Seeding from the real index then proved unreliable under test-driven development: a same-size edit within the second of the base commit was recorded as unchanged in 4 of 6 runs, because the copy's fresh mtime defeats git's racy-entry check. An empty index hashes every file's content instead; on this repository it gave the same tree as the seeded copy in 0.20 seconds for 1,019 files, against 0.03 seconds seeded, and the test passed in 10 of 10 runs (D3).

### E3 — The kit has the evidence-line, kill-switch and sibling-import patterns, and no pre-tool gate yet

**Strength:** High
**Provenance:** C1, C2, C3, D1

`artifact-gate.mjs` appends one JSON line per firing under the OS temporary directory with a sequence number and a directory lock, and silences malformed input (C1). `handoff-chip.mjs` imports `recoverPaths` from `artifact-gate.mjs`, the precedent for reusing a sibling hook script (C2). The pre-push runner strips `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE` before running `npm run verify`, so an npm `postverify` script runs with git discovering the repository from its working directory (C3). No `PreToolUse` hook has been wired in the kit's history; the term appears only in skill text and the artifact gate's commit (D1).

### E4 — Prior art gates landing commands on a recorded condition and keeps the deny actionable

**Strength:** Medium
**Provenance:** B1

claude-mods' merge gate is a `PreToolUse` hook on `gh pr merge` and trunk pushes that checks a recorded condition before the action, with the design rule that a deny always carries the fix (B1). This slice never denies; its evidence line carries the command that would produce the missing receipt, which is the same rule applied to a log.

## Source register

- **A1:** Claude Code hooks reference, sections "Common input fields", "PreToolUse", "Exit code 0", "Matcher patterns", https://code.claude.com/docs/en/hooks (accessed 2026-10-07 via WebFetch)
- **A2:** Codex hooks documentation, sections "Common input fields", "PreToolUse", "Matcher patterns", "Review and trust hooks", "Config shape", https://learn.chatgpt.com/docs/hooks (accessed 2026-10-07 via WebFetch)
- **A3:** git documentation, `git-write-tree` and the `GIT_INDEX_FILE` environment variable, https://git-scm.com/docs/git-write-tree and https://git-scm.com/docs/git#Documentation/git.txt-codeGITINDEXFILEcode (accessed 2026-10-07 via the git 2.x manual pages)
- **B1:** yash-gadodia/claude-mods README at f4c1c75, merge-gate hook and design rules, https://github.com/yash-gadodia/claude-mods (accessed 2026-10-07 via gh api)
- **C1:** `src/skills/claude-code/ad-hooks/scripts/artifact-gate.mjs:203-311`, evidence path, lock and append, and `main`'s silent handling of malformed input (accessed 2026-10-07 via Read)
- **C2:** `src/skills/claude-code/ad-hooks/scripts/handoff-chip.mjs`, its import of `recoverPaths` from `./artifact-gate.mjs` (accessed 2026-10-07 via Read)
- **C3:** `scripts/hook-npm-test.js`, `sanitizedEnv` and `defaultGateCommand` (`npm run verify`), wired as the `npm-verify` pre-push command in `lefthook.yml` (accessed 2026-10-07 via Read)
- **D1:** `git log --oneline -S'PreToolUse' -- src/skills scripts .claude .codex` returned 07aef5c, cbc9b66 and ce33ab3, none of which wires a `PreToolUse` hook (accessed 2026-10-07 via Bash)
- **D2:** scratch-repository measurement with git 2.x: `cp .git/index $T/idx; GIT_INDEX_FILE=$T/idx git add -A; GIT_INDEX_FILE=$T/idx git write-tree` before, and `git add -A; git commit; git rev-parse HEAD^{tree}` after, both `8407bc34184a82997ead21d9b6dad34e314c2a7f` (accessed 2026-10-07 via Bash; reproducible with any git on Linux, macOS or Git Bash on Windows)

- **D3:** this repository at 6ec9f9b: `GIT_INDEX_FILE=$T/idx git add -A; git write-tree` from an empty index and from a copy of the real index both gave `7d8b43836cc0c067980f679f0062987005ababb1`, in 0.20 s and 0.03 s real time for 1,019 tracked files; `test/sequence-gate.test.js` failed 4 of 6 runs with the seeded index and passed 10 of 10 with the empty one (accessed 2026-10-07 via Bash, `/usr/bin/time -p`)

## Limitations and reversal

Matching `git push` and `gh pr create` in the command text can miss an aliased or scripted push and can match the words inside a quoted string; the shadow run measures both. The Codex leg is documented, not observed on this machine. A receipt from a run in a dirty tree covers that tree only; if the user commits a subset, the trees differ and the line reads would-block, which is the correct verdict. A host that starts showing `PreToolUse` stdout or blocking on exit 0 would reverse the shape.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs <this-path>`, then reopen every source in the register. Structural validity proves the map, not the source content.
