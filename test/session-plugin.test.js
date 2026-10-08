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

// ADR-0090, task-0111 slice 2: the briefing pane's model, on output recorded
// from ad-next/scripts/briefing.mjs. The plugin establishes no fact itself.
const { readBriefing, scriptCandidates } = await import(
  pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href
);
const recorded = (name) => readJson(join(ROOT, 'test', 'fixtures', 'briefing', `${name}.json`));

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

const USER_SCRIPT = '/home/ale/.claude/skills/ad-next/scripts/briefing.mjs';
const PROJECT_SCRIPT = '/work/repo/.claude/skills/ad-next/scripts/briefing.mjs';
const clean = (briefing) => ({ exitCode: 0, stdout: JSON.stringify(briefing), stderr: '' });

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

test('the script runs with the session id in the project root, and the band stays the context band', async () => {
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
  assert.equal(band, 'engine band', 'below the threshold the band draws nothing of its own');
});

test('/agentic-briefing opens the pane, which draws the header, progress, health and details', async () => {
  const { hooks, commands, opened, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  $.ui.resolve = () => ({
    Box: (props) => ({ type: 'Box', props }),
    Text: (props) => ({ type: 'Text', props }),
    Button: (props) => ({ type: 'Button', props }),
    Svg: (props) => ({ type: 'Svg', props }),
    Markdown: (props) => ({ type: 'Markdown', props }),
  });
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(commands[0].name, 'agentic-briefing');

  await hooks['command.run:agentic-briefing']($, {});
  assert.deepEqual(opened, [{ id: 'agentic-briefing', title: 'Briefing' }]);

  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'desktop' });
  const texts = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Text') texts.push(node.props.children);
    for (const child of [node.props?.children].flat()) walk(child);
  };
  walk(pane);
  assert.ok(texts.includes('Task 0111'));
  assert.ok(texts.includes('Show the work in progress briefing in the band'));
  assert.ok(texts.includes('Slice 2, the band and the pane'));
  assert.ok(texts.includes('6 of 9 checks would block'));
  assert.equal(findElement(pane, 'Svg').props.alt, '2 of 5');
  assert.match(findElement(pane, 'Markdown').props.text, /^#### Plan/);
});

test('on the terminal the pane draws text bars instead of SVG', async () => {
  const { hooks, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: clean(recorded('active-task')) },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'terminal' });
  assert.equal(findElement(pane, 'Svg'), null);
  const texts = JSON.stringify(pane);
  assert.match(texts, /██████░░░░░░░░░░ 2\/5/);
});

