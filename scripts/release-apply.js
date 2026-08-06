#!/usr/bin/env node
/**
 * CLI shim between `scripts/release.sh` and the pure logic in
 * `scripts/release-lib.js` (task-0032).
 *
 * Usage:
 *   node scripts/release-apply.js <patch|minor|major|prerelease> \
 *     --date YYYY-MM-DD [--tag-message-file <path>] [--dry-run]
 *
 * Computes the next version, rotates CHANGELOG.md's [Unreleased] section
 * under it, and writes package.json + CHANGELOG.md (+ the annotated-tag
 * message file when requested). `--dry-run` computes and validates but
 * writes nothing. Prints the new version alone on stdout so the shell
 * caller can capture it; progress goes to stderr.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { bumpVersion, rotateChangelog } from './release-lib.js';

function parseArgs(argv) {
  const args = { kind: null, date: null, tagMessageFile: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--date') {
      args.date = argv[i + 1];
      i += 1;
    } else if (arg === '--tag-message-file') {
      args.tagMessageFile = argv[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (args.kind === null) {
      args.kind = arg;
    } else {
      throw new Error(`unexpected argument "${arg}"`);
    }
  }
  if (args.kind === null || args.date === null) {
    throw new Error(
      'usage: release-apply.js <patch|minor|major|prerelease> --date YYYY-MM-DD ' +
        '[--tag-message-file <path>] [--dry-run]'
    );
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const newVersion = bumpVersion(pkg.version, args.kind);
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const { text, section } = rotateChangelog(changelog, newVersion, args.date);
  if (args.dryRun) {
    console.error(`[dry-run] would bump package.json ${pkg.version} -> ${newVersion}`);
    console.error(`[dry-run] would rotate [Unreleased] into [${newVersion}] - ${args.date}:`);
    console.error(section.replace(/^/gm, '  '));
  } else {
    const oldVersion = pkg.version;
    pkg.version = newVersion;
    writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
    writeFileSync('CHANGELOG.md', text);
    if (args.tagMessageFile !== null) {
      writeFileSync(args.tagMessageFile, `${newVersion}\n\n${section}\n`);
    }
    console.error(`bumped package.json ${oldVersion} -> ${newVersion}; rotated CHANGELOG.md`);
  }
  console.log(newVersion);
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
