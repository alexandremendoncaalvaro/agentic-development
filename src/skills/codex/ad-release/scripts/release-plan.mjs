import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

function buildPlanApproval(state) {
  const required = [
    'packageName',
    'packageVersion',
    'publishTag',
    'branch',
    'baseBranch',
    'tag',
    'prTitle',
    'prBody',
  ];
  if (required.some((key) => typeof state[key] !== 'string' || state[key].length === 0)) {
    return null;
  }
  const isNewRelease = !state.completed.includes('local-release');
  const hasReleaseKind = typeof state.releaseKind === 'string' && state.releaseKind.length > 0;
  if (isNewRelease && !hasReleaseKind) return null;

  const effects = [
    hasReleaseKind
      ? {
          id: 'local-release',
          command: commandFor('local-release', state),
          postcondition: 'one DCO-signed release commit and one annotated local tag',
        }
      : {
          id: 'local-release',
          completed: true,
          postcondition: 'verified existing release commit and annotated local tag',
        },
    {
      id: 'branch-push',
      command: commandFor('branch-push', state),
      postcondition: 'remote release branch resolves to the release commit',
    },
    {
      id: 'pr-create',
      delegate: 'ad-pr',
      artifact: {
        base: state.baseBranch,
        head: state.branch,
        title: state.prTitle,
        body: state.prBody,
      },
      postcondition: 'one open release PR against the base branch',
    },
    {
      id: 'pr-merge',
      delegate: 'ad-merge --release',
      constraint: 'green CI and merge commit only',
      postcondition: 'release commit is an ancestor of the base branch',
    },
    {
      id: 'tag-push',
      command: commandFor('tag-push', state),
      postcondition: 'remote annotated tag resolves to the release commit',
    },
    {
      id: 'npm-publish',
      command: commandFor('npm-publish', state),
      postcondition: 'registry contains the exact version under the configured dist-tag',
    },
    {
      id: 'github-release',
      command: commandFor('github-release', state),
      postcondition: 'GitHub Release exists with notes from the annotated tag',
    },
  ];
  const target = {
    packageName: state.packageName,
    packageVersion: state.packageVersion,
    publishTag: state.publishTag,
    releaseKind: hasReleaseKind ? state.releaseKind : null,
    branch: state.branch,
    baseBranch: state.baseBranch,
    tag: state.tag,
    prTitle: state.prTitle,
    prBody: state.prBody,
    prerelease: state.prerelease === true,
  };
  const digest = createHash('sha256')
    .update(JSON.stringify({ schemaVersion: 1, target, effects }))
    .digest('hex');

  return { schemaVersion: 1, digest, target, effects };
}

function plan(state) {
  const completed = validateCompleted(state.completed);
  const planApproval = buildPlanApproval(state);
  const requestedPlanApproval = state.confirmation?.scope === 'release-plan';
  const approvedPlan =
    requestedPlanApproval &&
    state.confirmation.approved === true &&
    planApproval !== null &&
    state.confirmation.digest === planApproval.digest;
  const stage = STAGES[completed.length] ?? null;
  if (stage === null) {
    return {
      next: null,
      execution: null,
      complete: true,
      blocked: null,
      unreadable: [],
      planApproval,
      planAuthorized: approvedPlan,
    };
  }

  const next = { id: stage, requiresConfirmation: !approvedPlan };
  if (requestedPlanApproval && !approvedPlan) {
    return {
      next,
      execution: null,
      complete: false,
      blocked:
        planApproval === null
          ? 'plan-wide approval requires the complete release target'
          : 'plan-wide approval digest does not match the current release target and effects',
      unreadable: [],
      planApproval,
      planAuthorized: false,
    };
  }
  if (['tag-push', 'npm-publish'].includes(stage) && state.merged !== true) {
    return {
      next,
      execution: null,
      complete: false,
      blocked: `${stage} requires the merged release commit to be on the base branch`,
      unreadable: [],
      planApproval,
      planAuthorized: approvedPlan,
    };
  }

  const approvedStage =
    state.confirmation?.stage === stage && state.confirmation.approved === true;
  return {
    next,
    execution: approvedPlan || approvedStage ? commandFor(stage, state) : null,
    complete: false,
    blocked: null,
    unreadable: [],
    planApproval,
    planAuthorized: approvedPlan,
  };
}

try {
  process.stdout.write(`${JSON.stringify(plan(input()))}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
