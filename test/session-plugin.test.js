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
const {
  fillReading,
  normalizeThreshold,
  shouldShow,
  bandLabel,
  DEFAULT_THRESHOLD,
  HANDOFF_LABEL,
  handoffsSince,
  handoffDirs,
  resumePrompt,
} = await import(pathToFileURL(join(PLUGIN, 'hooks', 'band.mjs')).href);

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
  assert.equal(DEFAULT_THRESHOLD, 80);
  assert.equal(normalizeThreshold(75), 75);
  assert.equal(normalizeThreshold('40'), 40);
  for (const bad of [undefined, null, '', 'x', 0, 100, -5, 150, Number.NaN]) {
    assert.equal(normalizeThreshold(bad), 80, String(bad));
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
    { type: 'number', default: 80, min: 1, max: 99 }
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
function loadPlugin(threshold, usage, { script = null, handoffs = null, stored = {} } = {}) {
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
    const ran = [];
    const toasts = [];
    const store = { ...stored };
    const element = (type) => (props) => ({ type, props });
    const $ = {
      session: {
        usage,
        root: async () => '/work/repo',
        id: async () => 'sess-1',
      },
      env: {
        get: async (name) => ({ HOME: '/home/ale', TMPDIR: '/var/tmp-x/' })[name],
      },
      store: {
        get: async (key) => store[key],
        set: async (key, value) => {
          store[key] = value;
        },
      },
      fs: {
        list: async (path) => {
          if (handoffs && path === '/var/tmp-x/agentic-handoffs') return handoffs();
          throw new Error('ENOENT');
        },
        stat: async (path) => {
          if (script && path === script.path) return { size: 1 };
          throw new Error('ENOENT');
        },
      },
      process: {
        run: async (argv, init) => {
          runs.push({ argv, init });
          return typeof script.result === 'function' ? script.result() : script.result;
        },
      },
      command: {
        register: async (spec) => commands.push(spec),
        // The real /clear ends the session before it resolves.
        run: async (spec) => {
          ran.push(spec);
          if (spec.command === 'clear')
            await hooks['session.end']?.($, { reason: 'clear' }, async () => undefined);
        },
      },
      prompt: { submit: async (input) => submitted.push(input) },
      ui: {
        invalidate: () => {},
        open: async (request) => opened.push(request),
        log: (text, options) => logs.push({ text, options }),
        toast: (text) => toasts.push(text),
        resolve: () => ({ Box: element('Box'), Text: element('Text'), Button: element('Button') }),
      },
    };
    return { hooks, logs, submitted, runs, opened, commands, ran, toasts, store, $ };
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

test('the plugin draws and runs the handoff only: it hooks no tool call and rewrites no prompt', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(1, FULL);
  assert.deepEqual(Object.keys(hooks).sort(), [
    'command.run:agentic-briefing',
    'session.compact',
    'session.end',
    'session.start',
    'turn.complete',
    'turn.start',
    'ui.render:AbovePrompt',
    'ui.render:Pane:agentic-briefing',
  ]);
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(band.props.justifyContent, 'space-between', 'the button sits at the right edge');
  const button = findElement(band, 'Button');
  button.props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  // A plugin's prompt.submit of "/ad-handoff" did nothing in the desktop app;
  // the command runs as if typed (task-0116).
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
});

test('a rejected handoff command shows a toast and logs the reason', async () => {
  const { hooks, logs, toasts, $ } = await loadPlugin(1, FULL);
  $.command.run = async () => {
    throw new Error('submit refused');
  };
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  findElement(band, 'Button').props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logs.length, 1);
  assert.match(logs[0].text, /submit refused/);
  assert.deepEqual(logs[0].options, { to: 'debug' });
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /run \/ad-handoff yourself/);
});

// Task 0115: hand off, clear and continue.
const tick = () => new Promise((resolve) => setImmediate(resolve));
const buttons = (tree, found = []) => {
  if (!tree || typeof tree !== 'object') return found;
  if (tree.type === 'Button') found.push(tree);
  for (const child of [tree.props?.children].flat()) buttons(child, found);
  return found;
};
const press = (band, key) =>
  buttons(band)
    .find((b) => b.props.key === key)
    .props.onPress();

// One main-loop turn: its start, then its end with the given reason.
async function runTurn(hooks, $, turnId, reason = 'answer') {
  await hooks['turn.start']($, { turnId }, async () => undefined);
  await hooks['turn.complete']($, { turnId, reason }, async () => undefined);
  await tick();
  await tick();
}

