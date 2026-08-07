import * as p from '@clack/prompts';
import { installedPathsToExclude, writeExcludeEntries } from '../lib/git.js';

// The exclude offer is scoped to the agent surface — the skill/subagent files
// the kit installs under these roots. ADR-0051 Decision 4 covers exactly those
// two write surfaces. Root kit-docs (WORKFLOW.md / WORKFLOW-FLOWS.md, installed
// by installKitDocs per ADR-0049 Decision 6) are deliberately NOT swept: they
// are project-facing constitution docs a team may commit and diverge from, and
// installKitDocs already guards them with its own report-and-skip. Sweeping
// them here would offer to hide a file the kit's own convention commits.
const AGENT_SURFACE_PREFIXES = ['.claude/', '.agents/', '.codex/'];

/**
 * The agent-surface, currently-untracked subset of `paths` — the exclude
 * offer's candidate set. Extracted pure so the scoping is unit-testable
 * without driving the interactive prompt (the suite has no TTY).
 */
export function kitExcludeCandidates(cwd, paths) {
  const agentSurface = paths.filter((p) =>
    AGENT_SURFACE_PREFIXES.some((prefix) => p.startsWith(prefix))
  );
  return installedPathsToExclude(cwd, agentSurface);
}

/**
 * Offer to keep the kit files it installs under the agent surface out of a
 * shared repo's commits via `.git/info/exclude` (ADR-0051 Decision 4). Shared
 * by init and update — it lives here rather than in either command so the two
 * commands depend on shared code, not on each other (GUIDELINES §1.2). Returns
 * the number of entries added. Interactive asks (default yes); non-interactive
 * declines and notes it, holding the refuse-to-guess posture — the write is
 * local-only, but a `-y`/CI run shouldn't silently hide files a user might mean
 * to commit. Tracked files are already dropped by `installedPathsToExclude`, so
 * a mixed-ownership directory is safe. The candidate set is every
 * currently-untracked agent-surface path in this run's actions, not only files
 * this run created — a previously declined file is offered again.
 */
export async function offerKitExclude({ cwd, paths, interactive }) {
  const toExclude = kitExcludeCandidates(cwd, paths);
  if (toExclude.length === 0) return 0;
  if (!interactive) {
    process.stderr.write(
      `note: ${toExclude.length} kit file(s) are untracked in this repo; ` +
        `run interactively to add them to .git/info/exclude so they are not committed.\n`
    );
    return 0;
  }
  const answer = await p.confirm({
    message:
      `Exclude ${toExclude.length} installed kit file(s) from git via ` +
      `.git/info/exclude, so they are not committed to this repo? ` +
      `(per-clone, never committed; recommended when the repo is shared)`,
    initialValue: true,
  });
  if (p.isCancel(answer) || !answer) return 0;
  return writeExcludeEntries(cwd, toExclude).added.length;
}
