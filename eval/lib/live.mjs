import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { freezeArtifact } from '../../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';
import { loadDenylist } from '../../src/leak-guard.js';

import { normalize as normalizeClaudeCode } from './adapters/claude-code.mjs';
import { installFixtureSkills } from './fixture-skills.mjs';
import { observeEnvironment, probeHostVersion } from './host-environment.mjs';
import { readGateEvidence } from './gate-evidence.mjs';
import { normalize as normalizeCodex } from './adapters/codex.mjs';
import { createTrial, pushDerivedEvents, UnterminatedStreamError } from './adapters/common.mjs';

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
const ADAPTERS = { 'claude-code': normalizeClaudeCode, codex: normalizeCodex };
const REQUEST_PLACEHOLDER = '{request}';

function fail(message) {
  throw new Error(message);
}

/**
 * Parse the `live` subcommand's arguments. The runner is required and taken
 * verbatim: `--runner` consumes every remaining argument, so a host invocation
 * keeps its own flags without this parser having to know them.
 */
export function parseLiveArgs(argv) {
  const args = [...argv];
  const caseFile = args.shift();
  if (!caseFile || caseFile.startsWith('--')) fail('live: the first argument is the case file');

  let host = null;
  let trials = 1;
  let out = null;
  let runner = null;

  while (args.length > 0) {
    const flag = args.shift();
    if (flag === '--runner') {
      if (args.length === 0) fail('live: --runner needs the host invocation');
      runner = args.splice(0, args.length);
      break;
    }
    const value = args.shift();
    if (value === undefined) fail(`live: ${flag} needs a value`);
    if (flag === '--host') host = value;
    else if (flag === '--trials') trials = Number(value);
    else if (flag === '--out') out = value;
    else fail(`live: unknown option ${flag}`);
  }

  if (!runner || runner.length === 0) {
    fail('live: --runner is required; this harness never discovers a host binary (ADR-0082)');
  }
  if (!runner.includes(REQUEST_PLACEHOLDER)) {
    fail(
      `live: the --runner invocation must contain ${REQUEST_PLACEHOLDER} where the request goes; ` +
        'appending it would let a variadic flag swallow the prompt'
    );
  }
  if (!host || !(host in ADAPTERS)) {
    fail(`live: --host must be one of ${Object.keys(ADAPTERS).join(', ')}`);
  }
  if (!Number.isInteger(trials) || trials < 1) fail('live: --trials must be a positive integer');

  return { caseFile, host, runner, trials, out };
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
 * Normalize one host result into a trial. A host that exits non-zero, or whose
 * stream ends without a terminal, is data about the run rather than a defect of
 * this harness, so it becomes a failure trial instead of an exception
 * (ADR-0082 decision 6). Only the harness's own defects still throw.
 */
export function captureTrial({ host, caseRecord, trialId, policy, fixtureRoot, result }) {
  const normalizeStream = ADAPTERS[host] ?? fail(`live: no adapter for host "${host}"`);
  const shared = {
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    policy,
    fixtureRoot,
    trialId,
  };
  // A stream the host never terminated says something about the run, not about
  // this harness, so the trial keeps whatever the request and policy already
  // derived and reports the reason. Any other parse defect still throws.
  let trial;
  let unterminated = null;
  try {
    trial = normalizeStream({ lines: String(result.stdout ?? ''), ...shared });
  } catch (error) {
    if (!(error instanceof UnterminatedStreamError)) throw error;
    trial = derivedOnlyTrial(shared);
    unterminated = error.message;
  }

  // A non-zero exit outranks a missing terminal as the reason, because it is
  // the more specific thing that happened: the host said why it stopped.
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim();
    return failureTrial(trial, `host exited ${result.status}: ${stderr}`);
  }
  if (unterminated !== null) return failureTrial(trial, `no terminal record: ${unterminated}`);
  return trial;
}

function derivedOnlyTrial({ request, requestKind, policy, trialId }) {
  const trial = createTrial(trialId);
  pushDerivedEvents(trial, { request, requestKind, policy });
  return trial;
}

function failureTrial(trial, reason) {
  return {
    ...trial,
    outcome: {
      final_response: reason,
      artifact_manifest: trial.outcome?.artifact_manifest ?? [],
      exit_state: 'failure',
    },
  };
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
 * Run one authorized pilot: probe the binary, copy the fixture per trial, spawn
 * the supplied invocation once per copy, gate every captured byte, and write the
 * streams beside the receipt. Nothing is written until every capture has passed
 * the gate, so an abort leaves no partial evidence (ADR-0082 decision 4).
 */
export { observeEnvironment, probeHostVersion };

export function runLive({
  caseFile,
  host,
  runner,
  trials,
  out,
  root = process.cwd(),
  spawn = spawnSync,
}) {
  const caseRecord = JSON.parse(readFileSync(resolve(root, caseFile), 'utf8'));
  const hostVersion = probeHostVersion({ runner, spawn });
  const denylistPatterns = denylistFor(root);
  const fixtureRoot = resolve(root, caseRecord.fixture);
  const workRoot = mkdtempSync(join(tmpdir(), 'agentic-eval-live-'));
  const roots = planTrialRoots({ fixtureRoot, trials, workRoot });
  const fixtureSkills = caseRecord.fixture_skills ?? [];
  // Every trial copy receives the same bytes from the canonical tree, so the
  // digests are a property of the run, not of a trial; the first install's
  // digests are the run's record and the other copies only repeat the copy.
  const installs = roots.map((trialRoot) =>
    installFixtureSkills({ trialRoot, host, skills: fixtureSkills, root })
  );
  const installedSkills = installs[0] ?? {};

  const captures = roots.map((trialRoot, index) => {
    const trialId = `t${index + 1}`;
    // The gate's evidence goes to a directory the lane owns, per trial and
    // outside the copy, so the model never sees it and the lane can join it
    // with the stream afterwards; a hook inherits this environment from the
    // host (GROUND-0028 E6). A case without a wired gate leaves it empty.
    const evidenceDir = join(workRoot, 'gate-evidence', trialId);
    const [command, ...args] = buildRunnerArgv(runner, caseRecord.request);
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
  });

  const receipt = buildLiveReceipt({
    caseRecord,
    host,
    hostVersion,
    environment: observeEnvironment({ host, stream: captures.map((c) => c.stream).join('\n') }),
    scaffold: runner.join(' '),
    runParameters: { trials, ...(fixtureSkills.length ? { fixture_skills: installedSkills } : {}) },
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
  assertNoLeak({ label: 'receipt', text: JSON.stringify(receipt), denylistPatterns });

  const destination = resolveCaptureDir({ out, root, workRoot });
  mkdirSync(destination.path, { recursive: true });
  for (const { trialId, stream, evidence } of captures) {
    writeFileSync(join(destination.path, `${trialId}.jsonl`), stream);
    if (evidence.length === 0) continue;
    writeFileSync(
      join(destination.path, `${trialId}.gate-evidence.jsonl`),
      evidence.map((line) => JSON.stringify(line)).join('\n') + '\n'
    );
  }
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
