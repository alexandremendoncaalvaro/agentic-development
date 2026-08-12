/**
 * Pure release logic (task-0032): version bump + changelog rotation.
 *
 * Consumed by `scripts/release-apply.js` (the CLI shim `scripts/release.sh`
 * calls) and exercised directly by `test/release.test.js`. Lives under
 * `scripts/` — not `src/lib/` — so release tooling never ships in the npm
 * tarball (`package.json#files` includes all of `src/`).
 */

// Every release in this repo's tag history is X.Y.Z-beta.N. The suffix marks
// maturity; publishConfig controls the separate npm install channel (ADR-0066).
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Compute the next version for a bump kind.
 *
 * @param {string} current - current package.json version (X.Y.Z or X.Y.Z-beta.N)
 * @param {string} kind - one of patch | minor | major | prerelease
 * @returns {string} the next version, always X.Y.Z-beta.N
 * @throws {Error} on an unparseable version, an unknown kind, or a
 *   prerelease bump of a version that has no beta counter
 */
export function bumpVersion(current, kind) {
  const match = VERSION_RE.exec(current);
  if (!match) {
    throw new Error(`unsupported version "${current}" — expected X.Y.Z or X.Y.Z-beta.N`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const beta = match[4] === undefined ? undefined : Number(match[4]);
  switch (kind) {
    case 'major':
      return `${major + 1}.0.0-beta.1`;
    case 'minor':
      return `${major}.${minor + 1}.0-beta.1`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}-beta.1`;
    case 'prerelease':
      if (beta === undefined) {
        throw new Error(
          `"${current}" has no -beta.N counter to increment — use patch|minor|major`
        );
      }
      return `${major}.${minor}.${patch}-beta.${beta + 1}`;
    default:
      throw new Error(`unknown bump kind "${kind}" — expected patch|minor|major|prerelease`);
  }
}

/**
 * Rotate the changelog's `[Unreleased]` content under a new version heading,
 * leaving a fresh empty `[Unreleased]` section on top.
 *
 * @param {string} text - full CHANGELOG.md content
 * @param {string} version - the version being released
 * @param {string} date - release date, YYYY-MM-DD
 * @returns {{text: string, section: string}} the rotated changelog and the
 *   released section body (used as the annotated tag message)
 * @throws {Error} on a malformed date, a missing `[Unreleased]` heading, or
 *   an empty `[Unreleased]` section (nothing to release)
 */
export function rotateChangelog(text, version, date) {
  if (!DATE_RE.test(date)) {
    throw new Error(`malformed date "${date}" — expected YYYY-MM-DD`);
  }
  const lines = text.split('\n');
  const headingIdx = lines.findIndex((line) => /^## \[Unreleased\]\s*$/.test(line));
  if (headingIdx === -1) {
    throw new Error('CHANGELOG.md has no "## [Unreleased]" heading');
  }
  let end = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  const section = lines.slice(headingIdx + 1, end).join('\n').trim();
  if (section === '') {
    throw new Error('[Unreleased] is empty — nothing to release');
  }
  const rotated = [
    ...lines.slice(0, headingIdx),
    '## [Unreleased]',
    '',
    `## [${version}] - ${date}`,
    '',
    section,
    '',
    ...lines.slice(end),
  ].join('\n');
  return { text: rotated, section };
}
