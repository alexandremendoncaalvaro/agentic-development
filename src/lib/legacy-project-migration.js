import { createHash } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { removeOrphanSkills } from './install.js';
import { removeManagedSkillsSection } from './rootdoc.js';
import { loadState, removeState, saveState, statePath } from './state.js';

const VALID_AGENTS = ['claude-code', 'codex'];
const ROOT_DOCS = ['AGENTS.md', 'CLAUDE.md'];

// These are the only package versions that copied the Constitution into a
// project root. A hash match is the proof that deleting the file cannot erase
// project-authored content. The source tags are v0.20.0-beta.1 through .4,
// plus the current development copy until the next tag records it.
const LEGACY_KIT_DOC_SHAS = {
  'WORKFLOW.md': new Set([
    '66777bcd07b6be52e2a202e4deacba3f68ae784e344ed73e45d46827a8b77526',
    '53597cc2208c1926bc1e1cc8e37fab3809a2ee78c2772abf05b0aac891b65212',
    'c2d7777864d95acb1655bf800f4ce39d7638ccdd9e85a687d51d71744aa29a46',
    'fb7bd9c4821036ea0b9c0febbf0608eb406d64492512308ee7cf58be74e86913',
  ]),
  'WORKFLOW-FLOWS.md': new Set([
    'efb3fcca7356a5cafe19b6d0019fd133d695293476d9608ea5b72a5e85722b25',
    '1a3f3052a07a60cccf05b9f89b0f92d643e0229f06fe564262bffbf545dd4687',
    '066e699daf5dca1c7d8df9fe28c009e793d0d9a7e679b2c9f45883c29c32e946',
  ]),
};

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function selectedAgents(agentFlag) {
  if (agentFlag === 'both') return VALID_AGENTS;
  if (agentFlag) return [agentFlag];
  return VALID_AGENTS;
}

/**
 * Retire a project-local installation after moving to the global runtime.
 * State-recorded pristine skills and exact historical root documents are
 * removed; any divergent file remains in place and is reported. The function
 * writes no new state, so a second run has no work left to do.
 */
export async function migrateLegacyProject({
  cwd,
  agent,
  dryRun = false,
  force = false,
}) {
  const actions = [];

  for (const currentAgent of selectedAgents(agent)) {
    const state = loadState(cwd, currentAgent);
    if (!state) continue;

    const result = await removeOrphanSkills({
      cwd,
      agent: currentAgent,
      previousState: state,
      currentSkills: [],
      confirmRemove: async () => true,
      dryRun,
      force,
    });
    actions.push(...result.actions.map((action) => ({
      ...action,
      type: action.type === 'removed'
        ? 'migration-removed'
        : action.type === 'orphan-kept'
          ? 'migration-kept'
          : action.type,
    })));

    const removed = new Set(result.removedSkills);
    const remainingSkills = Object.fromEntries(
      Object.entries(state.skills).filter(([skill]) => !removed.has(skill))
    );
    const path = relative(cwd, statePath(cwd, currentAgent));
    if (Object.keys(remainingSkills).length === 0) {
      removeState(cwd, currentAgent, dryRun);
      actions.push({ type: 'migration-state-removed', path, agent: currentAgent });
    } else if (!dryRun) {
      saveState(cwd, currentAgent, { ...state, skills: remainingSkills });
      actions.push({ type: 'migration-state-updated', path, agent: currentAgent });
    } else {
      actions.push({ type: 'migration-state-updated', path, agent: currentAgent });
    }
  }

  for (const name of ROOT_DOCS) {
    const action = removeManagedSkillsSection({ cwd, name, dryRun });
    if (action.type !== 'absent') actions.push(action);
  }

  for (const [name, knownShas] of Object.entries(LEGACY_KIT_DOC_SHAS)) {
    const path = join(cwd, name);
    if (!existsSync(path)) continue;
    if (!knownShas.has(sha256(path))) {
      actions.push({ type: 'migration-kept', path: name });
      continue;
    }
    if (!dryRun) unlinkSync(path);
    actions.push({ type: 'migration-removed', path: name });
  }

  return { actions };
}
