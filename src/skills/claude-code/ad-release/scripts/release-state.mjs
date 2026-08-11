import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const cwd = process.cwd();
const unreadable = [];

function readOptional(relativePath) {
  const path = resolve(cwd, relativePath);
  try {
    return { exists: true, text: readFileSync(path, 'utf8') };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, text: null };
    unreadable.push(`${relativePath}:${error?.code ?? 'UNKNOWN'}`);
    return { exists: true, text: null };
  }
}

function git(...args) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function releaseTag(args) {
  if (args.length === 0) return null;
  if (args.length === 2 && args[0] === '--tag' && args[1]) return args[1];
  throw new Error('usage: release-state.mjs [--tag <tag>]');
}

function packageFields(text) {
  if (text === null) {
    return { name: null, version: null, publishTag: null, releaseScript: null };
  }
  try {
    const pkg = JSON.parse(text);
    return {
      name: typeof pkg.name === 'string' ? pkg.name : null,
      version: typeof pkg.version === 'string' ? pkg.version : null,
      publishTag: typeof pkg.publishConfig?.tag === 'string' ? pkg.publishConfig.tag : null,
      releaseScript: typeof pkg.scripts?.release === 'string' ? pkg.scripts.release : null,
    };
  } catch {
    return { name: null, version: null, publishTag: null, releaseScript: null };
  }
}

function main() {
  const tagName = releaseTag(process.argv.slice(2));
  const packageJson = readOptional('package.json');
  const packageLock = readOptional('package-lock.json');
  const changelog = readOptional('CHANGELOG.md');
  const tagType = tagName ? git('cat-file', '-t', `refs/tags/${tagName}`) : null;
  const dirtyOutput = git('status', '--porcelain');

  const state = {
    package: packageFields(packageJson.text),
    files: {
      packageJson: packageJson.exists,
      packageLock: packageLock.exists,
      changelog: {
        exists: changelog.exists,
        hasUnreleased: changelog.text === null ? null : /^## \[Unreleased\]\s*$/m.test(changelog.text),
      },
    },
    git: {
      branch: git('symbolic-ref', '--short', 'HEAD'),
      dirty: dirtyOutput === null ? null : dirtyOutput !== '',
      origin: git('remote', 'get-url', 'origin'),
      tag: {
        name: tagName,
        exists: tagName ? tagType !== null : null,
        annotated: tagName ? tagType === 'tag' : null,
      },
    },
    unreadable: unreadable.sort(),
  };

  process.stdout.write(`${JSON.stringify(state)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
