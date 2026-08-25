import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atomicWrite,
  parseTemplateMarkdown,
  prepareCandidate,
  renderTemplateMarkdown,
  resolveTemplateCatalog,
  validateTemplate,
  writeTemplateAtomic,
} from '../src/skills/claude-code/ad-template-tune/scripts/template-store.mjs';
import { resolveSpawn } from '../scripts/hook-npm-test.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCRIPT = join(
  ROOT,
  'src',
  'skills',
  'claude-code',
  'ad-template-tune',
  'scripts',
  'template-store.mjs'
);

function validTemplate(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'github-proposal-issue',
    artifactClass: 'publication',
    artifactType: 'github-proposal-issue',
    destinations: ['github-issue'],
    audiences: ['engineering-team'],
    purpose: 'Propose a bounded change for a team decision.',
    useWhen: ['The issue asks the team to accept or schedule a change.'],
    avoidWhen: [],
    requiredInformation: ['Concrete state', 'Observable completion'],
    optionalInformation: ['Alternatives'],
    orderingRules: ['Put the concrete state before supporting depth.'],
    provenance: {
      derivedOnly: true,
      rawSourcesRetained: false,
      authorGroups: [
        {
          authorClass: 'owner',
          sources: [
            {
              locator: 'https://github.com/example/project/issues/1',
              summary: 'Approved owner-authored proposal issue.',
              approved: true,
            },
          ],
        },
      ],
    },
    strengths: [
      {
        id: 'front-load-state',
        description: 'Makes the current state legible before implementation detail.',
        sourceLocators: ['https://github.com/example/project/issues/1'],
      },
    ],
    tradeOffs: ['Requires evidence before recommending implementation.'],
    approval: { status: 'approved', approvedBy: 'owner' },
    version: 1,
    limitations: [],
    retainedExcerpts: [],
    instructions: ['State the concrete issue before explaining the trade-off.'],
    ...overrides,
  };
}

function writeTemplate(root, template) {
  const directory = join(root, template.artifactClass);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `${template.id}.md`);
  writeFileSync(path, renderTemplateMarkdown(template));
  return path;
}

function approvalFor(prepared, overrides = {}) {
  return {
    schemaVersion: 1,
    templateId: prepared.templateId,
    candidateSha256: prepared.candidateSha256,
    targetLayer: 'machine',
    visibility: 'machine-local',
    approved: true,
    approvedBy: 'owner',
    ...overrides,
  };
}

function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

test('template contract round-trips the canonical Markdown shape', () => {
  const template = validTemplate();
  assert.deepEqual(parseTemplateMarkdown(renderTemplateMarkdown(template)), template);
  assert.deepEqual(validateTemplate(template), []);
});

test('template validation rejects privacy, provenance, approval, and identifier violations', () => {
  const cases = [
    [
      { schemaVersion: 99 },
      'schemaVersion must be 1',
    ],
    [
      { id: '../escape' },
      'id must be a kebab-case path-safe identifier',
    ],
    [
      { provenance: undefined },
      'provenance must be an object',
    ],
    [
      {
        provenance: {
          derivedOnly: true,
          rawSourcesRetained: false,
          authorGroups: [
            {
              authorClass: 'owner',
              sources: [{ locator: 'shared', summary: 'owner', approved: true }],
            },
            {
              authorClass: 'community',
              sources: [{ locator: 'shared', summary: 'team', approved: true }],
            },
          ],
        },
      },
      'source locator cannot appear under multiple author classes',
    ],
    [
      {
        retainedExcerpts: [
          {
            text: 'Unapproved exact text.',
            sourceLocator: 'https://github.com/example/project/issues/1',
            authorClass: 'owner',
            retentionApproved: false,
          },
        ],
      },
      'retainedExcerpts[0].retentionApproved must be true',
    ],
    [
      { approval: { status: 'draft', approvedBy: 'owner' } },
      'approval.status must be approved',
    ],
    [
      { unknownField: true },
      'template contains an unsupported field',
    ],
  ];

  for (const [override, expected] of cases) {
    assert.ok(validateTemplate(validTemplate(override)).includes(expected), expected);
  }

  const privateField = 'private-source-content-must-not-appear';
  const privacyErrors = validateTemplate(validTemplate({ [privateField]: true }));
  assert.doesNotMatch(privacyErrors.join('; '), new RegExp(privateField));
});

