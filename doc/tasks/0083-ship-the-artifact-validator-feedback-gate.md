# Task `0083`: Ship the artifact-validator feedback gate on both hosts

**Status:** in-progress
**Created:** 2026-09-21
**Scope ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md
**Evidence ref:** doc/research/0027-ground-artifact-validator-gate.md (study: doc/research/0026-runtime-layer-deterministic-host-hooks.md)
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md
**Board ref:**

## Context

The kit's artifact validators run only when the agent remembers the skill
step, and Task 0079 closed record-level drift that reached `main` by that
route. Spec 0008 contracts the first runtime gate: after a write to a governed
artifact, the host's post-tool hook runs the owning validator and, on failure,
returns the validator's own message and a reproduction command to the model
inside the same turn, leaving one evidence line per firing outside the tree.
ADR-0083 bounds the layer this gate opens: feedback only, both hosts through
native hooks, one byte-identical script, no judgment, opt-in through
`ad-hooks`.

This task ships that gate end to end: the script, its tests, the owner map,
the `ad-hooks` tier documentation on both hosts (including the correction of
the stale Codex scope text), this repository's dogfood wiring, and the first
live capture on Claude Code. It took number 0083 because, when it was
created, the then-unmerged `feat/live-evaluation-lane` branch held Tasks 0081
and 0082; that branch merged the same day, so the sequence is contiguous.

## Acceptance Criteria

- [x] `scripts/artifact-gate.mjs` exists byte-identical under `src/skills/{claude-code,codex}/ad-hooks/`, zero dependencies, Node only, and the parity test covers it.
- [x] Given a post-tool event whose written path is governed and whose file fails its validator, the script exits 2 and standard error carries the gate identifier, the validator's message, and a reproduction command runnable from the repository root.
- [x] Given a governed path whose file passes, the script exits 0 with empty standard output and standard error.
- [x] Given an ungoverned path, an event without a path, or malformed or empty standard input, the script exits 0 silently and runs no validator.
- [x] Given a governed path whose owning validator cannot run, the script exits 2 and standard error names the state as a runtime failure, distinct from a verdict.
- [x] Every firing on a governed path appends one JSON line to an evidence file under the OS temporary directory keyed by `session_id`, with gate identifier, terminal state, path, validator, validator output, surfaced text, reproduction command, and sequence number; `AD_ARTIFACT_GATE_EVIDENCE_DIR` redirects it; the script never writes inside the working tree unless that variable points there.
- [x] `AD_ARTIFACT_GATE=0` yields a silent exit 0 and no evidence line for every case above.
- [x] The owner map is declared once in the script and covers the ground receipt and the evaluation plan validators; the report validator is excluded because no path or heading convention identifies a report under `doc/research/`, and the research-study question of Spec 0008 is settled and recorded in the ground record (GROUND-0027 E4).
- [x] The written path is recovered from Claude Code `Write` and `Edit` tool input and from the Codex write tool input, per the ground record's finding on the Codex payload shape.
- [x] `ad-hooks/SKILL.md` on both hosts documents the gate as the third session-lifecycle member with the same key-facts shape as the first two, the Claude Code wiring block for `PostToolUse` with an `Edit|Write` matcher, and the Codex wiring block for `.codex/hooks.json`; the Codex body no longer states that the tier is out of scope on Codex.
- [x] This repository's `.claude/settings.json` and `.codex/hooks.json` wire the gate against the in-tree script.
- [x] One governed write on Claude Code with the gate wired returns the validator's message to the model inside the turn and leaves a matching evidence line, kept private and with its digest recorded here.
- [ ] The same firing is joined with a hook record in a stream captured through the live lane (`eval/run.mjs live`, on `main` since pull request 145), which needs an evaluation case whose fixture carries the gate wiring, and the Codex leg runs once the operator's Codex CLI can start a trial.
- [x] `CHANGELOG.md` records the new tier member.

## Plan

