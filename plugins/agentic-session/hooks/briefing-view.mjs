// The briefing pane's model, kept free of the engine interface so node:test
// covers it (ADR-0090, task-0111). register.mjs feeds it the JSON that the
// kit's ad-next/scripts/briefing.mjs prints and draws what it returns; nothing
// here establishes a fact the script did not report.

// The task's number from its slug, `0111-show-...` -> `0111`.
function taskNumber(slug) {
  return slug.split('-')[0];
}

// The script's briefing from a $.process.run result, or null when the run
// failed, was cut, or printed anything but a JSON object: the pane then shows
// no briefing rather than a guess.
export function readBriefing(result) {
  if (!result || result.exitCode !== 0 || result.isStdoutTruncated) return null;
  try {
    const value = JSON.parse(result.stdout);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const SCRIPT = '.claude/skills/ad-next/scripts/briefing.mjs';

// Where the kit installs the script: a project install pins the repository's
// own kit version, so it wins over the user install.
export function scriptCandidates(root, home) {
  return [`${root}/${SCRIPT}`, ...(home ? [`${home}/${SCRIPT}`] : [])];
}

const RULES = {
  'single-in-progress': 'the only in-progress task',
  'newest-commit-ahead': 'newest commit ahead of the base branch',
};

const STATUS_LEVEL = { 'in-progress': 'active', done: 'ok', blocked: 'warn' };

// A task title from its slug: `0111-show-the-work-in-progress-...` ->
// `Show the work in progress ...`.
function taskTitle(slug) {
  const words = slug.split('-').slice(1).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function nextStep(plan) {
  if (!plan.open.length) return null;
  const item = plan.open[0];
  const cut = item.indexOf(':');
  return cut === -1
    ? { step: item.trim(), detail: '' }
    : { step: item.slice(0, cut).trim(), detail: item.slice(cut + 1).trim() };
}

function approvalHealth(approval, cannotTell = []) {
  if (cannotTell.includes('approval')) {
    const value = cannotTell.includes('git')
      ? 'cannot tell: commits ahead of the base branch not listed'
      : 'cannot tell: approval not committed yet';
    return { value, level: 'unknown' };
  }
  const order = approval.precedesFirstImplementingCommit;
  if (order === true) return { value: 'before the first code', level: 'ok' };
  if (order === false) {
    const value = approval.entry ? 'after code was committed' : 'missing, and code is committed';
    return { value, level: 'warn' };
  }
  return approval.entry
    ? { value: 'order unknown', level: 'unknown' }
    : { value: 'not approved yet', level: 'ok' };
}

function gateHealth(gate) {
  if (!gate) return { value: 'no evidence for this session', level: 'unknown' };
  if (!gate.wouldBlock) return { value: `none of ${gate.lines} checks would block`, level: 'ok' };
  const latest = gate.lastWouldBlock
    ? `; latest: ${gate.lastWouldBlock.check} before ${gate.lastWouldBlock.action}`
    : '';
  return {
    value: `${gate.wouldBlock} of ${gate.lines} checks would block${latest}`,
    level: 'warn',
  };
}

// The pane's model: what the pane draws, derived only from the briefing.
export function paneModel(b) {
  const progress = [];
  if (b.task) {
    progress.push(
      { label: 'Plan', done: b.plan.done.length, total: b.plan.done.length + b.plan.open.length },
      {
        label: 'Criteria',
        done: b.acceptance.done,
        total: b.acceptance.done + b.acceptance.open.length,
      },
      {
        label: 'Definition of Done',
        done: b.definitionOfDone.done,
        total: b.definitionOfDone.done + b.definitionOfDone.open.length,
      }
    );
  }
  if (b.roadmap) {
    progress.push({
      label: 'Roadmap tasks',
      done: b.roadmap.tasksDone,
      total: b.roadmap.tasksTotal,
    });
  }
  const health = [];
  if (b.task) {
    health.push({ label: 'Plan approval', ...approvalHealth(b.approval, b.cannotTell) });
    health.push(
      b.deviations.length
        ? { label: 'Deviations', value: `${b.deviations.length} recorded`, level: 'warn' }
        : { label: 'Deviations', value: 'none recorded', level: 'ok' }
    );
  }
  if (!b.roadmap) {
    health.push({
      label: 'Roadmap',
      value: 'cannot tell: no doc/product/PRD.md',
      level: 'unknown',
    });
  }
  health.push({ label: 'Gate (shadow)', ...gateHealth(b.gate) });
  return {
    header: b.task
      ? {
          number: taskNumber(b.task.slug),
          title: taskTitle(b.task.slug),
          status: b.task.status,
          statusLevel: STATUS_LEVEL[b.task.status] ?? 'unknown',
          chosenBy: RULES[b.task.rule] ?? b.task.rule,
        }
      : null,
    next: b.task ? nextStep(b.plan) : null,
    progress,
    health,
  };
}

const checklist = (items, done) => items.map((item) => `- [${done ? 'x' : ' '}] ${item}`);

// The pane's detail block, as Markdown: checklists the surface draws as such.
const CUT_NOTE = '\n\n_Cut to fit the pane; the task file has the rest._';

// The Markdown element takes at most 10000 characters.
export function detailsMarkdown(b, limit = 10_000) {
  const full = fullDetails(b);
  if (full.length <= limit) return full;
  const room = full.slice(0, Math.max(0, limit - CUT_NOTE.length));
  const lineEnd = room.lastIndexOf('\n');
  return `${lineEnd === -1 ? room : room.slice(0, lineEnd)}${CUT_NOTE}`;
}

function fullDetails(b) {
  const blocks = [];
  if (b.task) {
    blocks.push(['#### Plan', ...checklist(b.plan.done, true), ...checklist(b.plan.open, false)]);
    if (b.acceptance.open.length) {
      blocks.push(['#### Open criteria', ...checklist(b.acceptance.open, false)]);
    }
    if (b.definitionOfDone.open.length) {
      blocks.push(['#### Definition of Done', ...checklist(b.definitionOfDone.open, false)]);
    }
    if (b.deviations.length) {
      blocks.push(['#### Deviations', ...b.deviations.map((d) => `- **${d.heading}**: ${d.text}`)]);
    }
  }
  if (b.unreadable.length) {
    blocks.push(['#### Unreadable', ...b.unreadable.map((u) => `- \`${u.path}\` (${u.code})`)]);
  }
  return blocks.map((lines) => `${lines.join('\n')}\n`).join('\n');
}

const share = ({ done, total }) => (total > 0 ? Math.min(1, done / total) : 0);

export function progressText(item, cells) {
  const filled = Math.round(share(item) * cells);
  return `${'█'.repeat(filled)}${'░'.repeat(cells - filled)} ${item.done}/${item.total}`;
}

// A rounded bar: the track in a muted tone, the fill in the accent.
export function progressSvg(item, width) {
  const filled = Math.round(share(item) * width);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="8" viewBox="0 0 ${width} 8">` +
    `<rect class="track" x="0" y="0" width="${width}" height="8" rx="4" fill="#8884"/>` +
    `<rect class="fill" x="0" y="0" width="${filled}" height="8" rx="4" fill="#d97757"/>` +
    '</svg>'
  );
}
