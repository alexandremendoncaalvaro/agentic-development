import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { freezeArtifact } from '../../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';
import { loadDenylist } from '../../src/leak-guard.js';

import { ADAPTERS, captureTrial } from './capture-trial.mjs';
import { installFixtureSkills } from './fixture-skills.mjs';
import { parseLiveArgs } from './live-args.mjs';
import { observeEnvironment, probeHostVersion } from './host-environment.mjs';
import { readGateEvidence } from './gate-evidence.mjs';
import { repoPath } from './shared.mjs';
import { validateCase } from './validate.mjs';

/**
 * Live lane producer (Spec 0007 R7, ADR-0082). Turns an operator-supplied host
 * invocation into captured streams and one live receipt.
 *
 * Everything that reaches a process is injected: the caller passes `spawn`, so
 * the unit boundary is testable without a host and there is no discovery path
 * here. The harness never searches `PATH`, never reads a host configuration
 * file, and never touches a credential; the operator's shell already holds
 * one, and this module only inherits it (ADR-0082 decision 1).
 */

const RECEIPT_SCHEMA = 'agentic-eval-receipt/1';
const REQUEST_PLACEHOLDER = '{request}';

function fail(message) {
  throw new Error(message);
}

/** The host invocation with the request substituted where the operator placed it. */
export function buildRunnerArgv(runner, request) {
  return runner.map((token) => (token === REQUEST_PLACEHOLDER ? request : token));
}

/** Assemble the live receipt from captured streams, normalizing each through its host adapter. */
export function buildLiveReceipt({
  caseRecord,
  host,
  hostVersion,
  environment,
  scaffold,
  runParameters,
  skill,
  caseSha256,
  fixtureSha256,
  fixtureRoot,
  policy,
  captures,
}) {
  const graderVersions = Object.fromEntries(
    (caseRecord.graders ?? []).map((grader) => [grader.id, grader.version])
  );
  // Every trial goes through the same capture path, so a host that failed
  // produces a failure trial here instead of throwing past the receipt.
  // Paths are relativized against the copy the host actually wrote in: each
  // trial runs in its own copy under the work root, and a path relativized
  // against the tracked fixture instead stays absolute, which the effects
  // grader then refuses as an unauthorized write (GROUND-0028 E5).
  const trials = captures.map((capture) =>
    captureTrial({
      host,
      caseRecord,
      trialId: capture.trialId,
      policy,
      fixtureRoot: capture.root ?? fixtureRoot,
      result: capture.result ?? { status: 0, stdout: capture.stream, stderr: '' },
    })
  );

  return {
    schema: RECEIPT_SCHEMA,
    case_id: caseRecord.id,
    lane: 'live',
    origin: 'live',
    frozen: {
      case_sha256: caseSha256,
      fixture_sha256: fixtureSha256,
      skill,
      host,
      host_version: hostVersion,
      model: environment.model,
      scaffold,
      tools: environment.tools,
      permissions: environment.permissions,
      context_policy: environment.context_policy,
      unmeasured: environment.unmeasured,
      captures: Object.fromEntries(
        captures.map((capture) => [
          capture.trialId,
          createHash('sha256').update(String(capture.stream)).digest('hex'),
        ])
      ),
      run_parameters: runParameters,
      grader_versions: graderVersions,
      trial_count: trials.length,
    },
    trials,
  };
}

/**
 * Refuse to write a captured artifact whose bytes match the repository's
 * leak-guard denylist. A live stream is the one artifact here produced by a
 * model with the operator's environment in reach, so the write is the last
 * place to stop a leak, and the check reuses the one denylist this repository
 * already owns rather than growing a second policy (ADR-0082 decision 4).
 */
export function assertNoLeak({ label, text, denylistPatterns }) {
  const haystack = String(text).toLocaleLowerCase('en-US');
  for (const pattern of denylistPatterns) {
    if (haystack.includes(pattern.toLocaleLowerCase('en-US'))) {
      fail(
        `live: ${label} matches the leak-guard denylist entry "${pattern}"; nothing was written`
      );
    }
  }
}

/**
 * One working copy of the fixture per trial. Repeated trials measure how the
 * model varies, so a write made by trial N must be invisible to trial N+1;
 * sharing one tree would make them measure accumulation (ADR-0082 decision 5).
 */