test('the pane says when there is no briefing to show', async () => {
  const { hooks, $ } = await loadPlugin(99, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  const pane = hooks['ui.render:Pane:agentic-briefing']($, {});
  assert.match(findElement(pane, 'Text').props.children, /No briefing/);
});

const { paneModel } = await import(pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href);

test('paneModel turns the briefing into a header, a next step, progress and health', () => {
  const model = paneModel(recorded('active-task'));
  assert.deepEqual(model.header, {
    number: '0111',
    title: 'Show the work in progress briefing in the band',
    status: 'in-progress',
    chosenBy: 'newest commit ahead of main',
  });
  assert.deepEqual(model.next, {
    step: 'Slice 2, the band and the pane',
    detail:
      "red, then green in the plugin's pure module; live check in the desktop app (owner-observed, at a width that seats the pane and one that does not).",
  });
  assert.deepEqual(model.progress, [
    { label: 'Plan', done: 2, total: 5 },
    { label: 'Criteria', done: 2, total: 5 },
    { label: 'Definition of Done', done: 0, total: 4 },
    { label: 'Roadmap tasks', done: 66, total: 79 },
  ]);
  assert.deepEqual(model.health, [
    { label: 'Plan approval', value: 'before the first code', level: 'ok' },
    { label: 'Deviations', value: 'none recorded', level: 'ok' },
    { label: 'Gate (shadow)', value: '6 of 9 checks would block', level: 'warn' },
  ]);
});

test('paneModel rates each plan-approval order the briefing can report', () => {
  const approvalOf = (approval) =>
    paneModel({ ...recorded('active-task'), approval }).health.find(
      (h) => h.label === 'Plan approval'
    );
  const entry = '2026-10-07 — plan approved';
  assert.deepEqual(approvalOf({ entry, precedesFirstImplementingCommit: false }), {
    label: 'Plan approval',
    value: 'after code was committed',
    level: 'warn',
  });
  assert.deepEqual(approvalOf({ entry: null, precedesFirstImplementingCommit: false }), {
    label: 'Plan approval',
    value: 'missing, and code is committed',
    level: 'warn',
  });
  assert.deepEqual(approvalOf({ entry, precedesFirstImplementingCommit: null }), {
    label: 'Plan approval',
    value: 'order unknown',
    level: 'unknown',
  });
  assert.deepEqual(approvalOf({ entry: null, precedesFirstImplementingCommit: null }), {
    label: 'Plan approval',
    value: 'not approved yet',
    level: 'ok',
  });
});

test('paneModel without an active task keeps only the roadmap and the gate', () => {
  const model = paneModel({
    ...recorded('active-task'),
    task: null,
    plan: null,
    acceptance: null,
    definitionOfDone: null,
    deviations: null,
    approval: null,
    gate: null,
  });
  assert.equal(model.header, null);
  assert.equal(model.next, null);
  assert.deepEqual(model.progress, [{ label: 'Roadmap tasks', done: 66, total: 79 }]);
  assert.deepEqual(model.health, [
    { label: 'Gate (shadow)', value: 'no evidence for this session', level: 'unknown' },
  ]);
});

const { detailsMarkdown } = await import(
  pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href
);

test('detailsMarkdown renders the plan, open items and deviations as checklists', () => {
  const md = detailsMarkdown({
    ...recorded('active-task'),
    deviations: [{ heading: '2026-10-02 — deviation', text: 'Kept the old parser.' }],
    unreadable: [{ path: 'doc/tasks/0002-x.md', code: 'EISDIR' }],
  });
  assert.match(md, /^#### Plan\n- \[x\] Owner accepts ADR-0090 and approves this plan\.\n/);
  assert.match(md, /\n- \[ \] Slice 2, the band and the pane: red/);
  assert.match(md, /\n#### Open criteria\n- \[ \] The `agentic-session` plugin runs/);
  assert.match(md, /\n#### Definition of Done\n- \[ \] Local tests pass/);
  assert.match(md, /\n#### Deviations\n- \*\*2026-10-02 — deviation\*\*: Kept the old parser\.\n/);
  assert.match(md, /\n#### Unreadable\n- `doc\/tasks\/0002-x\.md` \(EISDIR\)/);
});

test('detailsMarkdown is empty without an active task or unreadable files', () => {
  assert.equal(detailsMarkdown({ ...recorded('active-task'), task: null, unreadable: [] }), '');
});

const { progressSvg, progressText } = await import(
  pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href
);

test('progressText draws a cell bar with the count, for the terminal', () => {
  assert.equal(progressText({ done: 2, total: 5 }, 10), '████░░░░░░ 2/5');
  assert.equal(progressText({ done: 0, total: 4 }, 8), '░░░░░░░░ 0/4');
  assert.equal(progressText({ done: 0, total: 0 }, 4), '░░░░ 0/0');
});

test('progressSvg fills the bar in proportion, for the desktop', () => {
  const svg = progressSvg({ done: 66, total: 79 }, 200);
  assert.match(svg, /^<svg [^>]*width="200" height="8"/);
  assert.match(svg, /<rect [^>]*width="167"/, 'filled share: round(200 * 66 / 79)');
  assert.match(progressSvg({ done: 0, total: 0 }, 200), /<rect [^>]*class="fill"[^>]*width="0"/);
});