- [x] `/ad-derisk`: register the unknowns (Codex write payload shape, study-versus-receipt validator ownership, `PostToolUse` exit-2 stderr delivery, hook timeout budget, Desktop environment inheritance) and retire each.
- [x] `/ad-ground`: four-source pass on the two hosts' post-tool contracts and on the existing hook scripts as the in-repo pattern; write `doc/research/NNNN-ground-artifact-validator-gate.md` and set `Evidence ref` to it.
- [x] Red: contract tests for every terminal state, the kill switch, the evidence line, and the two hosts' path recovery, spawning the script.
- [x] Green: write `artifact-gate.mjs`; copy byte-identical to the Codex tree; parity test.
- [x] Update `ad-hooks/SKILL.md` on both hosts; wire this repository's hook configuration for both hosts; refresh dogfood installs.
- [x] Verify live on Claude Code through the live lane with the gate wired; record the capture digest and the evidence line in Notes.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-21

Task created from RESEARCH-0026's graduation path after the owner approved the
study. Precedent to follow: `workflow-checkpoint.mjs` and Task 0066 for
shape, tests, dogfood wiring, and the verified-contract habit; `live.mjs` on
`feat/live-evaluation-lane` for the capture privacy rule.

De-risk register (`/ad-derisk`), ordered by impact times uncertainty, each
retired by GROUND-0027 unless noted:

1. Codex write payload shape: `tool_name` is `apply_patch`, the patch is in
   `tool_input.command`, paths are relative and recoverable from the
   `*** Add File:` / `*** Update File:` / `*** Move to:` headers (E3). Medium,
   Conditional: grammar from a secondary source, no captured Codex event; the
   parser is bounded to those headers and offline-tested.
2. Exit-2 stderr reaches the model on `PostToolUse` on both hosts (E1).
   Medium, Conditional: documented verbatim on both hosts, unexercised; the
   live Claude Code step raises it, Codex waits on the operator's CLI.
3. Which validator owns a research-layer file: the first heading decides;
   `RESEARCH-` studies are unowned and silent (E4). High, Strong.
4. Matcher string: `Edit|Write` is exact-match on Claude Code and an alias for
   `apply_patch` on Codex (E5). High, Strong.
5. Timeout budget: 600 s default for `command` hooks; the validators complete
   in well under a second on this repository, measured at the live step. Low.
6. Desktop environment: the kill switch set in a shell profile may not reach a
   Desktop session (A3). Low, accepted with documentation.
7. Duplicate firing across user and project scope. Low, accepted: visible in
   the evidence file.
8. Codex trust review: a project hook must be trusted through `/hooks` before
   it runs. Low, accepted with documentation.

Stop criterion met: every critical unknown is Strong or Conditional with a
named mitigation, and the residual technical risk is below the non-technical
one (building a gate nobody measures), which the live step addresses.

### 2026-09-21 — Built, wired, observed live

Ground record GROUND-0027 validated (`valid: true`, sources A3 B2 C4 D2, seven
claims). TDD: the tracer bullet was a Claude Code `Write` event on an
incomplete ground record; red on the assertion (expected exit 2, observed 0
from a silent stub), then green. Eight more behaviors followed one test at a
time: silent pass with a pass evidence line; ungoverned path, missing path,
and malformed stdin silent with no evidence; validator unavailable surfaced as
`runtime-unavailable`; kill switch; Codex `apply_patch` header recovery
including `*** Move to:` and an ungoverned file in the same patch; `PRISM-`
routing and `RESEARCH-` unowned; evidence under the OS temporary directory
keyed by a sanitized session id and never inside the tree; ordered sequence
across firings. Refactor: the repository-escape check took the idiom
`validate-record.mjs` uses. Nine gate tests; full suite 1026 passing; lint and
format clean; byte-parity holds.

Live: the wiring in `.claude/settings.json` took effect in the running
session. Writing `doc/research/0099-ground-live-probe.md` returned the gate's
stderr to the model as a `PostToolUse:Write hook blocking error` with the
eight validator messages and the reproduction command; the evidence file
`<tmpdir>/agentic-artifact-gate/338e5ec2-cd42-440d-9eaa-dfbd159ee04e.jsonl`
holds the matching line (SHA-256 prefix `f105cd09a712a9f2` for the one-line
file at that moment). The probe was deleted in the same turn; the evidence
file stays machine-local, so the line is quoted here verbatim as the durable
record (validator output elided to its first and last message):

