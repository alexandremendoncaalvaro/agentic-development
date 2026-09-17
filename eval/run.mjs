#!/usr/bin/env node
/**
 * Repository-only entry point for the skill trajectory evaluation harness
 * (Task 0048, Spec 0007). Not shipped to npm: `package.json#files` excludes
 * `eval/`, like `scripts/` and `test/`.
 *
 *   node eval/run.mjs replay <case.json> <receipt.json>
 *
 * Prints the result record as JSON. Exit codes follow GUIDELINES.md §4.2:
 * 0 when the receipt verifies and every declared grader passes; 1 on a usage
 * error, a stale receipt, or any grader failure; 2 when a case or receipt is
 * malformed. The same command is the reproduction step named in every
 * failure record.
 */
import { evaluateReplay } from './lib/replay.mjs';

const [command, caseFile, receiptFile] = process.argv.slice(2);
if (command !== 'replay' || !caseFile || !receiptFile) {
  console.error('usage: node eval/run.mjs replay <case.json> <receipt.json>');
  process.exit(1);
}

let result;
try {
  result = evaluateReplay({ caseFile, receiptFile, root: process.cwd() });
} catch (error) {
  console.error(`eval: ${error.message}`);
  process.exit(2);
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.disposition === 'pass' ? 0 : 1);
