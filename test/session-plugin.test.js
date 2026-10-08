import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ADR-0088, task-0104: the agentic-session companion plugin. The engine run is
// verified live in the desktop app (GROUND-0035 limitations); these tests cover
// the band's pure rule and the manifests the marketplace install reads.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLUGIN = join(ROOT, 'plugins', 'agentic-session');
const { fillReading, normalizeThreshold, shouldShow, bandLabel, DEFAULT_THRESHOLD, HANDOFF_LABEL } =
  await import(pathToFileURL(join(PLUGIN, 'hooks', 'band.mjs')).href);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('fillReading measures toward the auto-compact point when auto-compaction is on', () => {
  const reading = fillReading({
    tokens: 90_000,
    window: 200_000,
    breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 150_000 },
  });
  assert.deepEqual(reading, { percent: 60, basis: 'auto-compact' });
});

test('fillReading falls back to the model window when auto-compaction is off or unknown', () => {
  assert.deepEqual(
    fillReading({ tokens: 50_000, window: 200_000, breakdown: { isAutoCompactEnabled: false } }),
    { percent: 25, basis: 'window' }
  );
  assert.deepEqual(fillReading({ tokens: 50_000, window: 200_000 }), {
    percent: 25,
    basis: 'window',
  });
});

test('fillReading has no reading before the first response or without a window', () => {
  assert.equal(fillReading(undefined), null);
  assert.equal(fillReading({ window: 200_000 }), null);
  assert.equal(fillReading({ tokens: 10, window: 0 }), null);
});

test('fillReading caps the percentage at 100', () => {
  const reading = fillReading({
    tokens: 160_000,
    window: 200_000,
    breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 150_000 },
  });
  assert.equal(reading.percent, 100);
});

test('normalizeThreshold keeps 1 to 99 and falls back to the default otherwise', () => {
  assert.equal(DEFAULT_THRESHOLD, 60);
  assert.equal(normalizeThreshold(75), 75);
  assert.equal(normalizeThreshold('40'), 40);
  for (const bad of [undefined, null, '', 'x', 0, 100, -5, 150, Number.NaN]) {
    assert.equal(normalizeThreshold(bad), 60, String(bad));
  }
});

test('shouldShow draws at and above the threshold and never without a reading', () => {
  assert.equal(shouldShow({ percent: 60, basis: 'window' }, 60), true);
  assert.equal(shouldShow({ percent: 61, basis: 'window' }, 60), true);
  assert.equal(shouldShow({ percent: 59, basis: 'window' }, 60), false);
  assert.equal(shouldShow(null, 60), false);
});

test('the button names the kit and its skill', () => {
  assert.equal(HANDOFF_LABEL, 'AD handoff');
});

test('bandLabel names the percentage and what it is measured against', () => {
  assert.equal(
    bandLabel({ percent: 72, basis: 'auto-compact' }),
    'Context 72% of the auto-compact point'
  );
  assert.equal(bandLabel({ percent: 72, basis: 'window' }), 'Context 72% of the window');
});

test('the marketplace lists agentic-session by a relative source whose manifest name matches', () => {
  const marketplace = readJson(join(ROOT, '.claude-plugin', 'marketplace.json'));
  assert.equal(marketplace.name, 'agentic-development');
  assert.equal(typeof marketplace.owner?.name, 'string');
  const entry = marketplace.plugins.find((plugin) => plugin.name === 'agentic-session');
  assert.ok(entry, 'agentic-session is listed');
  assert.equal(entry.source, './plugins/agentic-session');
  const manifest = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'));
  assert.equal(manifest.name, entry.name, 'entry name equals manifest name');
});

test('the plugin manifest declares the threshold option and one hooks module that exists', () => {
  const manifest = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'));
  const threshold = manifest.userConfig?.threshold;
  assert.deepEqual(
    {
      type: threshold?.type,
      default: threshold?.default,
      min: threshold?.min,
      max: threshold?.max,
    },
    { type: 'number', default: 60, min: 1, max: 99 }
  );
  assert.equal(typeof threshold.title, 'string');
  assert.equal(typeof threshold.description, 'string');
  const allowed = new Set(['type', 'title', 'description', 'required', 'default', 'min', 'max']);
  for (const key of Object.keys(threshold))
    assert.ok(allowed.has(key), `unknown userConfig key ${key}`);
  const hooks = readJson(join(PLUGIN, 'hooks', 'hooks.json'));
  assert.equal(hooks.modules.length, 1);
  assert.ok(existsSync(join(PLUGIN, 'hooks', hooks.modules[0])), 'the hooks module exists');
});

