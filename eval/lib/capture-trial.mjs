import { normalize as normalizeClaudeCode } from './adapters/claude-code.mjs';
import { normalize as normalizeCodex } from './adapters/codex.mjs';
import { createTrial, pushDerivedEvents, UnterminatedStreamError } from './adapters/common.mjs';

// Exported so the argument parser's host list can be pinned to it by test.
export const ADAPTERS = { 'claude-code': normalizeClaudeCode, codex: normalizeCodex };

function fail(message) {
  throw new Error(message);
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
    if (!(error instanceof UnterminatedStreamError)) {
      throw new Error(`live: trial ${trialId} could not be normalized: ${error.message}`, {
        cause: error,
      });
    }
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
