import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = join(__dirname, '..', '..');

const MANIFEST_FILE = 'manifest.json';

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

function walkSkill(srcRoot) {
  const out = [];
  function walk(dir, prefix) {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const rel = prefix ? join(prefix, entry) : entry;
      if (statSync(abs).isDirectory()) {
        walk(abs, rel);
      } else {
        out.push({ src: abs, rel });
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

function sameFile(a, b) {
  if (!existsSync(b)) return false;
  return readFileSync(a).equals(readFileSync(b));
}

/**
 * Install one or more skills for one or more agents.
 *
 * @param {object} opts
 * @param {string} opts.cwd  Target project root.
 * @param {string[]} opts.agents  e.g. ['claude-code', 'codex'].
 * @param {string[]} opts.skills  Skill names, e.g. ['agentic-bootstrap'].
 * @param {(question: string) => Promise<boolean>} [opts.confirmReplace]
 *   Async callback used when a target file already exists with different
 *   content. Default: skip without asking (safe non-interactive default).
 *
 * @returns {Promise<{ actions: Array<{type: 'created'|'replaced'|'unchanged'|'skipped', path: string}> }>}
 */
export async function installSkills({
  cwd,
  agents,
  skills,
  confirmReplace = async () => false,
}) {
  const actions = [];

  for (const agent of agents) {
    const layout = AGENT_LAYOUT[agent];
    if (!layout) {
      throw new Error(`unknown agent "${agent}"`);
    }

    for (const skill of skills) {
      const srcRoot = join(KIT_ROOT, layout.sourceDir, skill);
      if (!existsSync(srcRoot)) {
        throw new Error(
          `skill "${skill}" not found for agent "${agent}" (expected at ${srcRoot})`
        );
      }

      const targetRoot = join(cwd, layout.skillsDir, skill);
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

      for (const { src, rel } of walked) {
        if (rel === MANIFEST_FILE) continue;

        let target;
        if (subagentSet.has(rel)) {
          if (!layout.agentsDir) continue;
          target = join(cwd, layout.agentsDir, basename(rel));
        } else {
          target = join(targetRoot, rel);
        }
        const relForReport = relative(cwd, target);

        if (existsSync(target)) {
          if (sameFile(src, target)) {
            actions.push({ type: 'unchanged', path: relForReport });
            continue;
          }
          const replace = await confirmReplace(
            `Replace ${relForReport}? (target differs from the kit version)`
          );
          if (!replace) {
            actions.push({ type: 'skipped', path: relForReport });
            continue;
          }
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(src, target);
          actions.push({ type: 'replaced', path: relForReport });
        } else {
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(src, target);
          actions.push({ type: 'created', path: relForReport });
        }
      }
    }
  }

  return { actions };
}