// A fake engine: hooks keyed by event and matcher, and a host with no kit
// script installed unless `script` gives the path and the run's result.
function loadPlugin(threshold, usage, { script = null } = {}) {
  return import(pathToFileURL(join(PLUGIN, 'hooks', 'register.mjs')).href).then(({ register }) => {
    const hooks = {};
    register(
      (event, ...rest) => {
        const matcher = rest.length > 1 ? rest[0] : {};
        const key = [event, matcher.component, matcher.requestId, matcher.command]
          .filter(Boolean)
          .join(':');
        hooks[key] = rest.at(-1);
      },
      { threshold }
    );
    const logs = [];
    const submitted = [];
    const runs = [];
    const opened = [];
    const commands = [];
    const element = (type) => (props) => ({ type, props });
    const $ = {
      session: {
        usage,
        root: async () => '/work/repo',
        id: async () => 'sess-1',
      },
      env: { get: async (name) => (name === 'HOME' ? '/home/ale' : undefined) },
      fs: {
        stat: async (path) => {
          if (script && path === script.path) return { size: 1 };
          throw new Error('ENOENT');
        },
      },
      process: {
        run: async (argv, init) => {
          runs.push({ argv, init });
          return script.result;
        },
      },
      command: { register: async (spec) => commands.push(spec) },
      prompt: { submit: async (input) => submitted.push(input) },
      ui: {
        invalidate: () => {},
        open: async (request) => opened.push(request),
        log: (text, options) => logs.push({ text, options }),
        resolve: () => ({ Box: element('Box'), Text: element('Text'), Button: element('Button') }),
      },
    };
    return { hooks, logs, submitted, runs, opened, commands, $ };
  });
}

// The first element of a type in a drawn tree, depth first.
function findElement(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children].flat()) {
    const found = findElement(child, type);
    if (found) return found;
  }
  return null;
}

const FULL = async () => ({
  context: { tokens: 90000, window: 200000 },
});

test('the plugin draws and submits only: it hooks no tool call and rewrites no prompt', async () => {
  const { hooks, submitted, $ } = await loadPlugin(1, FULL);
  assert.deepEqual(Object.keys(hooks).sort(), [
    'command.run:agentic-briefing',
    'session.compact',
    'session.end',
    'session.start',
    'turn.complete',
    'ui.render:AbovePrompt',
    'ui.render:Pane:agentic-briefing',
  ]);
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(band.props.justifyContent, 'space-between', 'the button sits at the right edge');
  const button = findElement(band, 'Button');
  button.props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(submitted, [{ text: '/ad-handoff', asUser: true }]);
});

test('a rejected handoff submit is logged to the debug log only', async () => {
  const { hooks, logs, $ } = await loadPlugin(1, FULL);
  $.prompt.submit = async () => {
    throw new Error('submit refused');
  };
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  findElement(band, 'Button').props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logs.length, 1);
  assert.match(logs[0].text, /submit refused/);
  assert.deepEqual(logs[0].options, { to: 'debug' });
});

test('the npm package does not ship the plugin or the marketplace', () => {
  const files = readJson(join(ROOT, 'package.json')).files;
  for (const entry of files) {
    assert.ok(!/^(plugins|\.claude-plugin)\b/.test(entry), `package.json#files ships ${entry}`);
  }
});

