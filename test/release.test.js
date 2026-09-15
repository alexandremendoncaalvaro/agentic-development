import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bumpVersion, rotateChangelog } from '../scripts/release-lib.js';

const PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url));

test('package.json exposes the ADR-0048 release script for ad-release', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'));
  assert.equal(pkg.scripts.release, './scripts/release.sh');
});

test('package.json publishes prerelease builds to the latest dist-tag (ADR-0066)', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'));
  assert.equal(pkg.publishConfig.tag, 'latest');
});

test('package.json exposes the ADR-0078 stable runtime and verification contract', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'));
  assert.equal(pkg.engines.node, '>=22.13.0');
  assert.equal(pkg.scripts.lint, 'eslint .');
  assert.match(pkg.scripts['format:check'], /^prettier --check /);
  assert.match(pkg.scripts['format:check'], /"bin\/\*\*\/\*\.js"/);
  assert.doesNotMatch(pkg.scripts['format:check'], /'/);
  assert.equal(pkg.scripts['security:audit'], 'npm audit --audit-level=high');
  assert.equal(
    pkg.scripts.verify,
    'npm run lint && npm run format:check && npm test && npm run security:audit'
  );
  assert.equal(pkg.scripts.prepublishOnly, 'npm run verify');
});

// --- bumpVersion — SemVer releases with an explicit beta continuation ---

test('bumpVersion: patch promotes a beta core and increments a stable patch', () => {
  assert.equal(bumpVersion('0.19.0-beta.1', 'patch'), '0.19.0');
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
});

test('bumpVersion: minor promotes a beta minor core and increments a stable minor', () => {
  assert.equal(bumpVersion('0.19.0-beta.1', 'minor'), '0.19.0');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
});

test('bumpVersion: major promotes the pre-1.0 beta line to stable 1.0.0', () => {
  assert.equal(bumpVersion('0.20.0-beta.11', 'major'), '1.0.0');
});

test('bumpVersion: prerelease increments the beta counter only', () => {
  assert.equal(bumpVersion('0.19.0-beta.1', 'prerelease'), '0.19.0-beta.2');
  assert.equal(bumpVersion('0.18.0-beta.5', 'prerelease'), '0.18.0-beta.6');
});

test('bumpVersion: prerelease on a stable version starts the next patch beta at one', () => {
  assert.equal(bumpVersion('1.2.3', 'prerelease'), '1.2.4-beta.1');
});

test('bumpVersion: major follows SemVer for stable and beta versions', () => {
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(bumpVersion('1.0.0-beta.1', 'major'), '1.0.0');
});

test('bumpVersion: non-beta prerelease suffix throws', () => {
  assert.throws(() => bumpVersion('0.19.0-rc.1', 'unsupported'), /X\.Y\.Z/);
});

test('bumpVersion: unknown kind throws', () => {
  assert.throws(() => bumpVersion('0.19.0-beta.1', 'banana'), /unknown bump kind/);
});

test('bumpVersion: garbage version throws', () => {
  assert.throws(() => bumpVersion('not-a-version', 'patch'), /X\.Y\.Z/);
});

// --- rotateChangelog ---

const SAMPLE = `# Changelog

Intro line.

## [Unreleased]

### Added

- New thing one.
- New thing two.

## [0.19.0-beta.1] - 2026-08-05

### Added

- Old thing.
`;

test('rotateChangelog: moves [Unreleased] content under the new version heading', () => {
  const { text } = rotateChangelog(SAMPLE, '0.20.0-beta.1', '2026-08-10');
  const unreleasedAt = text.indexOf('## [Unreleased]');
  const newAt = text.indexOf('## [0.20.0-beta.1] - 2026-08-10');
  const oldAt = text.indexOf('## [0.19.0-beta.1] - 2026-08-05');
  assert.ok(unreleasedAt !== -1, 'keeps an [Unreleased] heading');
  assert.ok(newAt !== -1, 'adds the new version heading with its date');
  assert.ok(unreleasedAt < newAt && newAt < oldAt, 'newest-first ordering');
  const emptied = text.slice(unreleasedAt, newAt);
  assert.ok(!emptied.includes('New thing'), '[Unreleased] is emptied');
  const newSection = text.slice(newAt, oldAt);
  assert.ok(newSection.includes('- New thing one.'), 'content moved under the new version');
  assert.ok(newSection.includes('- New thing two.'));
});

test('rotateChangelog: preserves the header above and releases below', () => {
  const { text } = rotateChangelog(SAMPLE, '0.20.0-beta.1', '2026-08-10');
  assert.ok(text.startsWith('# Changelog\n\nIntro line.'));
  assert.ok(text.includes('- Old thing.'));
});

test('rotateChangelog: returns the rotated section for the tag message', () => {
  const { section } = rotateChangelog(SAMPLE, '0.20.0-beta.1', '2026-08-10');
  assert.ok(section.startsWith('### Added'));
  assert.ok(section.includes('- New thing two.'));
  assert.ok(!section.includes('0.19.0-beta.1'), 'section stops before the next release');
});

test('rotateChangelog: empty [Unreleased] throws — nothing to release', () => {
  const empty = '# Changelog\n\n## [Unreleased]\n\n## [0.19.0-beta.1] - 2026-08-05\n\n- Old.\n';
  assert.throws(() => rotateChangelog(empty, '0.20.0-beta.1', '2026-08-10'), /nothing to release/);
});

test('rotateChangelog: [Unreleased] as the only section rotates cleanly', () => {
  const only = '# Changelog\n\n## [Unreleased]\n\n- First ever entry.\n';
  const { text, section } = rotateChangelog(only, '0.20.0-beta.1', '2026-08-10');
  assert.ok(text.includes('## [0.20.0-beta.1] - 2026-08-10'));
  assert.equal(section, '- First ever entry.');
});

test('rotateChangelog: missing [Unreleased] heading throws', () => {
  assert.throws(
    () => rotateChangelog('# Changelog\n\n## [0.1.0] - 2026-01-01\n', '0.2.0', '2026-08-10'),
    /\[Unreleased\]/
  );
});

test('rotateChangelog: malformed date throws before touching the text', () => {
  assert.throws(() => rotateChangelog(SAMPLE, '0.20.0-beta.1', '10/08/2026'), /YYYY-MM-DD/);
});