export function planTrialRoots({
  fixtureRoot,
  trials,
  workRoot,
  copy = cpSync,
  makeDir = mkdirSync,
}) {
  makeDir(workRoot, { recursive: true });
  const roots = [];
  for (let index = 1; index <= trials; index += 1) {
    const root = join(workRoot, `t${index}`);
    copy(fixtureRoot, root, { recursive: true });
    roots.push(root);
  }
  return roots;
}

/**
 * Where a capture is written. Private by default: without an explicit
 * destination it stays under the run's temporary directory, outside the
 * repository. A live capture carries the operator's configuration, not only the
 * trial, and this repository ships no denylist file, so the gate cannot be what
 * keeps a forgotten capture out of a commit (ADR-0082 decision 4).
 */
export function resolveCaptureDir({ out, root, workRoot }) {
  if (!out) return { path: join(workRoot, 'capture'), inRepository: false };
  const path = resolve(root, out);
  // Containment by `relative`, not by a separator literal: a `/` comparison
  // reads a real in-repository path as outside on Windows, which is the one
  // platform where getting this wrong would silently drop the flag.
  const rel = relative(resolve(root), path);
  return { path, inRepository: rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) };
}

/** The repository's own denylist, or an empty policy when the operator has none. */
export function denylistFor(root) {
  const path = join(root, '.agentic', 'leak-denylist.txt');
  return existsSync(path) ? loadDenylist(readFileSync(path, 'utf8')) : [];
}

/**
 * The host inherits the operator's shell (ADR-0082 decision 1) minus the three
 * git discovery variables: a value leaked from a hook or a linked worktree
 * would redirect every `git` the spawned model runs into the leaked location
 * instead of the trial copy (HK.2, task-0033), the same strip every kit
 * script that spawns a child applies.
 */
function cleanGitEnvironment() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

/**
 * Spawn one trial over its copy and gate what it produced. The gate's evidence
 * goes to a directory the lane owns, per trial and outside the copy, so the
 * model never sees it and the lane can join it with the stream afterwards; a
 * hook inherits this environment from the host (GROUND-0028 E6). A case
 * without a wired gate leaves it empty.
 */
function spawnTrial({ trialRoot, trialId, runner, request, workRoot, spawn, denylistPatterns }) {
  const evidenceDir = join(workRoot, 'gate-evidence', trialId);
  const [command, ...args] = buildRunnerArgv(runner, request);
  const result = spawn(command, args, {
    cwd: trialRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...cleanGitEnvironment(), AD_ARTIFACT_GATE_EVIDENCE_DIR: evidenceDir },
  });
  const stream = String(result.stdout ?? '');
  assertNoLeak({ label: `trial ${trialId} stream`, text: stream, denylistPatterns });
  const evidence = readGateEvidence(evidenceDir);
  assertNoLeak({
    label: `trial ${trialId} gate evidence`,
    text: JSON.stringify(evidence),
    denylistPatterns,
  });
  // The host reports paths under the resolved copy (on macOS the temporary
  // directory is a symlink into /private), so relativization uses the
  // resolved root or every write would stay absolute (Task 0084 trial 1).
  return { trialId, stream, result, trialRoot: realpathSync(trialRoot), evidence };
}

/** Every captured stream, and the gate evidence beside it when there is any. */
function writeCaptures(path, captures) {
  mkdirSync(path, { recursive: true });
  for (const { trialId, stream, evidence } of captures) {
    writeFileSync(join(path, `${trialId}.jsonl`), stream);
    if (evidence.length === 0) continue;
    writeFileSync(
      join(path, `${trialId}.gate-evidence.jsonl`),
      evidence.map((line) => JSON.stringify(line)).join('\n') + '\n'
    );
  }
}

/**
 * The error a receipt-assembly defect surfaces as, after the streams it had
 * already gated are written. Keeping them can fail too; the defect stays the
 * cause either way, so the operator never loses the reason the run stopped.
 */
function keepCapturesAfterDefect(path, captures, error) {
  try {
    writeCaptures(path, captures);
    // A reused destination may still hold an earlier run's receipt, which
    // would read as this run's; the lane owns that file name either way.
    rmSync(join(path, 'receipt.json'), { force: true });
  } catch (writeError) {
    return new Error(
      `${error.message}; the captured streams could not be kept in ${path}: ${writeError.message}`,
      { cause: error }
    );
  }
  return new Error(
    `${error.message}; the captured streams were kept in ${path} and no receipt was written`,
    { cause: error }
  );
}