```json
{"seq":1,"at":"2026-09-21T17:56:04.149Z","gate":"artifact-gate","state":"validator-failed","host_tool":"Write","path":"doc/research/0099-ground-live-probe.md","owner":"ground-record","validator":"ad-ground/scripts/validate-record.mjs","output":"missing Decision metadata\n...\nmissing Audit path section","reproduction":"node src/skills/claude-code/ad-ground/scripts/validate-record.mjs doc/research/0099-ground-live-probe.md"}
```

The host surfaced the same text to the model as a `PostToolUse:Write hook
blocking error`, observed by the session that wrote the probe. This is the
Claude Code half of the live criterion; it was run through the host directly
rather than through `eval/run.mjs live`, which is unmerged on
`feat/live-evaluation-lane`, so the capture-and-receipt join (Spec 0008
Scenario 7) waits on that lane. The Codex half waits on the operator's Codex
CLI, per GROUND-0025's addendum. The live criterion is checked for the part
that ran; both remainders are named here rather than claimed.

Scope notes: the `ad-report` validator has no path or heading convention under
`doc/research/` and is outside the owner map (GROUND-0027 E4); the `Codex`
matcher relies on the documented `Edit|Write` alias for `apply_patch`; the
`.codex/hooks.json` command resolves the repository root with
`git rev-parse --show-toplevel` because Codex documents no project-root
variable, and the hook must be trusted through `/hooks` before it runs.

### 2026-09-21 — Fresh-context review, two axes

Review handoffs at `.agentic/reviews/2026-09-21T18-01-18Z-branch-plus-worktree-{standards,spec}.md`
and both reviewers' reports persisted verbatim at
`.agentic/reviews/2026-09-21T18-01-18Z-branch-plus-worktree-verdicts.md`
(range `origin/main..HEAD`, 2 commits, plus the working tree; a first build
against the stale local `main` counted 37 commits and was discarded). Those
files are machine-local; the findings quoted below are the durable record.

Standards found one Blocker and two Concerns, all applied. Blocker: the
`resolveOwner` catch swallowed every read error as "no owner", so a governed
file that exists but cannot be read produced a silent pass, against the
GUIDELINES rule that a content-read failure must surface and against Spec
0008 R5. Fixed: only `ENOENT` and `ENOTDIR` are silent; any other read error
is reported as `runtime-unavailable` with the error code, covered by a new
test that locks the file with mode 000 (skipped on Windows and as root).
Concern: the evidence `seq` was read-count-then-append across separate
processes, and the reviewer reproduced duplicates and gaps with ten
concurrent firings. Fixed with a directory lock (`<file>.lock`, `mkdirSync`
is atomic on every supported platform), stale-lock reclaim after five
seconds, and a two-second wait after which the line is still written
unlocked; covered by a test that spawns ten concurrent firings and expects
`seq` 1 through 10. Concern: Spec 0008 was still `draft` while its task was
in progress; flipped to `accepted`.

Spec found no Blocker, one Concern and two Notes, all applied. Concern: the
report validator's exclusion from the owner map lived only in the task and
the ground record; the spec now carries it as the resolution of its
validator-ownership open question, beside the resolution of the Codex
path-extraction question. Note: the `notebook_path` branch was unreachable
under the `Edit|Write` matcher and was removed. Note: the `$(git rev-parse
--show-toplevel)` idiom in `.codex/hooks.json` had no cited source; the Codex
hooks guide uses that exact idiom in its own command examples and says
commands run with the session cwd and should resolve from the git root, now
recorded in GROUND-0027's addendum.