test('a failed reading hides the band and logs the reason to the debug log only', async () => {
  const { hooks, logs, $ } = await loadPlugin(1, async () => {
    throw new Error('usage unavailable');
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(logs.length, 1);
  assert.match(logs[0].text, /usage unavailable/);
  assert.deepEqual(logs[0].options, { to: 'debug' });
  const drawn = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(drawn, 'engine band', 'the engine band stands when no reading exists');
});

// ADR-0090, task-0111 slice 2: the briefing's display rule, on output recorded
// from ad-next/scripts/briefing.mjs. The plugin computes no fact itself.
const { briefingLine, paneSections, readBriefing, scriptCandidates } = await import(
  pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href
);
const recorded = (name) => readJson(join(ROOT, 'test', 'fixtures', 'briefing', `${name}.json`));

test('briefingLine names the task, its next plan item and what is open', () => {
  assert.equal(
    briefingLine(recorded('active-task')),
    'Task 0111 in-progress · next: Slice 2, the band and the pane · plan 2/5 · 3 criteria open · gate: 6 would-block'
  );
});

test('briefingLine flags code before the plan approval and recorded deviations', () => {
  const briefing = {
    ...recorded('active-task'),
    gate: null,
    deviations: [{ heading: '2026-10-02 — deviation', text: 'Kept the old parser.' }],
    approval: {
      entry: null,
      approvedIn: null,
      firstImplementingCommit: 'abc',
      precedesFirstImplementingCommit: false,
    },
  };
  assert.equal(
    briefingLine(briefing),
    'Task 0111 in-progress · next: Slice 2, the band and the pane · plan 2/5 · 3 criteria open · 1 deviation · code before plan approval'
  );
});

test('briefingLine says when the briefing cannot tell the active task', () => {
  const briefing = {
    ...recorded('active-task'),
    task: null,
    plan: null,
    acceptance: null,
    definitionOfDone: null,
    deviations: null,
    approval: null,
    cannotTell: ['task'],
  };
  assert.equal(briefingLine(briefing), 'No single active task · gate: 6 would-block');
});

test('readBriefing takes the script output only from a clean run that printed a JSON object', () => {
  const stdout = JSON.stringify(recorded('active-task'));
  assert.deepEqual(readBriefing({ exitCode: 0, stdout }), recorded('active-task'));
  assert.equal(readBriefing({ exitCode: 1, stdout }), null);
  assert.equal(readBriefing({ exitCode: 0, stdout: 'not json' }), null);
  assert.equal(readBriefing({ exitCode: 0, stdout: '[]' }), null);
  assert.equal(readBriefing({ exitCode: 0, stdout: 'null' }), null);
  assert.equal(
    readBriefing({ exitCode: 0, stdout: '{"task":null}', isStdoutTruncated: true }),
    null
  );
});

test('scriptCandidates looks for the project install first, then the user install', () => {
  assert.deepEqual(scriptCandidates('/work/repo', '/home/ale'), [
    '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs',
    '/home/ale/.claude/skills/ad-next/scripts/briefing.mjs',
  ]);
  assert.deepEqual(scriptCandidates('/work/repo', undefined), [
    '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs',
  ]);
});

test('paneSections lays out every fact, naming what the briefing cannot tell', () => {
  const sections = paneSections(recorded('active-task'));
  const byTitle = Object.fromEntries(sections.map((s) => [s.title, s.lines]));

  assert.deepEqual(
    sections.map((s) => s.title),
    [
      'Task',
      'Plan',
      'Open criteria',
      'Definition of Done',
      'Plan approval',
      'Deviations',
      'Roadmap',
      'Gate (shadow)',
    ]
  );
  assert.deepEqual(byTitle.Task, [
    '0111-show-the-work-in-progress-briefing-in-the-band',
    'in-progress, chosen by: newest commit ahead of main',
  ]);
  assert.equal(byTitle.Plan[0], '[x] Owner accepts ADR-0090 and approves this plan.');
  assert.equal(byTitle.Plan.length, 5);
  assert.equal(
    byTitle['Open criteria'][0].startsWith('[ ] The `agentic-session` plugin runs'),
    true
  );
  assert.equal(byTitle['Definition of Done'].length, 4);
  assert.deepEqual(byTitle['Plan approval'], [
    '2026-10-07 — plan approved',
    'recorded before the first implementing commit',
  ]);
  assert.deepEqual(byTitle.Deviations, ['none recorded']);
  assert.deepEqual(byTitle.Roadmap, ['66 of 79 tasks done (PRD accepted)']);
  assert.deepEqual(byTitle['Gate (shadow)'], [
    '9 checks logged, 6 would-block',
    'last: git push, gate-run, clear',
  ]);
});

test('paneSections says cannot tell for missing facts and lists unreadable files', () => {
  const sections = paneSections({
    task: null,
    plan: null,
    acceptance: null,
    definitionOfDone: null,
    deviations: null,
    approval: null,
    roadmap: null,
    gate: null,
    unreadable: [{ path: 'doc/tasks/0002-x.md', code: 'EISDIR' }],
    cannotTell: ['task', 'roadmap', 'gate'],
  });
  assert.deepEqual(sections, [
    { title: 'Task', lines: ['cannot tell: no single in-progress task'] },
    { title: 'Roadmap', lines: ['cannot tell: no doc/product/PRD.md'] },
    { title: 'Gate (shadow)', lines: ['cannot tell: no evidence for this session'] },
    { title: 'Unreadable', lines: ['doc/tasks/0002-x.md (EISDIR)'] },
  ]);
});

test('paneSections states each plan-approval order the briefing can report', () => {
  const approvalOf = (approval) =>
    paneSections({ ...recorded('active-task'), approval }).find((s) => s.title === 'Plan approval')
      .lines;
  const entry = '2026-10-07 — plan approved';
  assert.deepEqual(approvalOf({ entry, precedesFirstImplementingCommit: false }), [
    entry,
    'recorded after code was committed',
  ]);
  assert.deepEqual(approvalOf({ entry, precedesFirstImplementingCommit: null }), [
    entry,
    'cannot tell the order',
  ]);
  assert.deepEqual(approvalOf({ entry: null, precedesFirstImplementingCommit: false }), [
    'none recorded, and code is committed',
  ]);
  assert.deepEqual(approvalOf({ entry: null, precedesFirstImplementingCommit: null }), [
    'none recorded yet',
  ]);
});

const USER_SCRIPT = '/home/ale/.claude/skills/ad-next/scripts/briefing.mjs';
const PROJECT_SCRIPT = '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs';
const clean = (briefing) => ({ exitCode: 0, stdout: JSON.stringify(briefing), stderr: '' });

test('the band shows the installed script briefing even below the context threshold', async () => {
  const { hooks, runs, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);

  assert.deepEqual(runs, [
    {
      argv: ['node', USER_SCRIPT, '--session', 'sess-1'],
      init: { cwd: '/work/repo', timeoutMs: 10_000 },
    },
  ]);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(findElement(band, 'Text').props.children, briefingLine(recorded('active-task')));
  assert.equal(findElement(band, 'Button'), null, 'no handoff button below the threshold');
});

test('the project install of the script wins over the user install', async () => {
  const { hooks, runs, $ } = await loadPlugin(99, FULL, {
    script: { path: PROJECT_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(runs[0].argv[1], PROJECT_SCRIPT);
});

test('a failed script run draws no briefing and logs to the debug log only', async () => {
  const { hooks, logs, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: { exitCode: 1, stdout: '', stderr: 'boom' } },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const drawn = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(drawn, 'engine band');
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0].options, { to: 'debug' });
});

test('without an installed script nothing runs and nothing is logged', async () => {
  const { hooks, runs, logs, $ } = await loadPlugin(99, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  assert.deepEqual(runs, []);
  assert.deepEqual(logs, []);
  assert.equal(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band'),
    'engine band'
  );
});

test('/agentic-briefing opens the pane, which lays out the briefing sections', async () => {
  const { hooks, commands, opened, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(commands[0].name, 'agentic-briefing');

  await hooks['command.run:agentic-briefing']($, {});
  assert.deepEqual(opened, [{ id: 'agentic-briefing', title: 'Briefing' }]);

  const pane = hooks['ui.render:Pane:agentic-briefing']($, {});
  const titles = pane.props.children.map((section) => section.props.children[0].props.children);
  assert.deepEqual(
    titles,
    paneSections(recorded('active-task')).map((s) => s.title)
  );
});

test('the pane says when there is no briefing to show', async () => {
  const { hooks, $ } = await loadPlugin(99, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  const pane = hooks['ui.render:Pane:agentic-briefing']($, {});
  assert.match(findElement(pane, 'Text').props.children, /No briefing/);
});
