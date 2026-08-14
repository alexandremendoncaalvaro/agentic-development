import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSpawn } from '../scripts/hook-npm-test.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-voice',
  'scripts',
  'voice-profile.mjs'
);

function run(args, { cwd, env = {}, input } = {}) {
  return execFileSync('node', [SCRIPT, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    input,
  });
}

function runResult(args, { cwd, env = {}, input } = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    input,
  });
}

function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

test('voice profile resolve: explicit path wins over environment and default', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-resolve-'));
  try {
    const explicit = join(dir, 'chosen.md');
    const output = JSON.parse(
      run(['resolve', '--profile', explicit], {
        cwd: dir,
        env: {
          AGENTIC_VOICE_DIR: join(dir, 'environment'),
          HOME: join(dir, 'home'),
        },
      })
    );

    assert.equal(output.source, 'explicit');
    assert.equal(output.profilePath, explicit);
    assert.equal(output.exists, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: accepts the smallest confirmed derived-only profile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-valid-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "self",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "patterns": [],
  "examples": [],
  "limitations": []
}
\`\`\`
`
    );

    const output = JSON.parse(run(['validate', '--profile', profile], { cwd: dir }));
    assert.equal(output.valid, true);
    assert.equal(output.profilePath, profile);
    assert.equal(output.patterns, 0);
    assert.equal(output.examples, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: rejects unapproved patterns and retained examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-approval-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "self",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "patterns": [
    {
      "id": "team-concision",
      "layer": "accommodation",
      "instruction": "Prefer the team's concise status-update shape.",
      "scope": { "languages": ["en"], "channels": ["slack"] },
      "provenance": {
        "basis": "community-observed",
        "authorClass": "community",
        "sourceSummary": "approved team sample",
        "sourceCount": 4,
        "confidence": "medium",
        "approved": false
      }
    }
  ],
  "examples": [
    {
      "id": "example-1",
      "text": "Private exact phrase",
      "language": "en",
      "authorClass": "owner",
      "approved": false,
      "retentionApproved": false
    }
  ],
  "limitations": []
}
\`\`\`
`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.valid, false);
    assert.ok(output.errors.includes('patterns[0].provenance.approved must be true'));
    assert.ok(output.errors.includes('examples[0].approved must be true'));
    assert.ok(output.errors.includes('examples[0].retentionApproved must be true'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: separates identity from accommodation and blocks cross-language promotion', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-scope-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "self",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "patterns": [
    {
      "id": "literal-portuguese-marker",
      "layer": "identity",
      "instruction": "Insert a Portuguese discourse marker in English.",
      "scope": { "languages": ["en"] },
      "provenance": {
        "basis": "observed",
        "authorClass": "owner",
        "evidenceLanguages": ["pt-BR"],
        "sourceSummary": "approved Portuguese corpus",
        "sourceCount": 9,
        "confidence": "high",
        "approved": true
      }
    },
    {
      "id": "owner-as-team",
      "layer": "accommodation",
      "instruction": "Use concise English team updates.",
      "scope": { "languages": ["en"], "channels": ["slack"] },
      "provenance": {
        "basis": "community-observed",
        "authorClass": "owner",
        "evidenceLanguages": ["en"],
        "sourceSummary": "approved team corpus",
        "sourceCount": 12,
        "confidence": "medium",
        "approved": true
      }
    }
  ],
  "examples": [],
  "limitations": []
}
\`\`\`
`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.ok(
      output.errors.includes(
        'patterns[0] applies beyond its evidence languages without functional-equivalent provenance'
      )
    );
    assert.ok(
      output.errors.includes('patterns[1] accommodation provenance must use authorClass community')
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile write: atomically creates a validated Markdown profile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-write-'));
  try {
    const input = join(dir, 'candidate.json');
    const profile = join(dir, 'voice', 'profile.md');
    writeFileSync(
      input,
      JSON.stringify({
        schemaVersion: 1,
        owner: 'self',
        status: 'confirmed',
        retention: 'derived-only',
        rawSamplesRetained: false,
        patterns: [],
        examples: [],
        limitations: [],
      })
    );

    const output = JSON.parse(
      run(['write', '--profile', profile, '--input', input], { cwd: dir })
    );
    assert.equal(output.written, true);
    assert.equal(output.profilePath, profile);
    assert.match(readFileSync(profile, 'utf8'), /^# Personal voice profile$/m);
    assert.deepEqual(readdirSync(join(dir, 'voice')), ['profile.md']);
    if (process.platform !== 'win32') {
      assert.equal(statSync(profile).mode & 0o777, 0o600);
    }

    const validated = JSON.parse(run(['validate', '--profile', profile], { cwd: dir }));
    assert.equal(validated.valid, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: rejects unknown layers and third-party exact examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-shape-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "self",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "patterns": [
    {
      "id": "unknown-layer",
      "layer": "personality",
      "instruction": "Infer a personality type.",
      "scope": { "languages": ["pt-BR"] },
      "provenance": {
        "basis": "observed",
        "authorClass": "community",
        "evidenceLanguages": ["pt-BR"],
        "sourceSummary": "mixed corpus",
        "sourceCount": 1,
        "confidence": "high",
        "approved": true
      }
    },
    {
      "id": "community-as-identity",
      "layer": "identity",
      "instruction": "Treat a team convention as personal identity.",
      "scope": { "languages": ["en"] },
      "provenance": {
        "basis": "community-observed",
        "authorClass": "community",
        "evidenceLanguages": ["en"],
        "sourceSummary": "approved team corpus",
        "sourceCount": 3,
        "confidence": "medium",
        "approved": true
      }
    }
  ],
  "examples": [
    {
      "id": "teammate-example",
      "text": "A teammate's exact phrase",
      "language": "en",
      "authorClass": "community",
      "approved": true,
      "retentionApproved": true
    }
  ],
  "limitations": []
}
\`\`\`
`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.ok(output.errors.includes('patterns[0].layer is unsupported'));
    assert.ok(output.errors.includes('patterns[1] identity provenance must use authorClass owner'));
    assert.ok(output.errors.includes('examples[0].authorClass must be owner'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: rejects patterns without complete inspectable provenance', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-malformed-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "self",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "patterns": [
    {
      "id": "",
      "layer": "identity",
      "instruction": "",
      "scope": { "languages": [] },
      "provenance": {
        "basis": "guess",
        "authorClass": "owner",
        "evidenceLanguages": [],
        "sourceSummary": "",
        "sourceCount": 0,
        "confidence": "certain",
        "approved": true
      }
    }
  ],
  "examples": [],
  "limitations": [42]
}
\`\`\`
`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    for (const expected of [
      'patterns[0].id must be a non-empty string',
      'patterns[0].instruction must be a non-empty string',
      'patterns[0].scope.languages must be a non-empty array',
      'patterns[0].provenance.basis is unsupported',
      'patterns[0].provenance.evidenceLanguages must be a non-empty array',
      'patterns[0].provenance.sourceSummary must be a non-empty string',
      'patterns[0].provenance.sourceCount must be a positive integer',
      'patterns[0].provenance.confidence is unsupported',
      'limitations[0] must be a string',
    ]) {
      assert.ok(output.errors.includes(expected), `missing error: ${expected}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile resolve: environment directory wins over the home fallback', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-fallback-'));
  try {
    const environment = join(dir, 'environment');
    const home = join(dir, 'home');
    const fromEnvironment = JSON.parse(
      run(['resolve'], {
        cwd: dir,
        env: { AGENTIC_VOICE_DIR: environment, HOME: home, USERPROFILE: home },
      })
    );
    assert.equal(fromEnvironment.source, 'environment');
    assert.equal(fromEnvironment.profilePath, join(environment, 'profile.md'));

    const fromHome = JSON.parse(
      run(['resolve'], {
        cwd: dir,
        env: { AGENTIC_VOICE_DIR: '', HOME: home, USERPROFILE: home },
      })
    );
    assert.equal(fromHome.source, 'default');
    assert.equal(fromHome.profilePath, join(home, '.agentic', 'voice', 'profile.md'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile write: invalid input leaves an existing profile unchanged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-preserve-'));
  try {
    const profileDir = join(dir, 'voice');
    const profile = join(profileDir, 'profile.md');
    const input = join(dir, 'invalid.json');
    mkdirSync(profileDir);
    writeFileSync(input, JSON.stringify({ schemaVersion: 99 }));
    writeFileSync(profile, 'existing profile');

    const result = runResult(['write', '--profile', profile, '--input', input], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /profile validation failed/);
    assert.equal(readFileSync(profile, 'utf8'), 'existing profile');
    assert.deepEqual(readdirSync(profileDir), ['profile.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile scripts remain byte-identical across skills and hosts', () => {
  const paths = [
    join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice', 'scripts', 'voice-profile.mjs'),
    join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice', 'scripts', 'voice-profile.mjs'),
    join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice-tune', 'scripts', 'voice-profile.mjs'),
    join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice-tune', 'scripts', 'voice-profile.mjs'),
  ];
  const expected = readFileSync(paths[0]);
  for (const path of paths.slice(1)) {
    assert.ok(expected.equals(readFileSync(path)), `${path} diverged from the shared script`);
  }
});

test('voice profile references remain byte-identical across hosts and consumers', () => {
  const sharedGroups = [
    [
      join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice', 'references', 'profile-contract.md'),
      join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice', 'references', 'profile-contract.md'),
      join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice-tune', 'references', 'profile-contract.md'),
      join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice-tune', 'references', 'profile-contract.md'),
    ],
    [
      join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice', 'references', 'application.md'),
      join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice', 'references', 'application.md'),
    ],
    [
      join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice', 'references', 'human-writing-baseline.md'),
      join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice', 'references', 'human-writing-baseline.md'),
    ],
    [
      join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-voice-tune', 'references', 'calibration.md'),
      join(__dirname, '..', 'src', 'skills', 'codex', 'ad-voice-tune', 'references', 'calibration.md'),
    ],
  ];

  for (const paths of sharedGroups) {
    const expected = readFileSync(paths[0]);
    for (const path of paths.slice(1)) {
      assert.ok(expected.equals(readFileSync(path)), `${path} diverged from ${paths[0]}`);
    }
  }
});

test('voice profile validate: rejects incomplete examples, duplicate ids, and malformed scopes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-structural-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile

## Profile data

\`\`\`json
{
  "schemaVersion": 1,
  "owner": "someone-else",
  "status": "confirmed",
  "retention": "derived-only",
  "rawSamplesRetained": false,
  "rawSamples": ["synthetic forbidden field"],
  "patterns": [
    {
      "id": "duplicate",
      "layer": "identity",
      "instruction": "Keep the reasoning visible.",
      "rawEvidence": "synthetic forbidden field",
      "scope": { "languages": ["pt-BR"], "channels": [] },
      "provenance": {
        "basis": "observed",
        "authorClass": "owner",
        "evidenceLanguages": ["pt-BR"],
        "sourceSummary": "approved owner corpus",
        "sourceCount": 2,
        "confidence": "medium",
        "approved": true,
        "messageExcerpt": "synthetic forbidden field"
      }
    },
    {
      "id": "duplicate",
      "layer": "context",
      "instruction": "Keep updates brief.",
      "scope": { "languages": [42], "topics": [null], "chanel": ["slack"] },
      "provenance": {
        "basis": "explicit-preference",
        "authorClass": "owner",
        "evidenceLanguages": ["pt-BR"],
        "sourceSummary": "approved preference",
        "sourceCount": 1,
        "confidence": "high",
        "approved": true
      }
    }
  ],
  "examples": [
    {
      "id": "",
      "text": "",
      "language": "",
      "authorClass": "owner",
      "approved": true,
      "retentionApproved": true,
      "sourceMessage": "synthetic forbidden field"
    }
  ],
  "limitations": []
}
\`\`\`
`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    for (const expected of [
      'owner must be self',
      'profile.rawSamples is unsupported',
      'patterns[0].rawEvidence is unsupported',
      'patterns[0].provenance.messageExcerpt is unsupported',
      'patterns[0].scope.channels must be a non-empty array when present',
      'patterns[1].id must be unique',
      'patterns[1].scope.languages must contain only non-empty strings',
      'patterns[1].scope.topics must contain only non-empty strings',
      'patterns[1].scope.chanel is unsupported',
      'examples[0].id must be a non-empty string',
      'examples[0].text must be a non-empty string',
      'examples[0].language must be a non-empty string',
      'examples[0].sourceMessage is unsupported',
    ]) {
      assert.ok(output.errors.includes(expected), `missing error: ${expected}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: requires one canonical data block and accepts CRLF', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-markdown-'));
  try {
    const profile = join(dir, 'profile.md');
    const data = JSON.stringify({
      schemaVersion: 1,
      owner: 'self',
      status: 'confirmed',
      retention: 'derived-only',
      rawSamplesRetained: false,
      patterns: [],
      examples: [],
      limitations: [],
    }, null, 2);

    writeFileSync(
      profile,
      `# Personal voice profile\r\n\r\n## Profile data\r\n\r\n\`\`\`json\r\n${data.replaceAll('\n', '\r\n')}\r\n\`\`\`\r\n`
    );
    assert.equal(
      JSON.parse(run(['validate', '--profile', profile], { cwd: dir })).valid,
      true
    );

    writeFileSync(profile, `# Wrong title\n\n## Profile data\n\n\`\`\`json\n${data}\n\`\`\`\n`);
    let result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /canonical title and Profile data section/);

    writeFileSync(
      profile,
      `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${data}\n\`\`\`\n\n\`\`\`json\n${data}\n\`\`\`\n`
    );
    result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /exactly one fenced json data block/);

    writeFileSync(
      profile,
      `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${data}\n\`\`\`\n\nPrivate note outside the schema\n`
    );
    result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /canonical title and Profile data section/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: rejects incompatible layer provenance', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-provenance-'));
  try {
    const profile = join(dir, 'profile.md');
    const base = {
      instruction: 'Keep the target-language convention.',
      scope: { languages: ['en'] },
      provenance: {
        authorClass: 'community',
        evidenceLanguages: ['pt-BR'],
        sourceSummary: 'approved community corpus',
        sourceCount: 3,
        confidence: 'medium',
        approved: true,
      },
    };
    writeFileSync(
      profile,
      `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${JSON.stringify({
        schemaVersion: 1,
        owner: 'self',
        status: 'confirmed',
        retention: 'derived-only',
        rawSamplesRetained: false,
        patterns: [
          {
            ...base,
            id: 'translated-accommodation',
            layer: 'accommodation',
            provenance: { ...base.provenance, basis: 'functional-equivalent' },
          },
          {
            ...base,
            id: 'community-identity',
            layer: 'identity',
            provenance: {
              ...base.provenance,
              basis: 'community-observed',
              authorClass: 'owner',
              evidenceLanguages: ['en'],
            },
          },
          {
            ...base,
            id: 'community-context',
            layer: 'context',
            scope: { languages: ['en'] },
            provenance: {
              ...base.provenance,
              basis: 'observed',
              evidenceLanguages: ['en'],
            },
          },
        ],
        examples: [],
        limitations: [],
      }, null, 2)}\n\`\`\`\n`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.ok(
      output.errors.includes(
        'patterns[0] accommodation provenance must use basis community-observed'
      )
    );
    assert.ok(
      output.errors.includes(
        'patterns[0] accommodation evidence must cover every target language'
      )
    );
    assert.ok(
      output.errors.includes(
        'patterns[1] identity provenance cannot use basis community-observed'
      )
    );
    assert.ok(
      output.errors.includes('patterns[2] context provenance must use authorClass owner')
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate and write reject profile paths inside a Git repository', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-repository-'));
  const outside = mkdtempSync(join(tmpdir(), 'agentic-voice-outside-'));
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: dir });
    const profile = join(dir, 'private', 'profile.md');
    const input = join(dir, 'candidate.json');
    const candidate = {
      schemaVersion: 1,
      owner: 'self',
      status: 'confirmed',
      retention: 'derived-only',
      rawSamplesRetained: false,
      patterns: [],
      examples: [],
      limitations: [],
    };
    mkdirSync(dirname(profile), { recursive: true });
    writeFileSync(profile, `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${JSON.stringify(candidate)}\n\`\`\`\n`);
    writeFileSync(input, JSON.stringify(candidate));

    for (const command of [
      ['validate', '--profile', profile],
      ['write', '--profile', profile, '--input', input],
    ]) {
      const result = runResult(command, { cwd: dir });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /profile path must be outside a Git repository/);
    }

    const candidateResult = runResult(
      ['write', '--profile', join(outside, 'profile.md'), '--input', input],
      { cwd: dir }
    );
    assert.equal(candidateResult.status, 1);
    assert.match(candidateResult.stderr, /candidate path must be outside a Git repository/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('voice profile parse failures never echo private content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-redaction-'));
  try {
    const secret = 'private-owner-phrase-do-not-log';
    const profile = join(dir, 'profile.md');
    const input = join(dir, 'candidate.json');
    writeFileSync(
      profile,
      `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n{"${secret}": }\n\`\`\`\n`
    );
    writeFileSync(input, `{"${secret}": }`);

    for (const command of [
      ['validate', '--profile', profile],
      ['write', '--profile', profile, '--input', input],
    ]) {
      const result = runResult(command, { cwd: dir });
      assert.equal(result.status, 1);
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('voice profile validate: exact retained examples stay short', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-voice-example-limit-'));
  try {
    const profile = join(dir, 'profile.md');
    writeFileSync(
      profile,
      `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${JSON.stringify({
        schemaVersion: 1,
        owner: 'self',
        status: 'confirmed',
        retention: 'derived-only',
        rawSamplesRetained: false,
        patterns: [],
        examples: [{
          id: 'too-long',
          text: 'x'.repeat(281),
          language: 'pt-BR',
          authorClass: 'owner',
          approved: true,
          retentionApproved: true,
        }],
        limitations: [],
      }, null, 2)}\n\`\`\`\n`
    );

    const result = runResult(['validate', '--profile', profile], { cwd: dir });
    assert.equal(result.status, 1);
    assert.ok(
      JSON.parse(result.stdout).errors.includes(
        'examples[0].text must be at most 280 characters'
      )
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('personal voice dogfood copies match every canonical source file', () => {
  const root = join(__dirname, '..');
  for (const [source, installed] of [
    ['src/skills/claude-code/ad-voice', '.claude/skills/ad-voice'],
    ['src/skills/claude-code/ad-voice-tune', '.claude/skills/ad-voice-tune'],
    ['src/skills/codex/ad-voice', '.agents/skills/ad-voice'],
    ['src/skills/codex/ad-voice-tune', '.agents/skills/ad-voice-tune'],
  ]) {
    const sourceRoot = join(root, source);
    const installedRoot = join(root, installed);
    const files = filesUnder(sourceRoot);
    assert.deepEqual(filesUnder(installedRoot), files, `${installed} file set diverged`);
    for (const file of files) {
      assert.ok(
        readFileSync(join(sourceRoot, file)).equals(readFileSync(join(installedRoot, file))),
        `${join(installed, file)} diverged from canonical source`
      );
    }
  }
});

test('npm package dry-run includes every canonical personal voice skill file', () => {
  const root = join(__dirname, '..');
  const npm = resolveSpawn('npm');
  const result = spawnSync(npm.command, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
    shell: npm.shell,
  });
  assert.equal(result.status, 0, result.stderr);
  const packed = new Set(JSON.parse(result.stdout)[0].files.map((file) => file.path));

  for (const skill of [
    'src/skills/claude-code/ad-voice',
    'src/skills/claude-code/ad-voice-tune',
    'src/skills/codex/ad-voice',
    'src/skills/codex/ad-voice-tune',
  ]) {
    for (const file of filesUnder(join(root, skill))) {
      const packagePath = join(skill, file).replaceAll('\\', '/');
      assert.ok(packed.has(packagePath), `${packagePath} missing from npm package`);
    }
  }
});
