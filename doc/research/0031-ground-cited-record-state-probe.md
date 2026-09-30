# GROUND-0031: Probe the git state of records a commit message cites

**Status:** recorded
**Decision:** A read-only Node script bundled with `/ad-commit` extracts record ids from a draft message and classifies each by three git reads plus the working tree: tracked in `HEAD` (`git ls-tree`), added in the index (`git diff --cached --name-status`), present only on disk, or present only in history (`git log -- <pathspec>`); JSON out, exit 0, never blocking.
**Decision ref:** doc/tasks/0092-report-cited-record-state-before-a-commit.md
**Confidence:** Strong

## Decision and confidence

The state of a record relative to the commit being drafted is fully determined by three places git already exposes: the `HEAD` tree, the index, and the working tree. Listing the record directory in the `HEAD` tree answers "already committed"; the cached diff's name-status answers "added by this commit"; a directory read answers "only on disk". History answers the one remaining case, a record archived out of the tree. Each read is a documented git porcelain or plumbing command, the kit already runs the same kind of probe from Node with a cleaned git environment, and no prior attempt exists to reconcile with. Axis-2: Strong. The change is reversible (a bundled script behind an advisory instruction), and every load-bearing claim rests on primary documentation plus a validated reference or an in-repo precedent.

## Evidence

### E1 — Git exposes the index-versus-`HEAD` difference, with per-file status, as a documented command

**Strength:** High
**Provenance:** A2, B1

`git diff --cached` compares the index with `HEAD` and, on an unborn branch, shows every staged change; `--name-status` adds a status letter per path, with `A` for an addition (A2). That is exactly "this commit adds the record". Listing a path through git rather than the filesystem to decide whether it is tracked is established practice: the kernel's `checkpatch.pl` decides trackedness with `git ls-files -- <file>` (B1).

### E2 — Whether a record exists in a given commit is answerable from that commit's tree by path

**Strength:** High
**Provenance:** A1, B2

`git cat-file -e` exits zero when an object exists, and an object may be named as `<tree-ish>:<path>` (A1); GitPython's `is_valid_object` builds on the same `cat-file` existence check to validate references before processing them (B2). Because a record's slug is unknown and only its number is cited, the probe lists the directory in the `HEAD` tree (`git ls-tree --name-only HEAD <dir>/`) and matches the `NNNN-` prefix, which is the tree-listing form of the same question.

### E3 — The kit's own git probes run from Node with `execFileSync`, a stripped git environment, a JSON report, and an unborn-`HEAD` path

**Strength:** High
**Provenance:** C1, C2, C3

`gh-preflight.mjs` removes `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE` before any git call (C1), the leak AGENTS.md records as having rewritten a real repository's identity. `next-number.mjs` reads history with `git log --format= --name-only -- <dir>` and verifies `HEAD` before relying on it (C2). `validate-record.mjs` reads a path argument and prints a JSON report (C3). The new probe follows the same three conventions.

### E4 — Record ids take a small, stable set of forms, and a number is unique within its directory

**Strength:** High
**Provenance:** C4

The last 300 commit messages on `main` cite records only as `ADR-NNNN`, `task-NNNN`, `Task NNNN`, `Spec NNNN`, `GROUND-NNNN`, `spec-NNNN`, `RESEARCH-NNNN`, `task NNNN`, and `PRISM-NNNN` (C4). `GROUND-`, `RESEARCH-`, and `PRISM-` records share `doc/research/` and its single number ledger, so the number alone resolves the file.

### E5 — No prior attempt at a cited-record check exists to reuse or reconcile

**Strength:** High
**Provenance:** D1, D2

`/ad-commit` has never carried a script on either host, and no commit on `main` or the one unmerged sibling branch adds one (D2). Commits that mention "recorded alongside" are messages that applied CV.7 by hand, not tooling (D1).

## Source register

- **A1:** git-cat-file documentation, `-e` and the `<tree-ish>:<path>` object form, git 2.56.0, https://git-scm.com/docs/git-cat-file (accessed 2026-09-30 via WebFetch)
- **A2:** git-diff documentation, `--cached`/`--staged` (index against `HEAD`, all staged changes on an unborn branch) and `--name-status` letters, git 2.56.0, https://git-scm.com/docs/git-diff (accessed 2026-09-30 via WebFetch)
- **B1:** Linux kernel `scripts/checkpatch.pl`, `git_is_single_file`, deciding trackedness with `${git_command} ls-files -- $filename`, as quoted in the LKML thread "Re: [PATCH] checkpatch: Allow not using -f with files that are in git", https://lkml.iu.edu/hypermail/linux/kernel/2010.2/01489.html (accessed 2026-09-30 via WebFetch)
- **B2:** GitPython pull request 1267, `repo.is_valid_object()` built on `git cat-file --batch-check` to validate referenced objects before processing, https://github.com/gitpython-developers/GitPython/pull/1267 (accessed 2026-09-30 via WebFetch)
- **C1:** `src/skills/claude-code/ad-pr/scripts/gh-preflight.mjs:23-29`, `cleanGitEnvironment` deletes `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` before git probes (accessed 2026-09-30 via Read)
- **C2:** `src/skills/claude-code/ad-adr/scripts/next-number.mjs:54,63`, history read with `git log --format= --name-only -- <directory>` and `git rev-parse --verify --quiet HEAD` before relying on `HEAD` (accessed 2026-09-30 via grep)
- **C3:** `src/skills/claude-code/ad-ground/scripts/validate-record.mjs:159,215`, path argument from `process.argv[2]` and a `JSON.stringify` report (accessed 2026-09-30 via grep)
- **C4:** `git log --format=%B -300 | grep -oE "\b(GROUND|RESEARCH|PRISM|ADR|Spec|SPEC|Task|task|spec)[- ][0-9]{4}\b"` on `main` at 9140bb6: ADR 243, task- 82, Task 66, Spec 27, GROUND 26, spec- 7, RESEARCH 7, "task " 1, PRISM 1 (accessed 2026-09-30 via Bash)
- **D1:** `git log main --oneline -S"recorded alongside"` returns b902390 and 6782e1e, both task-record commits applying CV.7 by hand; no tooling (accessed 2026-09-30 via Bash)
- **D2:** `git log main --oneline -- src/skills/claude-code/ad-commit src/skills/codex/ad-commit` lists six commits (0ab4ca8, 1efd695, cbc9b66, f31b09e, 993bb32, 510b4ef), none adding a script; `git log main..feat/stateful-tdd-and-measure-source --oneline -- src/skills/*/ad-commit` is empty: no prior attempt found (accessed 2026-09-30 via Bash)

## Limitations and reversal

The probe classifies records; it cannot tell whether a message *claims* precedence, which stays the agent's reading under CV.7. It resolves ids only in the forms of E4; a new form is invisible until added. It checks the record's presence, not that the record's content already covered the decision the commit implements. Reverse the decision if agents ignore the report in practice (a later audit finds a CV.7 break on a commit the probe classified correctly), in which case the check belongs in a commit-msg gate rather than advice.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0031-ground-cited-record-state-probe.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
