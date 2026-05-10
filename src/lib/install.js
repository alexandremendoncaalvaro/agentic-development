import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, relative, sep as PATH_SEP } from 'node:path';
import { SCHEMA_VERSION } from './state.js';
import { DEFAULT_PROFILE, validateProfile } from './profiles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = join(__dirname, '..', '..');

const MANIFEST_FILE = 'manifest.json';

/**
 * Normalize a filesystem path to forward-slash form so internal
 * comparisons (manifest subagent declarations, state-file paths, action
 * report paths) are platform-independent. Manifests and state files are
 * authored with `/`; on Windows, native `path.join` and `path.relative`
 * produce `\\`, which breaks Set/Map lookups against the canonical form.
 */
function toPosix(p) {
  return PATH_SEP === '/' ? p : p.split(PATH_SEP).join('/');
}

const AGENT_LAYOUT = {
  'claude-code': {
    skillsDir: '.claude/skills',
    sourceDir: 'src/skills/claude-code',
    agentsDir: '.claude/agents',
  },
  codex: {
    skillsDir: '.agents/skills',
    sourceDir: 'src/skills/codex',
  },
};

export function agentLayout(agent) {
  const layout = AGENT_LAYOUT[agent];
  if (!layout) throw new Error(`unknown agent "${agent}"`);
  return layout;
}

function walkSkill(srcRoot) {
  const out = [];
  function walk(dir, prefix) {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const rel = prefix ? join(prefix, entry) : entry;
      if (statSync(abs).isDirectory()) {
        walk(abs, rel);
      } else {
        // `rel` is the manifest-comparable path; force posix form so
        // Windows backslashes do not break Set/Map lookups against
        // forward-slash declarations in manifest.json.
        out.push({ src: abs, rel: toPosix(rel) });
      }
    }
  }
  walk(srcRoot, '');
  return out;
}

function loadManifest(srcRoot) {
  const path = join(srcRoot, MANIFEST_FILE);
  if (!existsSync(path)) return { subagents: [] };
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`malformed manifest at ${path}: ${err.message}`);
  }
  return { subagents: Array.isArray(raw.subagents) ? raw.subagents : [] };
}

