#!/usr/bin/env node
/**
 * Commit-msg subject check (task-0032).
 *
 * Length over 72 chars blocks: the check is deterministic, so per ad-hooks'
 * advisory-first debut rule it may block from day one (and the over-length
 * subject is the exact slip that motivated task-0032). Imperative-mood
 * heuristics (trailing period, past-tense opener) only warn — mood detection
 * is not reproducible enough to gate on.
 *
 * Merge/Revert/fixup!/squash! subjects are exempt: git generates them and
 * their length is not author-controlled.
 *
 * The policy core (`checkSubject`) is pure and exercised by
 * `test/commit-gates.test.js`; `main()` reads the message file git passes
 * to the commit-msg hook.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_SUBJECT = 72;
const EXEMPT_RE = /^(Merge |Revert |fixup! |squash! )/;
const PAST_TENSE_OPENERS = new Set([
  'added',
  'adds',
  'bumped',
  'changed',
  'created',
  'fixed',
  'fixes',
  'implemented',
  'removed',
  'updated',
  'updates',
]);

/**
 * Check a commit subject line against the house rules (GUIDELINES.md §10.2).
 *
 * @param {string} subject - the first non-comment line of the commit message
 * @returns {{errors: string[], warnings: string[]}} errors block; warnings do not
 */
export function checkSubject(subject) {
  const errors = [];
  const warnings = [];
  if (EXEMPT_RE.test(subject)) return { errors, warnings };
  if (subject.length > MAX_SUBJECT) {
    errors.push(`subject is ${subject.length} chars — max ${MAX_SUBJECT} (GUIDELINES.md §10.2)`);
  }
  if (subject.endsWith('.')) {
    warnings.push('subject ends with a period — drop it');
  }
  const description = subject.replace(/^[a-z]+(\([^)]*\))?!?:\s*/, '');
  const opener = description.split(/\s+/, 1)[0].toLowerCase();
  if (PAST_TENSE_OPENERS.has(opener)) {
    warnings.push(`"${opener}" reads as past tense — use the imperative mood ("add", not "added")`);
  }
  return { errors, warnings };
}

function main() {
  const messageFile = process.argv[2];
  if (!messageFile) {
    console.error('usage: commit-subject-check.js <commit-message-file>');
    process.exit(2);
  }
  const message = readFileSync(messageFile, 'utf8');
  const subject = message
    .split('\n')
    .find((line) => line.trim() !== '' && !line.startsWith('#'));
  if (subject === undefined) process.exit(0);
  const { errors, warnings } = checkSubject(subject.trim());
  for (const warning of warnings) console.error(`subject-check (advisory): ${warning}`);
  for (const error of errors) console.error(`subject-check: ${error}`);
  process.exit(errors.length > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
