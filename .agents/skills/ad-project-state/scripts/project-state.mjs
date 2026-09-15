#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const IDENTIFIER = /^[a-z][a-z0-9-]{0,63}$/;
const HOST = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ROLES = new Set(['primary', 'supporting']);
const SOURCE_TYPES = new Set(['repository', 'github']);
const ISSUE_STATES = new Set(['open', 'closed', 'all']);
const PULL_REQUEST_STATES = new Set(['open', 'closed', 'merged', 'all']);
const ISSUE_FIELDS = 'number,title,url,state,updatedAt,labels,assignees';
const PULL_REQUEST_FIELDS =
  'number,title,url,state,updatedAt,isDraft,reviewDecision,labels,assignees,headRefName';
const NODE_SCRIPT = /\.[cm]?js$/i;

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unknownField(value, allowed) {
  return Object.keys(value).find((key) => !allowed.includes(key));
}

function cleanGitEnvironment(environment) {
  const env = { ...environment };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function failureCode(error) {
  if (error.code) return error.code;
  if (Number.isInteger(error.status)) return `EXIT_${error.status}`;
  return 'ERROR';
}

function spawnTarget(commandName, args) {
  return NODE_SCRIPT.test(commandName)
    ? [process.execPath, [commandName, ...args]]
    : [commandName, args];
}

function command(commandName, args, repoRoot, environment) {
  const [file, argv] = spawnTarget(commandName, args);
  try {
    return {
      ok: true,
      stdout: execFileSync(file, argv, {
        cwd: repoRoot,
        env: environment,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim(),
    };
  } catch (error) {
    return { ok: false, code: failureCode(error) };
  }
}

function commandArray(commandName, args, repoRoot, environment) {
  const result = command(commandName, args, repoRoot, environment);
  if (!result.ok) return { value: [], code: result.code };
  try {
    const value = JSON.parse(result.stdout);
    return Array.isArray(value) ? { value, code: null } : { value: [], code: 'INVALID_JSON' };
  } catch {
    return { value: [], code: 'INVALID_JSON' };
  }
}

function originRemotes(repoRoot, environment) {
  try {
    const stdout = execFileSync('git', ['remote', 'get-url', '--all', 'origin'], {
      cwd: repoRoot,
      env: cleanGitEnvironment(environment),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function configurationFailure(path, code, message) {
  return { sourceId: 'configuration', code, path, message };
}

function readConfiguration(path, reportPath) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')), failure: null };
  } catch (error) {
    const code = error instanceof SyntaxError ? 'INVALID_JSON' : 'UNREADABLE_CONFIGURATION';
    const message =
      code === 'INVALID_JSON'
        ? 'configuration is not valid JSON'
        : error.code || 'configuration could not be read';
    return {
      value: null,
      failure: configurationFailure(reportPath, code, message),
    };
  }
}

function validateQuery(query, kind, sourceIndex) {
  if (!plainObject(query)) return `source[${sourceIndex}].${kind} must be an object`;
  const extra = unknownField(query, ['state', 'search', 'limit']);
  if (extra) return `source[${sourceIndex}].${kind} has unknown field ${extra}`;
  const states = kind === 'issues' ? ISSUE_STATES : PULL_REQUEST_STATES;
  if (!states.has(query.state)) {
    return `source[${sourceIndex}].${kind}.state is invalid`;
  }
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
    return `source[${sourceIndex}].${kind}.limit must be an integer from 1 to 100`;
  }
  if (
    query.search !== undefined &&
    (typeof query.search !== 'string' || query.search.length > 512 || /[\r\n]/.test(query.search))
  ) {
    return `source[${sourceIndex}].${kind}.search must be a single-line string up to 512 characters`;
  }
  return null;
}

function validateSource(source, index) {
  if (!plainObject(source)) return `source[${index}] must be an object`;
  const common = ['id', 'type', 'role'];
  const allowed =
    source.type === 'github' ? [...common, 'host', 'repository', 'issues', 'pullRequests'] : common;
  const extra = unknownField(source, allowed);
  if (extra) return `source[${index}] has unknown field ${extra}`;
  if (!IDENTIFIER.test(source.id || '')) return `source[${index}].id is invalid`;
  if (!SOURCE_TYPES.has(source.type)) return `unknown source type ${source.type}`;
  if (!ROLES.has(source.role)) return `source[${index}].role is invalid`;
  if (source.type === 'repository') {
    return source.id === 'repository' ? null : 'repository source id must be repository';
  }
  if (!HOST.test(source.host || '')) return `source[${index}].host is invalid`;
  if (!REPOSITORY.test(source.repository || '')) {
    return `source[${index}].repository must be OWNER/REPO`;
  }
  if (source.issues === undefined && source.pullRequests === undefined) {
    return `source[${index}] must configure issues or pullRequests`;
  }
  if (source.issues !== undefined) {
    const failure = validateQuery(source.issues, 'issues', index);
    if (failure) return failure;
  }
  if (source.pullRequests !== undefined) {
    const failure = validateQuery(source.pullRequests, 'pullRequests', index);
    if (failure) return failure;
  }
  return null;
}

function validateSources(sources) {
  if (!Array.isArray(sources)) return 'sources must be an array';
  const ids = new Set();
  for (let index = 0; index < sources.length; index += 1) {
    const failure = validateSource(sources[index], index);
    if (failure) return failure;
    if (ids.has(sources[index].id)) return `duplicate source id ${sources[index].id}`;
    ids.add(sources[index].id);
  }
  if (sources.filter((source) => source.role === 'primary').length !== 1) {
    return 'exactly one primary source is required';
  }
  return null;
}

function validateProjectConfig(config) {
  if (!plainObject(config)) return 'configuration must be an object';
  const extra = unknownField(config, ['schemaVersion', 'sources']);
  if (extra) return `unknown field ${extra}`;
  if (config.schemaVersion !== 1) return 'schemaVersion must be 1';
  return validateSources(config.sources);
}

function validateMachineConfig(config) {
  if (!plainObject(config)) return 'configuration must be an object';
  const extra = unknownField(config, ['schemaVersion', 'projects']);
  if (extra) return `unknown field ${extra}`;
  if (config.schemaVersion !== 1) return 'schemaVersion must be 1';
  if (!Array.isArray(config.projects)) return 'projects must be an array';
  const remotes = new Set();
  for (let index = 0; index < config.projects.length; index += 1) {
    const project = config.projects[index];
    if (!plainObject(project)) return `project[${index}] must be an object`;
    const projectExtra = unknownField(project, ['match', 'sources']);
    if (projectExtra) return `project[${index}] has unknown field ${projectExtra}`;
    if (!plainObject(project.match)) return `project[${index}].match must be an object`;
    const matchExtra = unknownField(project.match, ['remote']);
    if (matchExtra) return `project[${index}].match has unknown field ${matchExtra}`;
    if (typeof project.match.remote !== 'string' || !project.match.remote.trim()) {
      return `project[${index}].match.remote is required`;
    }
    if (remotes.has(project.match.remote)) {
      return `project[${index}].match.remote duplicates an earlier entry`;
    }
    remotes.add(project.match.remote);
    const sourcesFailure = validateSources(project.sources);
    if (sourcesFailure) return `project[${index}] ${sourcesFailure}`;
  }
  return null;
}

function projectConfiguration(repoRoot) {
  const relativePath = '.agentic/project-sources.json';
  const path = join(repoRoot, '.agentic', 'project-sources.json');
  if (!isFile(path)) return null;
  const loaded = readConfiguration(path, relativePath);
  const detail = { layer: 'project', path: relativePath, matchedRemote: null };
  if (loaded.failure) return { detail, sources: null, failure: loaded.failure };
  const message = validateProjectConfig(loaded.value);
  return {
    detail,
    sources: message ? null : loaded.value.sources,
    failure: message ? configurationFailure(relativePath, 'INVALID_CONFIGURATION', message) : null,
  };
}

function machineConfiguration(repoRoot, environment) {
  const path =
    environment.AGENTIC_PROJECT_SOURCES_FILE ||
    join(
      environment.HOME || environment.USERPROFILE || homedir(),
      '.agentic',
      'project-sources.json'
    );
  if (!isFile(path)) return null;
  const loaded = readConfiguration(path, path);
  const detail = { layer: 'machine', path, matchedRemote: null };
  if (loaded.failure) return { detail, sources: null, failure: loaded.failure };
  const message = validateMachineConfig(loaded.value);
  if (message) {
    return {
      detail,
      sources: null,
      failure: configurationFailure(path, 'INVALID_CONFIGURATION', message),
    };
  }

  const remotes = originRemotes(repoRoot, environment);
  const project = loaded.value.projects.find((entry) => remotes.includes(entry.match.remote));
  if (!project) return null;
  return {
    detail: { ...detail, matchedRemote: project.match.remote },
    sources: project.sources,
    failure: null,
  };
}

function repositorySource(source, observedAt) {
  return {
    id: 'repository',
    type: 'repository',
    role: source?.role || 'primary',
    status: 'available',
    observedAt,
    provenance: { kind: 'repository', locator: '.' },
  };
}

function configuredSources(configured) {
  if (!configured?.sources) return [];
  return configured.sources;
}

function githubRepository(source) {
  return source.host === 'github.com' ? source.repository : `${source.host}/${source.repository}`;
}

function listArguments(kind, source, query, fields) {
  const args = [
    kind,
    'list',
    '--repo',
    githubRepository(source),
    '--state',
    query.state,
    '--limit',
    String(query.limit),
  ];
  if (query.search !== undefined) args.push('--search', query.search);
  args.push('--json', fields);
  return args;
}

function githubFailure(sourceId, probe, code) {
  return { sourceId, probe, code };
}

function githubSource(source, observedAt, repoRoot, environment) {
  const gh = environment.AGENTIC_GH || 'gh';
  const githubEnvironment = cleanGitEnvironment({ ...environment, GH_HOST: source.host });
  const base = {
    id: source.id,
    type: 'github',
    role: source.role,
    status: 'unavailable',
    observedAt,
    provenance: {
      kind: 'github',
      host: source.host,
      repository: source.repository,
    },
    ...(source.issues === undefined ? {} : { issues: [] }),
    ...(source.pullRequests === undefined ? {} : { pullRequests: [] }),
  };
  const version = command(gh, ['--version'], repoRoot, githubEnvironment);
  if (!version.ok) {
    return {
      source: base,
      failures: [githubFailure(source.id, 'gh --version', version.code)],
    };
  }
  const auth = command(
    gh,
    ['auth', 'status', '--hostname', source.host],
    repoRoot,
    githubEnvironment
  );
  if (!auth.ok) {
    return {
      source: base,
      failures: [githubFailure(source.id, 'gh auth status', 'AUTH_FAILED')],
    };
  }

  const failures = [];
  let successfulQueries = 0;
  if (source.issues !== undefined) {
    const issues = commandArray(
      gh,
      listArguments('issue', source, source.issues, ISSUE_FIELDS),
      repoRoot,
      githubEnvironment
    );
    base.issues = issues.value.slice(0, source.issues.limit);
    if (issues.code) failures.push(githubFailure(source.id, 'gh issue list', issues.code));
    else successfulQueries += 1;
  }
  if (source.pullRequests !== undefined) {
    const pullRequests = commandArray(
      gh,
      listArguments('pr', source, source.pullRequests, PULL_REQUEST_FIELDS),
      repoRoot,
      githubEnvironment
    );
    base.pullRequests = pullRequests.value.slice(0, source.pullRequests.limit);
    if (pullRequests.code) {
      failures.push(githubFailure(source.id, 'gh pr list', pullRequests.code));
    } else {
      successfulQueries += 1;
    }
  }
  base.status =
    failures.length === 0 ? 'available' : successfulQueries > 0 ? 'partial' : 'unavailable';
  return { source: base, failures };
}

export function projectStateReport({ repoRoot = process.cwd(), environment = process.env } = {}) {
  const observedAt = new Date().toISOString();
  const configured = projectConfiguration(repoRoot) || machineConfiguration(repoRoot, environment);
  const sources = configuredSources(configured);
  const repository = sources.find((source) => source.type === 'repository');
  const fallbackRole = configured?.failure ? 'primary' : 'supporting';
  const repositoryDefinition = repository || (sources.length ? { role: fallbackRole } : null);
  const resolvedSources = [repositorySource(repositoryDefinition, observedAt)];
  const failures = configured?.failure ? [configured.failure] : [];

  if (!configured?.failure) {
    for (const source of sources.filter((candidate) => candidate.type === 'github')) {
      const resolved = githubSource(source, observedAt, repoRoot, environment);
      resolvedSources.push(resolved.source);
      failures.push(...resolved.failures);
    }
  }

  return {
    schemaVersion: 1,
    observedAt,
    configuration: configured?.detail || {
      layer: 'default',
      path: null,
      matchedRemote: null,
    },
    sources: resolvedSources,
    failures,
  };
}

function main() {
  process.stdout.write(`${JSON.stringify(projectStateReport(), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
