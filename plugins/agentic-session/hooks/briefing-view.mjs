// The briefing's display rule, kept free of the engine interface so node:test
// covers it (ADR-0090, task-0111). register.mjs feeds it the JSON that the
// kit's ad-next/scripts/briefing.mjs prints; nothing here computes a fact.

// The task's number from its slug, `0111-show-...` -> `0111`.
function taskNumber(slug) {
  return slug.split('-')[0];
}

// A plan item up to its first colon: `Slice 2, the band and the pane: red...`
// names the step without its detail.
function stepName(item) {
  return item.split(':')[0].trim();
}

export function briefingLine(briefing) {
  const { task, plan, acceptance, deviations, approval, gate } = briefing;
  const gatePart = gate ? [`gate: ${gate.wouldBlock} would-block`] : [];
  if (!task) return ['No single active task', ...gatePart].join(' · ');
  const parts = [`Task ${taskNumber(task.slug)} ${task.status}`];
  if (plan.open.length) parts.push(`next: ${stepName(plan.open[0])}`);
  parts.push(`plan ${plan.done.length}/${plan.done.length + plan.open.length}`);
  parts.push(`${acceptance.open.length} criteria open`);
  if (deviations.length) {
    parts.push(`${deviations.length} deviation${deviations.length === 1 ? '' : 's'}`);
  }
  if (approval.precedesFirstImplementingCommit === false) parts.push('code before plan approval');
  return [...parts, ...gatePart].join(' · ');
}

// The script's briefing from a $.process.run result, or null when the run
// failed, was cut, or printed anything but a JSON object: the band then draws
// nothing rather than a guess.
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
  'newest-commit-ahead': 'newest commit ahead of main',
};

const box = (done) => (done ? '[x]' : '[ ]');

function approvalLines(approval) {
  const order = approval.precedesFirstImplementingCommit;
  if (!approval.entry) {
    return [order === false ? 'none recorded, and code is committed' : 'none recorded yet'];
  }
  if (order === true) return [approval.entry, 'recorded before the first implementing commit'];
  if (order === false) return [approval.entry, 'recorded after code was committed'];
  return [approval.entry, 'cannot tell the order'];
}

function taskSections(b) {
  return [
    {
      title: 'Task',
      lines: [b.task.slug, `${b.task.status}, chosen by: ${RULES[b.task.rule] ?? b.task.rule}`],
    },
    {
      title: 'Plan',
      lines: [
        ...b.plan.done.map((item) => `${box(true)} ${item}`),
        ...b.plan.open.map((item) => `${box(false)} ${item}`),
      ],
    },
    { title: 'Open criteria', lines: b.acceptance.open.map((item) => `${box(false)} ${item}`) },
    {
      title: 'Definition of Done',
      lines: b.definitionOfDone.open.map((item) => `${box(false)} ${item}`),
    },
    { title: 'Plan approval', lines: approvalLines(b.approval) },
    {
      title: 'Deviations',
      lines: b.deviations.length
        ? b.deviations.map((d) => `${d.heading}: ${d.text}`)
        : ['none recorded'],
    },
  ];
}

// The pane's sections, in reading order; a fact the briefing could not
// establish reads "cannot tell" with its reason, never a default value.
export function paneSections(b) {
  const sections = b.task
    ? taskSections(b)
    : [{ title: 'Task', lines: ['cannot tell: no single in-progress task'] }];
  sections.push({
    title: 'Roadmap',
    lines: b.roadmap
      ? [
          `${b.roadmap.tasksDone} of ${b.roadmap.tasksTotal} tasks done (PRD ${b.roadmap.prdStatus})`,
        ]
      : ['cannot tell: no doc/product/PRD.md'],
  });
  sections.push({
    title: 'Gate (shadow)',
    lines: b.gate
      ? [
          `${b.gate.lines} checks logged, ${b.gate.wouldBlock} would-block`,
          ...(b.gate.last
            ? [`last: ${b.gate.last.action}, ${b.gate.last.check}, ${b.gate.last.state}`]
            : []),
        ]
      : ['cannot tell: no evidence for this session'],
  });
  if (b.unreadable.length) {
    sections.push({ title: 'Unreadable', lines: b.unreadable.map((u) => `${u.path} (${u.code})`) });
  }
  return sections;
}
