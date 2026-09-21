#!/usr/bin/env node
/**
 * Repository-only entry point for the skill trajectory evaluation harness
 * (Task 0048, Spec 0007). Not shipped to npm: `package.json#files` excludes
 * `eval/`, like `scripts/` and `test/`.
 *
 *   node eval/run.mjs replay <case.json> <receipt.json>
 *   node eval/run.mjs corpus
 *   node eval/run.mjs live <case.json> --host <h> [--trials N] [--out dir] --runner <cmd...>
 *
 * `replay` prints one result record. `corpus` is the replay-lane gate: it
 * evaluates every tracked receipt of every tracked case, prints the coverage
 * report and every failing pair with its reproduction command, and exits 1 on
 * any failure or coverage gap. Exit codes follow GUIDELINES.md §4.2: 0 when
 * everything verifies, grades, and covers; 1 on a usage error, a stale receipt,
 * a grader failure, a hard failure, or a coverage gap; 2 when a case or receipt
 * is malformed.
 */
import { coverageReport, evaluateCorpus } from './lib/corpus.mjs';
import { parseLiveArgs, runLive } from './lib/live.mjs';
import { evaluateReplay } from './lib/replay.mjs';

function usage() {
  console.error(
    'usage: node eval/run.mjs replay <case.json> <receipt.json> | node eval/run.mjs corpus | ' +
      'node eval/run.mjs live <case.json> --host <host> [--trials N] [--out dir] --runner <command...>'
  );
  process.exit(1);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

// A synthetic receipt passes the gate when it verifies and its observed
// failures match its declaration (a broken receipt is supposed to fail); a
// known-good or live receipt must also grade clean with no hard failure.
function failsGate(entry) {
  const { result, receipt } = entry;
  if (result.verification.status !== 'verified') return true;
  if (receipt.origin === 'synthetic') {
    if (result.declared_failure_check.status !== 'matched') return true;
    if (receipt.intent === 'intentionally-broken') return false;
  }
  return result.disposition !== 'pass' || result.hard_failures.length > 0;
}

function runReplay(caseFile, receiptFile) {
  const result = evaluateReplay({ caseFile, receiptFile, root: process.cwd() });
  print(result);
  process.exit(result.disposition === 'pass' && result.hard_failures.length === 0 ? 0 : 1);
}

function runCorpus() {
  const { cases, results } = evaluateCorpus({ root: process.cwd() });
  const coverage = coverageReport(cases);
  const failing = results.filter(failsGate).map((entry) => ({
    case: entry.caseFile,
    receipt: entry.receiptFile,
    disposition: entry.result.disposition,
    verification: entry.result.verification.status,
    hard_failures: entry.result.hard_failures,
    declared_failure_check: entry.result.declared_failure_check,
    reproduction: entry.result.reproduction,
  }));
  print({
    schema: 'agentic-eval-corpus-report/1',
    cases: cases.length,
    receipts: results.length,
    coverage,
    failing,
  });
  process.exit(failing.length === 0 && coverage.gaps.length === 0 ? 0 : 1);
}

// The live lane is never part of a gate: it spawns a real host with the
// operator's environment, so it runs only when a person asks for it by name.
function runLiveLane(argv) {
  const { receipt, workRoot } = runLive(parseLiveArgs(argv));
  print({ receipt, work_root: workRoot });
  process.exit(receipt.trials.every((trial) => trial.outcome.exit_state === 'success') ? 0 : 1);
}

const [command, caseFile, receiptFile] = process.argv.slice(2);
try {
  if (command === 'live') runLiveLane(process.argv.slice(3));
  else if (command === 'replay' && caseFile && receiptFile) runReplay(caseFile, receiptFile);
  else if (command === 'corpus' && !caseFile) runCorpus();
  else usage();
} catch (error) {
  console.error(`eval: ${error.message}`);
  process.exit(2);
}