function sha256Of(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sameFile(a, b) {
  if (!existsSync(b)) return false;
  return readFileSync(a).equals(readFileSync(b));
}

function targetForRel(rel, layout, targetRoot, cwd, subagentSet) {
  if (subagentSet.has(rel)) {
    if (!layout.agentsDir) return null;
    return join(cwd, layout.agentsDir, basename(rel));
  }
  return join(targetRoot, rel);
}

function resolveSkillSource(agent, skill) {
  const layout = agentLayout(agent);
  const srcRoot = join(KIT_ROOT, layout.sourceDir, skill);
  if (!existsSync(srcRoot)) {
    throw new Error(
      `skill "${skill}" not found for agent "${agent}" (expected at ${srcRoot})`
    );
  }
  const manifest = loadManifest(srcRoot);
  const subagentSet = new Set(manifest.subagents);
  const walked = walkSkill(srcRoot);
  const walkedRels = new Set(walked.map(({ rel }) => rel));
  for (const declared of subagentSet) {
    if (!walkedRels.has(declared)) {
      throw new Error(
        `manifest at ${join(srcRoot, MANIFEST_FILE)} declares subagent "${declared}" but no such file exists in the skill source`
      );
    }
  }
  return { layout, srcRoot, subagentSet, walked };
}

function planFile({
  src,
  rel,
  target,
  relForReport,
  prevSha,
  force,
}) {
  const sourceSha = sha256Of(src);
  if (!existsSync(target)) {
    return { type: 'create', sourceSha };
  }
  const targetSha = sha256Of(target);

  if (sourceSha === targetSha) {
    return { type: 'unchanged', sourceSha };
  }

  if (prevSha === undefined || prevSha === null) {
    return { type: 'legacy-divergent', sourceSha, targetSha };
  }

  if (sourceSha === prevSha) {
    // kit unchanged since last install; differ vs. target → user edited; keep
    return { type: 'user-edited-keep', sourceSha };
  }

  if (targetSha === prevSha) {
    // user untouched; kit changed → silent update
    return { type: 'kit-changed-update', sourceSha };
  }

  // both changed → conflict
  if (force) return { type: 'conflict-force', sourceSha };
  return { type: 'conflict-prompt', sourceSha, targetSha };
}

/**
 * Install one or more skills for one or more agents, with optional state-aware
 * three-way diff against the prior install.
 *
 * Legacy contract (no state): default-skip on divergent files, prompt via
 * confirmReplace. Matches v0.2 behavior.
 *
 * State-aware contract (previousStates supplied): three-way diff using the
 * previous source SHA, target SHA, current source SHA. See ADR-0009.
 *
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {string[]} opts.agents
 * @param {string[]} opts.skills
 * @param {(question: string) => Promise<boolean>} [opts.confirmReplace]
 *   Callback for divergent files (legacy path or three-way conflict). Default: skip.
 * @param {Record<string, object|null>} [opts.previousStates]
 *   Per-agent previous state from src/lib/state.js. Missing/null entries fall
 *   back to legacy byte-compare.
 * @param {string} [opts.kitVersion]
 *   Stamped into the returned nextStates as kitVersion and per-skill version.
 * @param {boolean} [opts.dryRun]
 *   If true, no files are written. Actions reflect what would happen.
 * @param {boolean} [opts.force]
 *   If true, three-way conflicts overwrite without prompting.
 *
 * @returns {Promise<{ actions: Array<{type, path, agent}>, nextStates: Record<string, object> }>}
 */
export async function installSkills({
  cwd,
  agents,
  skills,
  confirmReplace = async () => false,
  previousStates = {},
  kitVersion = null,
  profile = null,
  dryRun = false,
  force = false,
}) {
  if (profile !== null) validateProfile(profile);
  const actions = [];
  const nextStates = {};

  for (const agent of agents) {
    const prev = previousStates[agent] ?? null;
    const nextSkills = {};

    for (const skill of skills) {
      const { layout, srcRoot, subagentSet, walked } = resolveSkillSource(agent, skill);
      const targetRoot = join(cwd, layout.skillsDir, skill);
      const prevSkill = prev?.skills?.[skill] ?? null;
      const prevByPath = new Map(
        (prevSkill?.files ?? []).map((f) => [f.path, f.sourceSha])
      );
      const skillFiles = [];

      for (const { src, rel } of walked) {
        if (rel === MANIFEST_FILE) continue;

        const target = targetForRel(rel, layout, targetRoot, cwd, subagentSet);
        if (!target) continue;
        // Force posix form so the path is identical across platforms in
        // the action log and in the per-agent state file. Windows users
        // sharing a state file with macOS / Linux teammates depend on it.
        const relForReport = toPosix(relative(cwd, target));
        const prevSha = prevByPath.has(relForReport)
          ? prevByPath.get(relForReport)
          : null;

        const decision = planFile({
          src,
          rel,
          target,
          relForReport,
          prevSha,
          force,
        });

        let actionType;
        let writeFile = false;

        switch (decision.type) {
          case 'create':
            actionType = 'created';
            writeFile = true;
            break;
          case 'unchanged':
            actionType = 'unchanged';
            break;
          case 'kit-changed-update':
            actionType = 'updated';
            writeFile = true;
            break;
          case 'user-edited-keep':
            actionType = 'kept';
            break;
          case 'conflict-force':
            actionType = 'replaced';
            writeFile = true;
            break;
          case 'conflict-prompt': {
            const replace = await confirmReplace(
              `${relForReport}: kit and your edits both changed since last install. Overwrite?`
            );
            if (replace) {
              actionType = 'replaced';
              writeFile = true;
            } else {
              actionType = 'skipped';
            }
            break;
          }
          case 'legacy-divergent': {
            const replace = await confirmReplace(
              `Replace ${relForReport}? (target differs from the kit version)`
            );
            if (replace) {
              actionType = 'replaced';
              writeFile = true;
            } else {
              actionType = 'skipped';
            }
            break;
          }
          default:
            throw new Error(`unhandled plan decision: ${decision.type}`);
        }

        if (writeFile && !dryRun) {
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(src, target);
        }

        // Record the current source SHA on every outcome — including skip.
        // A skip means "I have seen this kit version and chose to keep my
        // edits"; the next run should treat the same kit version as already
        // acknowledged (silent user-edited-keep). If we recorded the prior
        // SHA on skip, every re-run with the kit unchanged would re-prompt
        // the same conflict the user already declined.
        actions.push({ type: actionType, path: relForReport, agent });
        skillFiles.push({ path: relForReport, sourceSha: decision.sourceSha });
      }

      nextSkills[skill] = {
        version: kitVersion ?? prevSkill?.version ?? null,
        files: skillFiles,
      };
    }

    // Profile resolution order: explicit `profile` arg > prior state's
    // profile > DEFAULT_PROFILE. installSkills is the single owner of the
    // returned nextStates' shape; callers no longer inject `profile`
    // post-hoc per review C3 (v0.11.3).
    nextStates[agent] = {
      schemaVersion: SCHEMA_VERSION,
      kitVersion: kitVersion ?? prev?.kitVersion ?? null,
      agent,
      profile: profile ?? prev?.profile ?? DEFAULT_PROFILE,
      skills: nextSkills,
    };
  }

  return { actions, nextStates };
}

/**
 * Identify and optionally remove orphan skills — skills present in the prior
 * state but absent from the current opted skill list. Default keep.
 *
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {string} opts.agent
 * @param {object|null} opts.previousState
 * @param {string[]} opts.currentSkills
 * @param {(question: string) => Promise<boolean>} [opts.confirmRemove]
 * @param {boolean} [opts.dryRun]
 *
 * @returns {Promise<{ actions: Array<{type, path, agent}>, removedSkills: string[] }>}
 */
export async function removeOrphanSkills({
  cwd,
  agent,
  previousState,
  currentSkills,
  confirmRemove = async () => false,
  dryRun = false,
}) {
  const actions = [];
  const removedSkills = [];
  if (!previousState?.skills) return { actions, removedSkills };

  const layout = agentLayout(agent);
  const currentSet = new Set(currentSkills);

  for (const [skill, entry] of Object.entries(previousState.skills)) {
    if (currentSet.has(skill)) continue;
    const remove = await confirmRemove(
      `Remove orphan skill "${skill}" for ${agent}? (no longer in your install set)`
    );
    if (!remove) {
      for (const f of entry.files) {
        actions.push({ type: 'orphan-kept', path: f.path, agent });
      }
      continue;
    }

    for (const f of entry.files) {
      const abs = join(cwd, f.path);
      if (!existsSync(abs)) {
        // State recorded the file at install time but it is gone on disk
        // now (manually deleted, moved, or never written). Surface as a
        // distinct action so the user sees the state-vs-reality mismatch
        // instead of a silent "removed" line for a file that was never
        // there.
        actions.push({ type: 'removed-missing', path: f.path, agent });
        continue;
      }
      if (!dryRun) {
        unlinkSync(abs);
      }
      actions.push({ type: 'removed', path: f.path, agent });
    }
    // Try to drop the empty skill directory under skillsDir/<skill>.
    const skillDir = join(cwd, layout.skillsDir, skill);
    if (!dryRun && existsSync(skillDir)) {
      try {
        rmSync(skillDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
    removedSkills.push(skill);
  }

  return { actions, removedSkills };
}
