import { readFileSync } from 'node:fs';

const STAGES = [
  'local-release',
  'branch-push',
  'tag-push',
  'npm-publish',
  'github-release',
];

function input() {
  const text = readFileSync(0, 'utf8');
  const value = JSON.parse(text);
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('release plan input must be a JSON object');
  }
  return value;
}

function requiredString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function validateCompleted(value) {
  if (!Array.isArray(value)) throw new Error('completed must be an array');
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== STAGES[index]) {
      throw new Error('completed must be an ordered prefix of the release stages');
    }
  }
  if (value.length > STAGES.length) {
    throw new Error('completed cannot contain more than five release stages');
  }
  return value;
}

function commandFor(stage, state) {
  if (stage === 'local-release') {
    const releaseKind = requiredString(state.releaseKind, 'releaseKind');
    if (!['patch', 'minor', 'major', 'prerelease'].includes(releaseKind)) {
      throw new Error('releaseKind must be patch, minor, major, or prerelease');
    }
    return ['npm', 'run', 'release', '--', releaseKind];
  }
  if (stage === 'branch-push') {
    const branch = requiredString(state.branch, 'branch');
    return [
      'git',
      'push',
      '--no-follow-tags',
      'origin',
      `refs/heads/${branch}:refs/heads/${branch}`,
    ];
  }
  if (stage === 'tag-push') {
    const tag = requiredString(state.tag, 'tag');
    return ['git', 'push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`];
  }
  if (stage === 'npm-publish') return ['npm', 'publish'];
  if (stage === 'github-release') {
    const tag = requiredString(state.tag, 'tag');
    const command = ['ghp', 'release', 'create', tag, '--verify-tag', '--notes-from-tag'];
    if (state.prerelease === true) command.push('--prerelease');
    return command;
  }
  throw new Error(`unknown release stage ${stage}`);
}

function plan(state) {
  const completed = validateCompleted(state.completed);
  const stage = STAGES[completed.length] ?? null;
  if (stage === null) {
    return { next: null, execution: null, complete: true, blocked: null, unreadable: [] };
  }

  const next = { id: stage, requiresConfirmation: true };
  if (['tag-push', 'npm-publish'].includes(stage) && state.merged !== true) {
    return {
      next,
      execution: null,
      complete: false,
      blocked: `${stage} requires the merged release commit to be on the base branch`,
      unreadable: [],
    };
  }

  const approved = state.confirmation?.stage === stage && state.confirmation.approved === true;
  return {
    next,
    execution: approved ? commandFor(stage, state) : null,
    complete: false,
    blocked: null,
    unreadable: [],
  };
}

try {
  process.stdout.write(`${JSON.stringify(plan(input()))}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