test('template resolution applies project over machine over bundled with visible conflicts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-resolve-'));
  try {
    const repo = join(dir, 'repo');
    const bundled = join(dir, 'bundled');
    const machine = join(dir, 'machine');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });

    writeTemplate(bundled, validTemplate({ purpose: 'Bundled purpose.', version: 1 }));
    writeTemplate(machine, validTemplate({ purpose: 'Machine purpose.', version: 2 }));
    writeTemplate(
      join(repo, '.agentic', 'templates'),
      validTemplate({ purpose: 'Project purpose.', version: 3 })
    );
    writeTemplate(
      bundled,
      validTemplate({
        id: 'status-comment',
        artifactType: 'status-comment',
        purpose: 'Report current status.',
      })
    );

    const result = resolveTemplateCatalog({
      cwd: repo,
      bundledDir: bundled,
      machineDir: machine,
    });

    assert.equal(result.layers.bundled.templates.length, 2);
    assert.equal(result.layers.machine.templates.length, 1);
    assert.equal(result.layers.project.templates.length, 1);
    assert.equal(result.templates.length, 2);
    const selected = result.templates.find(({ id }) => id === 'github-proposal-issue');
    assert.equal(selected.selectedLayer, 'project');
    assert.deepEqual(selected.shadowed.map(({ layer }) => layer), ['machine', 'bundled']);
    assert.deepEqual(result.conflicts, [
      {
        id: 'github-proposal-issue',
        selectedLayer: 'project',
        shadowedLayers: ['machine', 'bundled'],
      },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('template resolution rejects duplicate identifiers inside one layer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-duplicate-'));
  try {
    const bundled = join(dir, 'bundled');
    mkdirSync(join(bundled, 'publication'), { recursive: true });
    const template = validTemplate();
    writeFileSync(join(bundled, 'publication', 'first.md'), renderTemplateMarkdown(template));
    writeFileSync(join(bundled, 'publication', 'second.md'), renderTemplateMarkdown(template));
    assert.throws(
      () => resolveTemplateCatalog({ cwd: dir, bundledDir: bundled, machineDir: join(dir, 'none') }),
      /duplicate template id github-proposal-issue in bundled/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('template resolution rejects a symlink that escapes a store', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-symlink-'));
  try {
    const bundled = join(dir, 'bundled');
    const outside = join(dir, 'outside.md');
    mkdirSync(join(bundled, 'publication'), { recursive: true });
    writeFileSync(outside, renderTemplateMarkdown(validTemplate()));
    symlinkSync(outside, join(bundled, 'publication', 'github-proposal-issue.md'));
    assert.throws(
      () => resolveTemplateCatalog({ cwd: dir, bundledDir: bundled, machineDir: join(dir, 'none') }),
      /template store cannot contain symbolic link/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('template write requires approval for the exact candidate and preserves prior state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-write-'));
  try {
    const machine = join(dir, 'machine');
    const input = join(dir, 'candidate.json');
    const approval = join(dir, 'approval.json');
    writeFileSync(input, JSON.stringify(validTemplate()));

    assert.throws(
      () => writeTemplateAtomic({ inputPath: input, layer: 'machine', machineDir: machine }),
      /write requires a recorded approval/
    );

    const prepared = prepareCandidate(input);
    writeFileSync(
      approval,
      JSON.stringify(approvalFor(prepared))
    );
    const result = writeTemplateAtomic({
      inputPath: input,
      approvalPath: approval,
      layer: 'machine',
      machineDir: machine,
    });
    const original = readFileSync(result.templatePath, 'utf8');
    assert.equal(parseTemplateMarkdown(original).id, 'github-proposal-issue');

    writeFileSync(input, JSON.stringify(validTemplate({ purpose: 'Changed after approval.' })));
    assert.throws(
      () => writeTemplateAtomic({
        inputPath: input,
        approvalPath: approval,
        layer: 'machine',
        machineDir: machine,
      }),
      /approval does not match the exact candidate/
    );
    assert.equal(readFileSync(result.templatePath, 'utf8'), original);
    assert.deepEqual(readdirSync(dirname(result.templatePath)), ['github-proposal-issue.md']);

    writeFileSync(input, JSON.stringify(validTemplate()));
    const targetPrepared = prepareCandidate(input);
    writeFileSync(
      approval,
      JSON.stringify(
        approvalFor(targetPrepared, {
          targetLayer: 'project',
          visibility: 'committed',
        })
      )
    );
    assert.throws(
      () => writeTemplateAtomic({
        inputPath: input,
        approvalPath: approval,
        layer: 'machine',
        machineDir: machine,
      }),
      /approval does not match the target layer and visibility/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project writes default to filename-scoped machine-local exclusion', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-project-'));
  try {
    const repo = join(dir, 'repo');
    const input = join(dir, 'candidate.json');
    const approval = join(dir, 'approval.json');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    writeFileSync(input, JSON.stringify(validTemplate()));
    const prepared = prepareCandidate(input);
    writeFileSync(
      approval,
      JSON.stringify(approvalFor(prepared, { targetLayer: 'project' }))
    );

    const result = writeTemplateAtomic({
      inputPath: input,
      approvalPath: approval,
      layer: 'project',
      cwd: repo,
    });
    assert.equal(result.visibility, 'machine-local');
    assert.equal(
      realpathSync.native(result.templatePath),
      realpathSync.native(
        join(repo, '.agentic', 'templates', 'publication', 'github-proposal-issue.md')
      )
    );
    const exclude = readFileSync(join(repo, '.git', 'info', 'exclude'), 'utf8');
    assert.match(exclude, /^\/\.agentic\/templates\/publication\/github-proposal-issue\.md$/m);
    assert.doesNotMatch(exclude, /^\/\.agentic\/templates\/$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project exclusion update preserves unrelated bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-exclude-'));
  try {
    const repo = join(dir, 'repo');
    const input = join(dir, 'candidate.json');
    const approval = join(dir, 'approval.json');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    const excludePath = join(repo, '.git', 'info', 'exclude');
    writeFileSync(excludePath, '# retained comment\n\n/existing-entry\n');
    writeFileSync(input, JSON.stringify(validTemplate()));
    const prepared = prepareCandidate(input);
    writeFileSync(
      approval,
      JSON.stringify(approvalFor(prepared, { targetLayer: 'project' }))
    );

    writeTemplateAtomic({
      inputPath: input,
      approvalPath: approval,
      layer: 'project',
      cwd: repo,
    });

    assert.equal(
      readFileSync(excludePath, 'utf8'),
      '# retained comment\n\n/existing-entry\n' +
        '/.agentic/templates/publication/github-proposal-issue.md\n'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('interrupted atomic replacement preserves the prior file and cleans the temporary file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-atomic-'));
  try {
    const target = join(dir, 'template.md');
    writeFileSync(target, 'prior');
    assert.throws(
      () => atomicWrite(target, 'replacement', 0o600, {
        replace() {
          throw new Error('simulated interruption');
        },
      }),
      /simulated interruption/
    );
    assert.equal(readFileSync(target, 'utf8'), 'prior');
    assert.deepEqual(readdirSync(dir), ['template.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('template-store CLI prepares the exact candidate digest', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-template-cli-'));
  try {
    const input = join(dir, 'candidate.json');
    writeFileSync(input, JSON.stringify(validTemplate()));
    const result = spawnSync('node', [SCRIPT, 'prepare', '--input', input], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const prepared = JSON.parse(result.stdout);
    assert.equal(prepared.valid, true);
    assert.equal(prepared.templateId, 'github-proposal-issue');
    assert.match(prepared.candidateSha256, /^[0-9a-f]{64}$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('template curator skill makes source, retention, and write gates explicit', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skill = readFileSync(
      join(ROOT, 'src', 'skills', agent, 'ad-template-tune', 'SKILL.md'),
      'utf8'
    );
    assert.match(skill, /never read a private source before the user approves/i);
    assert.match(skill, /never retain an exact excerpt without separate approval/i);
    assert.match(skill, /never write a\s+template before the user approves the exact candidate digest/i);
    assert.match(skill, /one template\s+delta per invocation/i);
    assert.match(skill, /defaults to `machine-local`/i);
    assert.match(skill, /exact template filename/i);
  }
});

test('template curator shared files and dogfood copies remain byte-identical', () => {
  for (const file of [
    'references/curation.md',
    'references/template-contract.md',
    'scripts/template-store.mjs',
  ]) {
    assert.ok(
      readFileSync(join(ROOT, 'src/skills/claude-code/ad-template-tune', file)).equals(
        readFileSync(join(ROOT, 'src/skills/codex/ad-template-tune', file))
      ),
      `${file} diverged across hosts`
    );
  }

  for (const [source, installed] of [
    ['src/skills/claude-code/ad-template-tune', '.claude/skills/ad-template-tune'],
    ['src/skills/codex/ad-template-tune', '.agents/skills/ad-template-tune'],
  ]) {
    const sourceFiles = filesUnder(join(ROOT, source));
    assert.deepEqual(filesUnder(join(ROOT, installed)), sourceFiles, `${installed} file set diverged`);
    for (const file of sourceFiles) {
      assert.ok(
        readFileSync(join(ROOT, source, file)).equals(readFileSync(join(ROOT, installed, file))),
        `${join(installed, file)} diverged from canonical source`
      );
    }
  }
});

test('npm package dry-run includes every canonical template curator file', () => {
  const npm = resolveSpawn('npm');
  const result = spawnSync(npm.command, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: npm.shell,
  });
  assert.equal(result.status, 0, result.stderr);
  const packed = new Set(JSON.parse(result.stdout)[0].files.map((file) => file.path));

  for (const skill of [
    'src/skills/claude-code/ad-template-tune',
    'src/skills/codex/ad-template-tune',
  ]) {
    for (const file of filesUnder(join(ROOT, skill))) {
      const packagePath = join(skill, file).replaceAll('\\', '/');
      assert.ok(packed.has(packagePath), `${packagePath} missing from npm package`);
    }
  }
});