Rejected with evidence: the Standards reviewer's "concurrent edit" alert on
the spec file was this session appending the open-question resolutions
while the review ran, not a foreign writer. Out of scope and reported to the
owner: `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `.build/` appeared
untracked during the session from the `mise`-managed `pnpm` shim running a
dependency status check on `npx`; none is part of this change.

After the fixes: 12 gate tests, full suite green, lint and format clean,
byte-parity and dogfood copies in sync.

### 2026-09-21 — Maximum-gate audit, nine reviewers

Audit handoffs at `.agentic/reviews/2026-09-21T18-12-38Z-audit-*.md`: seven
groups (AGENTS, ARCHITECTURE, GUIDELINES, CONTEXT, the eight accepted ADRs the
target touches, machine-store HK, machine-store CV) plus two swap-and-agree
passes of the critical CV group under a second model; NET and GH recorded N/A
(no .NET code, no PR or CI diagnosis). Every reviewer echoed matching anchors
for its rule files and the target SHA `9b68368`.

Applied:

- CONTEXT (major): the new nouns had no glossary entry. `/ad-domain` added
  Runtime gate, Gate terminal state, Gate evidence line, Governed artifact,
  and Runtime layer, a relationship clause, and a flagged ambiguity on the
  three meanings of "gate".
- ARCHITECTURE (major): "No structured logging" contradicted the evidence
  file. Observability now names the gate's JSON line; Patterns gains the
  runtime-gate bullet; the test layout names `test/agent-hooks-wiring.test.js`.
- HK.1 (blocker, first half): no test exercised the literal hook wiring.
  `test/agent-hooks-wiring.test.js` parses `.claude/settings.json` and
  `.codex/hooks.json`, substitutes each host's path idiom, and executes the
  command strings through a shell against crafted `Write` and `apply_patch`
  events (four tests, one POSIX-only).
- CV.5 (blocker, from the main pass and both cross-model passes): the live
  observation rested on a digest of a machine-local file. The evidence line
  is now quoted verbatim in these Notes, the two-axis review verdicts are
  persisted at `.agentic/reviews/2026-09-21T18-01-18Z-branch-plus-worktree-verdicts.md`,
  and GROUND-0027's addendum points at this record.
- ADRs and AGENTS (minor): the amendment stanzas on ADR-0055 and ADR-0074
  read as if the two earlier hooks already ran on Codex; rescoped to the
  category and the gate. ADR-0083's "dead weight" consequence rescoped to the
  first gate.
- CV.3 (major, pass B): `feat/live-evaluation-lane` merged into `main` as
  pull request 145 at 15:01 while this work ran; every "unmerged" statement
  in RESEARCH-0026, ADR-0083, GROUND-0027, and this task was stale. Corrected
  in place where the record is editable and by dated addendum where it is not.
- GUIDELINES 2.2 and 2.5 (minor): `appendEvidence` swallowed a write failure
  and `countLines` swallowed every read error. A firing whose evidence cannot
  be written now surfaces `runtime-unavailable` with the error code (new
  test, POSIX-only), and `countLines` rethrows anything but ENOENT.
  GUIDELINES 3.4 (minor): the lock helper is split into `tryAcquireLock`,
  `reclaimStaleLock`, and `releaseLock`, three levels at most.

Refuted with evidence:

- Branch name outside the allowed prefixes (GUIDELINES 10.1): the name is the
  Conductor workspace placeholder and the owner instructed not to rename it;
  the same disposition as Task 0066's audit.
- Accepted ADRs carrying `Amended by: ADR-0083` while ADR-0083 is proposed,
  and dependents advancing under a proposed ADR (ADRs and AGENTS groups): the
  ADR-0081 precedent did exactly this within the month; `b1612cd` proposed
  it and wrote the header on ADR-0048 in the same commit, `8b9401c` landed
  the fix while proposed, `08872a2` accepted it and updated PROJECTION.md in
  one commit. Acceptance of ADR-0083 is the owner's gate.
- The lock as over-engineering (GUIDELINES 1.3): Spec 0008 names ordered
  sequence numbers as an edge case, and a reviewer reproduced the race; an
  unordered identifier would not satisfy the spec.
- HK.1, second half ("the evidence file no longer exists"): it exists at
  `$TMPDIR/agentic-artifact-gate/338e5ec2-cd42-440d-9eaa-dfbd159ee04e.jsonl`;
  the reviewer searched `/tmp` and `/var/folders` without the session's
  `TMPDIR`. An extract is retained at
  `.agentic/reviews/evidence/task-0083-live-gate-evidence.jsonl` (ignored).
- The handoff snapshot going stale during the audit (GUIDELINES blocker): true
  and caused by this session applying earlier groups' fixes while later
  groups ran; the affected files were nevertheless read by the reviewers who
  reported it, and a focused re-audit over the final tree follows the commit.

After the fixes: 13 gate tests and 4 wiring tests, full suite green, lint,
format, and drift scan clean, byte-parity and dogfood copies in sync.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