test('regression: task-0115 handoffsSince lists handoffs written since a time, newest first', () => {
  const entries = [
    { name: '20261015T100000Z-old.md', kind: 'file', mtimeMs: 50 },
    { name: '20261015T110000Z-a.md', kind: 'file', mtimeMs: 100 },
    { name: '20261015T120000Z-b.md', kind: 'file', mtimeMs: 150 },
    { name: '20261015T130000Z-notes.txt', kind: 'file', mtimeMs: 200 },
    { name: '20261015T140000Z-dir.md', kind: 'dir', mtimeMs: 300 },
  ];
  assert.deepEqual(handoffsSince(entries, 100), ['20261015T120000Z-b.md', '20261015T110000Z-a.md']);
  assert.deepEqual(handoffsSince(entries, 160), []);
});

test('regression: task-0115 handoffsSince takes only names in the shape ad-handoff writes, free of control characters', () => {
  const at = (name) => ({ name, kind: 'file', mtimeMs: 200 });
  const entries = [
    at('notes.md'),
    at('20261015T120000Z-ok_slug.v2.md'),
    at('20261015T120001Z-two words.md'),
    at('20261015T120002Z-refatoração.md'),
    at('20261015T120000Z-tab\tname.md'),
    at('20261015T120000Z-line\nbreak.md'),
    at('2026-10-15-x.md'),
  ];
  assert.deepEqual(handoffsSince(entries, 100).sort(), [
    '20261015T120000Z-ok_slug.v2.md',
    '20261015T120001Z-two words.md',
    '20261015T120002Z-refatoração.md',
  ]);
});

test('regression: task-0115 the resume prompt names the handoff and its Resume protocol', () => {
  const text = resumePrompt('/var/tmp-x/agentic-handoffs/x.md');
  assert.match(text, /\/var\/tmp-x\/agentic-handoffs\/x\.md/);
  assert.match(text, /Resume protocol/);
});

test('regression: task-0115 with the box on, the handoff is followed by a clear and a resume', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(1, FULL, {
    handoffs: () => [{ name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: Date.now() + 1000 }],
    stored: { clearAfterHandoff: true },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].asUser, true);
  assert.match(submitted[0].text, /\/var\/tmp-x\/agentic-handoffs\/20261015T120000Z-h\.md/);
});

test('regression: task-0115 with the box off, the button only hands off', async () => {
  const { hooks, submitted, ran, $ } = await loadPlugin(1, FULL, {
    handoffs: () => [{ name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: Date.now() + 1000 }],
  });
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
});

test('regression: task-0115 with no handoff file the session is left as it was', async () => {
  const { hooks, submitted, ran, toasts, $ } = await loadPlugin(1, FULL, {
    handoffs: () => [],
    stored: { clearAfterHandoff: true },
  });
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /no handoff file/i);
});

test('regression: task-0115 the clear-and-continue box toggles and is remembered', async () => {
  const { hooks, store, $ } = await loadPlugin(1, FULL);
  await hooks['session.start']($, {}, async () => undefined);
  let band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  const box = () => buttons(band).find((b) => b.props.key === 'clear-after');
  assert.match(box().props.label, /^\[ \]/);
  box().props.onPress();
  await tick();
  assert.equal(store.clearAfterHandoff, true);
  band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'engine band');
  assert.match(box().props.label, /^\[x\]/);
});