/**
 * Run one authorized pilot: probe the binary, copy the fixture per trial, spawn
 * the supplied invocation once per copy, gate every captured byte, and write the
 * streams beside the receipt. Nothing is written until every capture has passed
 * the gate, so a leak leaves no partial evidence (ADR-0082 decision 4). A
 * receipt that cannot be assembled is this harness's defect, not the host's, so
 * it gets no receipt; the streams it had already gated are still written, since
 * they cost a real model invocation and are what a corrected adapter re-runs
 * against (ADR-0082 decisions 3 and 6, GROUND-0029).
 */
export { ADAPTERS, captureTrial, observeEnvironment, parseLiveArgs, probeHostVersion };

export function runLive({
  caseFile,
  host,
  runner,
  trials,
  out,
  fixtureSkills: fixtureSkillsOverride = null,
  root = process.cwd(),
  spawn = spawnSync,
}) {
  const caseRecord = JSON.parse(readFileSync(resolve(root, caseFile), 'utf8'));
  // Before the version probe: an authoring error in the case costs nothing here.
  validateCase(caseRecord, repoPath(root, caseFile));
  const hostVersion = probeHostVersion({ runner, spawn });
  const denylistPatterns = denylistFor(root);
  const fixtureRoot = resolve(root, caseRecord.fixture);
  const workRoot = mkdtempSync(join(tmpdir(), 'agentic-eval-live-'));
  const roots = planTrialRoots({ fixtureRoot, trials, workRoot });
  const fixtureSkills = fixtureSkillsOverride ?? caseRecord.fixture_skills ?? [];
  const fixtureSkillsSource = fixtureSkillsOverride ? 'runner' : 'case';
  // Recorded whenever anyone said which skills to install, even an empty
  // list: an override to nothing is the arm whose provenance matters most.
  const recordSkills = fixtureSkillsOverride !== null || caseRecord.fixture_skills !== undefined;
  // Every trial copy receives the same bytes from the canonical tree, so the
  // digests are a property of the run, not of a trial; the first install's
  // digests are the run's record and the other copies only repeat the copy.
  const installs = roots.map((trialRoot) =>
    installFixtureSkills({ trialRoot, host, skills: fixtureSkills, root })
  );
  const installedSkills = installs[0] ?? {};

  const captures = roots.map((trialRoot, index) =>
    spawnTrial({
      trialRoot,
      trialId: `t${index + 1}`,
      runner,
      request: caseRecord.request,
      workRoot,
      spawn,
      denylistPatterns,
    })
  );
  const destination = resolveCaptureDir({ out, root, workRoot });

  let receipt;
  try {
    receipt = buildLiveReceipt({
      caseRecord,
      host,
      hostVersion,
      environment: observeEnvironment({ host, stream: captures.map((c) => c.stream).join('\n') }),
      scaffold: runner.join(' '),
      runParameters: {
        trials,
        ...(recordSkills
          ? { fixture_skills: installedSkills, fixture_skills_source: fixtureSkillsSource }
          : {}),
      },
      skill: skillIdentity({ root, host, representative: caseRecord.representative }),
      caseSha256: freezeArtifact(resolve(root, caseFile)).sha256,
      fixtureSha256: freezeArtifact(fixtureRoot).sha256,
      fixtureRoot,
      policy: { grants: [] },
      captures: captures.map(({ trialId, stream, result, trialRoot }) => ({
        trialId,
        stream,
        result,
        root: trialRoot,
      })),
    });
  } catch (error) {
    throw keepCapturesAfterDefect(destination.path, captures, error);
  }
  assertNoLeak({ label: 'receipt', text: JSON.stringify(receipt), denylistPatterns });

  writeCaptures(destination.path, captures);
  writeFileSync(join(destination.path, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  return { receipt, captures, workRoot, destination };
}

/**
 * The frozen skill identity. The digest is taken over the skill's whole
 * directory, because that is what `claimFor` in the replay lane recomputes when
 * it decides whether a live receipt is stale. Digesting the `SKILL.md` alone
 * uses a different scheme entirely, so the two could never agree and every live
 * receipt would be born stale (Spec 0007 R8).
 */
export function skillIdentity({ root, host, representative }) {
  const path = join(root, 'src', 'skills', host, representative);
  return { name: representative, host, sha256: freezeArtifact(path).sha256 };
}
