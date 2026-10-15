import { installedPathsToExclude, trackedState, writeExcludeEntries } from './git.js';
import {
  rootDocAppendPrompt,
  rootDocDivergedPrompt,
  rootDocReplacePrompt,
  trackedRootDocSkipNotice,
} from './rootdoc.js';

// The steps `init` and `update` share after installing skills: confirming the
// root-doc write, offering the exclude, and building the report. Prompts and
// warnings are injected: `ask(prompt)` resolves to a boolean (a cancel is
// false) and `warn(line)` reports one line, so this module never prompts or
// prints.

export const ACTION_SYMBOL = {
  created: '+',
  updated: '~',
  replaced: '~',
  unchanged: '·',
  kept: '·',
  skipped: '!',
  removed: '-',
  'removed-missing': '?',
  'orphan-kept': '?',
  'dropped-kept': '!',
  'migration-removed': '-',
  'migration-kept': '!',
  'migration-state-removed': '-',
  'migration-state-updated': '!',
};

const ROOT_DOC_LABEL = {
  appended: '+ ',
  updated: '~ ',
  unchanged: '· ',
  skipped: '! ',
  'kept-stale': '! ',
  absent: '',
};

/**
 * The two root-doc confirmations `updateRootDoc` takes. A tracked doc is
 * shared with everyone who clones the repo (ADR-0051): an interactive run
 * asks with the default no; an unattended run writes it only under
 * `--force-root-doc` and otherwise warns and skips. Unknown tracking state
 * counts as untracked. A diverged section in an untracked doc is regenerated
 * when `untrackedReplace` is `'allow'` (init), and asked about, or gated by
 * `--force` alone, when it is `'force-gated'` (update): `--force-root-doc`
 * never reaches a local edit it was not scoped to touch.
 */
export function rootDocConfirmers({
  cwd,
  interactive,
  force = false,
  forceRootDoc = false,
  untrackedReplace = 'allow',
  ask,
  warn,
}) {
  const isTracked = (path) => trackedState(cwd, path) === 'tracked';
  const unattendedTracked = (path) => {
    if (forceRootDoc) return true;
    warn(trackedRootDocSkipNotice(path));
    return false;
  };
  const confirmAppend = async (path) => {
    if (interactive) return ask(rootDocAppendPrompt(path, trackedState(cwd, path)));
    return isTracked(path) ? unattendedTracked(path) : true;
  };
  const confirmReplace = async (path) => {
    if (isTracked(path)) {
      return interactive ? ask(rootDocReplacePrompt(path)) : unattendedTracked(path);
    }
    if (untrackedReplace === 'allow') return true;
    return interactive ? ask(rootDocDivergedPrompt(path)) : force;
  };
  return { confirmAppend, confirmReplace };
}

// The exclude offer is scoped to the agent surface — the skill/subagent files
// the kit installs under these roots. ADR-0051 Decision 4 covers exactly those
// project writes. The machine-global Constitution never enters this candidate
// set, and a deliberate project Constitution is team-owned rather than a
// machine-local file to hide.
const AGENT_SURFACE_PREFIXES = ['.claude/', '.agents/', '.codex/'];

/** The agent-surface, currently-untracked subset of `paths`. */
export function kitExcludeCandidates(cwd, paths) {
  const agentSurface = paths.filter((p) =>
    AGENT_SURFACE_PREFIXES.some((prefix) => p.startsWith(prefix))
  );
  return installedPathsToExclude(cwd, agentSurface);
}

/**
 * Offer to keep the kit files installed under the agent surface out of a
 * shared repo's commits via `.git/info/exclude` (ADR-0051 Decision 4).
 * Returns the number of entries added. Interactive asks (default yes);
 * unattended declines and notes it: the write is local-only, but a `-y` or CI
 * run should not silently hide files a user might mean to commit. Tracked
 * files are already dropped, so a mixed-ownership directory is safe. Every
 * currently-untracked agent-surface path in this run's actions is offered,
 * so a previously declined file is offered again.
 */
export async function offerKitExclude({ cwd, paths, interactive, ask, warn }) {
  const toExclude = kitExcludeCandidates(cwd, paths);
  if (toExclude.length === 0) return 0;
  if (!interactive) {
    warn(
      `note: ${toExclude.length} kit file(s) are untracked in this repo; ` +
        `run interactively to add them to .git/info/exclude so they are not committed.`
    );
    return 0;
  }
  const accepted = await ask({
    message:
      `Exclude ${toExclude.length} installed kit file(s) from git via ` +
      `.git/info/exclude, so they are not committed to this repo? ` +
      `(per-clone, never committed; recommended when the repo is shared)`,
    initialValue: true,
  });
  if (!accepted) return 0;
  return writeExcludeEntries(cwd, toExclude).added.length;
}

/**
 * The report lines: one per action (tagged with its agent when `tagAgent`
 * and the action names one; kit-doc actions carry none), then the root doc,
 * the exclude count and the user-level install note.
 */
export function formatInstallReport({ actions, rootDocAction, excluded, tagAgent, userInstall }) {
  const lines = actions.map((a) => {
    const symbol = ACTION_SYMBOL[a.type] ?? '?';
    return tagAgent && a.agent ? `${symbol} [${a.agent}] ${a.path}` : `${symbol} ${a.path}`;
  });
  if (rootDocAction.type !== 'absent') {
    lines.push(`${ROOT_DOC_LABEL[rootDocAction.type]}${rootDocAction.path}`);
  }
  if (excluded > 0) lines.push(`! .git/info/exclude (+${excluded})`);
  if (userInstall) {
    lines.push(
      `note: agentic is also installed at the user level (${userInstall}); ` +
        `a project install is only needed to pin a version or share it via the repo.`
    );
  }
  return lines;
}