// Press with the box on and return the plugin, before any turn runs.
async function pressWithBoxOn(options) {
  const plugin = await loadPlugin(1, FULL, { stored: { clearAfterHandoff: true }, ...options });
  const { hooks, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  return plugin;
}
const oneNewFile = () => [
  { name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: Date.now() + 1000 },
];

test('regression: task-0115 a turn already running at the press does not trigger the clear', async () => {
  const plugin = await loadPlugin(1, FULL, {
    handoffs: oneNewFile,
    stored: { clearAfterHandoff: true },
  });
  const { hooks, ran, toasts, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  await hooks['turn.start']($, { turnId: 'busy' }, async () => undefined);
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  await hooks['turn.complete']($, { turnId: 'busy', reason: 'answer' }, async () => undefined);
  await tick();
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(toasts, []);
  await runTurn(hooks, $, 'handoff-turn');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
});

test('regression: task-0115 an interrupted handoff turn clears nothing', async () => {
  const { hooks, ran, toasts, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  await runTurn(hooks, $, 't1', 'aborted');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.match(toasts[0], /did not finish/);
});

test('regression: task-0115 handoffDirs reads TMPDIR, then /tmp, without duplicates', () => {
  assert.deepEqual(handoffDirs('/var/tmp-x/'), [
    '/var/tmp-x/agentic-handoffs',
    '/tmp/agentic-handoffs',
  ]);
  assert.deepEqual(handoffDirs(undefined), ['/tmp/agentic-handoffs']);
  assert.deepEqual(handoffDirs('/tmp'), ['/tmp/agentic-handoffs']);
});

test('regression: task-0115 a handoff file older than the handoff turn is not resumed from', async () => {
  const { hooks, ran, toasts, $ } = await pressWithBoxOn({
    handoffs: () => [
      { name: '20261015T110000Z-old.md', kind: 'file', mtimeMs: Date.now() - 60_000 },
    ],
  });
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.match(toasts[0], /no handoff file/);
});

test('regression: task-0115 two new handoff files clear nothing', async () => {
  const { hooks, ran, toasts, submitted, $ } = await pressWithBoxOn({
    handoffs: () => [
      { name: '20261015T120000Z-mine.md', kind: 'file', mtimeMs: Date.now() + 1000 },
      { name: '20261015T120001Z-other.md', kind: 'file', mtimeMs: Date.now() + 2000 },
    ],
  });
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(submitted, []);
  assert.match(toasts[0], /more than one/);
});

test('regression: task-0115 a refused clear sends no resume and names the handoff', async () => {
  const plugin = await pressWithBoxOn({ handoffs: oneNewFile });
  const { hooks, ran, toasts, submitted, logs, $ } = plugin;
  $.command.run = async (spec) => {
    ran.push(spec);
    throw new Error('clear refused');
  };
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
  assert.deepEqual(submitted, []);
  assert.match(toasts[0], /not cleared.*\/var\/tmp-x\/agentic-handoffs\/20261015T120000Z-h\.md/);
  assert.match(logs.at(-1).text, /clear refused/);
});

test('regression: task-0115 a refused resume prompt says the session was cleared and where to resume', async () => {
  const { hooks, ran, toasts, logs, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  $.prompt.submit = async () => {
    throw new Error('submit refused');
  };
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
  assert.match(toasts[0], /cleared, but the resume prompt was not sent.*-h\.md/);
  assert.match(logs.at(-1).text, /submit refused/);
});

test('regression: task-0115 a handoff that could not start arms no clear', async () => {
  const plugin = await loadPlugin(1, FULL, {
    handoffs: oneNewFile,
    stored: { clearAfterHandoff: true },
  });
  const { hooks, ran, toasts, $ } = plugin;
  await hooks['session.start']($, {}, async () => undefined);
  $.command.run = async (spec) => {
    ran.push(spec);
    if (spec.command === 'ad-handoff') throw new Error('refused');
  };
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'handoff'
  );
  await tick();
  await runTurn(hooks, $, 'later');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /run \/ad-handoff yourself/);
});

test('regression: task-0115 a session that ends before the handoff turn arms no clear', async () => {
  const { hooks, ran, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  await hooks['session.end']($, { reason: 'clear' }, async () => undefined);
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
});

test('regression: task-0115 turning the box off after the press clears nothing', async () => {
  const { hooks, ran, toasts, $ } = await pressWithBoxOn({ handoffs: oneNewFile });
  press(
    hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band'),
    'clear-after'
  );
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
  assert.deepEqual(toasts, []);
});

test('regression: task-0115 a handoff written in the same millisecond the turn starts counts', async () => {
  let since = null;
  const { hooks, ran, $ } = await pressWithBoxOn({
    handoffs: () => [{ name: '20261015T120000Z-h.md', kind: 'file', mtimeMs: since }],
  });
  const realNow = Date.now;
  Date.now = () => 1_000_000;
  try {
    since = 1_000_000;
    await runTurn(hooks, $, 't1');
  } finally {
    Date.now = realNow;
  }
  assert.deepEqual(ran, [{ command: 'ad-handoff' }, { command: 'clear' }]);
});

test('regression: task-0115 an unreadable store leaves the box off', async () => {
  const { hooks, ran, $ } = await loadPlugin(1, FULL, { handoffs: oneNewFile });
  $.store.get = async () => {
    throw new Error('store down');
  };
  await hooks['session.start']($, {}, async () => undefined);
  const band = hooks['ui.render:AbovePrompt']($, { hasSurvey: false }, () => 'band');
  assert.match(buttons(band).find((b) => b.props.key === 'clear-after').props.label, /^\[ \]/);
  press(band, 'handoff');
  await tick();
  await runTurn(hooks, $, 't1');
  assert.deepEqual(ran, [{ command: 'ad-handoff' }]);
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
const { detailsMarkdown, paneModel, progressSvg, progressText, readBriefing, scriptCandidates } =
  await import(pathToFileURL(join(PLUGIN, 'hooks', 'briefing-view.mjs')).href);
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
  assert.ok(texts.includes('6 of 10 checks would block; latest: audit before gh pr merge'));
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

test('paneModel turns the briefing into a header, a next step, progress and health', () => {
  const model = paneModel(recorded('active-task'));
  assert.deepEqual(model.header, {
    number: '0111',
    title: 'Show the work in progress briefing in the band',
    status: 'in-progress',
    statusLevel: 'active',
    chosenBy: 'newest commit ahead of the base branch',
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
    {
      label: 'Gate (shadow)',
      value: '6 of 10 checks would block; latest: audit before gh pr merge',
      level: 'warn',
    },
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

test('regression: task-0111 paneModel shows what the script could not tell instead of a known state', () => {
  const model = paneModel({
    ...recorded('active-task'),
    approval: { entry: null, precedesFirstImplementingCommit: null },
    roadmap: null,
    cannotTell: ['roadmap', 'approval', 'git'],
  });
  assert.deepEqual(
    model.health.find((h) => h.label === 'Plan approval'),
    {
      label: 'Plan approval',
      value: 'cannot tell: commits ahead of the base branch not listed',
      level: 'unknown',
    }
  );
  assert.deepEqual(
    model.health.find((h) => h.label === 'Roadmap'),
    {
      label: 'Roadmap',
      value: 'cannot tell: no doc/product/PRD.md',
      level: 'unknown',
    }
  );
});

test('paneModel rates a gate with no would-block line as clear', () => {
  const gate = { lines: 3, wouldBlock: 0, last: null, lastWouldBlock: null };
  assert.deepEqual(paneModel({ ...recorded('active-task'), gate }).health.at(-1), {
    label: 'Gate (shadow)',
    value: 'none of 3 checks would block',
    level: 'ok',
  });
});

test('regression: task-0111 a slower earlier script run never overwrites a newer briefing', async () => {
  const releases = [];
  const { hooks, $ } = await loadPlugin(99, FULL, {
    script: {
      path: USER_SCRIPT,
      result: () => new Promise((resolve) => releases.push(resolve)),
    },
  });
  const older = {
    ...recorded('active-task'),
    task: { ...recorded('active-task').task, slug: '0001-older' },
  };
  const first = hooks['turn.complete']($, {}, async () => undefined);
  await new Promise((resolve) => setImmediate(resolve));
  const second = hooks['turn.complete']($, {}, async () => undefined);
  await new Promise((resolve) => setImmediate(resolve));
  releases[1](clean(recorded('active-task')));
  await second;
  releases[0](clean(older));
  await first;

  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'terminal' });
  assert.match(JSON.stringify(pane), /Task 0111/);
  assert.doesNotMatch(JSON.stringify(pane), /Task 0001/);
});

test('paneModel rates the task status for its mark', () => {
  const levelOf = (status) =>
    paneModel({ ...recorded('active-task'), task: { ...recorded('active-task').task, status } })
      .header.statusLevel;
  assert.equal(levelOf('done'), 'ok');
  assert.equal(levelOf('blocked'), 'warn');
  assert.equal(levelOf('proposed'), 'unknown');
});

test('detailsMarkdown cuts a long block at a line boundary and says so', () => {
  const long = Array.from({ length: 400 }, (_, i) => `Item ${i} with some words to fill the line.`);
  const md = detailsMarkdown({ ...recorded('active-task'), plan: { done: [], open: long } }, 2000);
  assert.ok(md.length <= 2000);
  assert.match(md, /\n\n_Cut to fit the pane; the task file has the rest\._$/);
  assert.match(md.split('\n\n_Cut')[0], /\.$/, 'the cut lands after a whole line');
});

test('regression: task-0111 a script run still in flight at /clear never brings the old briefing back', async () => {
  const releases = [];
  const { hooks, $ } = await loadPlugin(99, FULL, {
    script: { path: USER_SCRIPT, result: () => new Promise((resolve) => releases.push(resolve)) },
  });
  const inFlight = hooks['turn.complete']($, {}, async () => undefined);
  await new Promise((resolve) => setImmediate(resolve));
  await hooks['session.end']($, {}, async () => undefined);
  releases[0](clean(recorded('active-task')));
  await inFlight;

  const pane = hooks['ui.render:Pane:agentic-briefing']($, { surface: 'terminal' });
  assert.match(findElement(pane, 'Text').props.children, /No briefing/);
});

test('regression: task-0111 paneModel and detailsMarkdown tolerate a briefing without cannotTell', () => {
  const { cannotTell, ...older } = recorded('active-task');
  void cannotTell;
  assert.equal(paneModel(older).health[0].label, 'Plan approval');
  assert.equal(detailsMarkdown({ ...older, task: null, unreadable: [] }, 50), '');
});

test('regression: task-0111 detailsMarkdown cuts a single long line without dropping into a garbled slice', () => {
  const md = detailsMarkdown(
    { ...recorded('active-task'), plan: { done: [], open: ['x'.repeat(3000)] } },
    500
  );
  assert.ok(md.length <= 500);
  assert.match(md, /_Cut to fit the pane; the task file has the rest\._$/);
});
