import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ADR-0088, task-0104: the agentic-session companion plugin. The engine run is
// verified live in the desktop app (GROUND-0035 limitations); these tests cover
// the band's pure rule and the manifests the marketplace install reads.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLUGIN = join(ROOT, 'plugins', 'agentic-session');
const { fillReading, normalizeThreshold, shouldShow, bandLabel, DEFAULT_THRESHOLD, HANDOFF_LABEL } =
  await import(join(PLUGIN, 'hooks', 'band.mjs'));

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

test('the plugin draws and submits only: it hooks no tool call and rewrites no prompt', () => {
  const source = readFileSync(join(PLUGIN, 'hooks', 'register.mjs'), 'utf8');
  assert.doesNotMatch(source, /on\(\s*['"]tool\.call['"]/);
  assert.doesNotMatch(source, /on\(\s*['"]prompt\.submit['"]/);
  assert.match(source, /\$\.prompt\.submit\(\{ text: '\/ad-handoff', asUser: true \}\)/);
  assert.match(source, /justifyContent: 'space-between'/, 'the button sits at the right edge');
});

test('the npm package does not ship the plugin or the marketplace', () => {
  const files = readJson(join(ROOT, 'package.json')).files;
  for (const entry of files) {
    assert.ok(!/^(plugins|\.claude-plugin)\b/.test(entry), `package.json#files ships ${entry}`);
  }
});

test('a failed reading hides the band and logs the reason to the debug log only', async () => {
  const { register } = await import(join(PLUGIN, 'hooks', 'register.mjs'));
  const hooks = {};
  register((event, ...rest) => (hooks[event] = rest.at(-1)), { threshold: 1 });
  const logs = [];
  const $ = {
    session: {
      usage: async () => {
        throw new Error('usage unavailable');
      },
    },
    ui: { invalidate: () => {}, log: (text, options) => logs.push({ text, options }) },
  };
  await hooks['session.start']($, {}, async () => undefined);
  assert.equal(logs.length, 1);
  assert.match(logs[0].text, /usage unavailable/);
  assert.deepEqual(logs[0].options, { to: 'debug' });
  const drawn = hooks['ui.render']($, { hasSurvey: false }, () => 'engine band');
  assert.equal(drawn, 'engine band', 'the engine band stands when no reading exists');
});
