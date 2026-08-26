import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTemplateMarkdown,
  resolveTemplateCatalog,
  validateTemplate,
} from '../src/skills/claude-code/ad-template-tune/scripts/template-store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function skillRoot(prefix, agent) {
  return join(ROOT, prefix, agent, 'ad-report');
}

function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

test('report baseline is a valid official-method analytical template', () => {
  for (const agent of ['claude-code', 'codex']) {
    const root = skillRoot('src/skills', agent);
    const templatePath = join(
      root,
      'references',
      'templates',
      'report',
      'standalone-analytical-report.md'
    );
    const template = parseTemplateMarkdown(readFileSync(templatePath, 'utf8'));
    assert.deepEqual(validateTemplate(template), []);
    assert.equal(template.id, 'standalone-analytical-report');
    assert.equal(template.artifactClass, 'report');
    assert.equal(template.artifactType, 'standalone-analytical-report');
    assert.deepEqual(
      template.provenance.authorGroups.map(({ authorClass }) => authorClass),
      ['official']
    );
    assert.deepEqual(
      template.provenance.authorGroups[0].sources.map(({ locator }) => locator),
      [
        'https://assets.publishing.service.gov.uk/media/6718be89d94d2c219a5405d8/Research_reports_guidance.pdf',
      ]
    );
    assert.equal(template.retainedExcerpts.length, 0);
    assert.deepEqual(
      new Set(template.requiredInformation),
      new Set([
        'Self-contained executive conclusion',
        'Question or objective',
        'Method and evidence provenance',
        'Material findings',
        'Conclusions',
        'Recommendations or next actions',
        'Limitations',
      ])
    );
    assert.ok(
      template.limitations.some((item) => /no private owner or team report corpus/i.test(item))
    );
  }
});

test('report workflow owns editorial judgment and composes renderers with their gates', () => {
  for (const agent of ['claude-code', 'codex']) {
    const root = skillRoot('src/skills', agent);
    const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
    assert.match(skill, /findings.*evidence.*audience/is);
    assert.match(skill, /executive conclusion.*question.*method.*provenance.*findings.*recommendations.*limitations/is);
    assert.match(skill, /DOCX.*PDF.*presentation.*visualization.*site/is);
    assert.match(skill, /render.*visual.*accessibility/is);
    assert.match(skill, /satisfied.*improved.*not applicable.*higher-priority\s+override/is);
    assert.match(skill, /outside the usable report/i);
    assert.match(skill, /agreed local.*exact destination.*explicit\s+approval/is);
    assert.match(skill, /ad-voice/i);
    assert.match(skill, /ad-ground/i);
    assert.match(skill, /ad-research/i);
    assert.match(skill, /ad-template-tune/i);
    assert.match(skill, /never implement.*renderer/is);
    assert.match(skill, /pasted text.*artifact attached.*supplied\s+public URL/is);
    assert.doesNotMatch(skill, /user-supplied material/i);
    assert.match(skill, /every final editorial report.*ad-voice/is);
    assert.match(
      skill,
      /verify privately[\s\S]*after any textual revision[\s\S]*repeat[\s\S]*ad-voice[\s\S]*before return/i
    );
    assert.match(skill, /any later[\s\S]*text change invalidates both the voice pass/i);
    assert.match(
      skill,
      /do not[\s\S]*return an artifact whose text changed after the most recent `ad-voice` output/i
    );
    const verificationStep = skill.match(/## Step 5: Verify privately([\s\S]*?)## Step 6:/i)?.[1];
    assert.ok(verificationStep);
    assert.match(
      verificationStep.trim(),
      /Do not return an artifact whose text changed after the most recent `ad-voice` output\.$/i
    );

    const composition = readFileSync(join(root, 'references', 'composition.md'), 'utf8');
    assert.match(composition, /public\s+contract/i);
    assert.match(composition, /stricter gate wins/i);
    assert.match(composition, /mandatory naturalization pass/i);
    const evaluation = readFileSync(join(root, 'references', 'evaluation.md'), 'utf8');
    assert.match(evaluation, /invariant ledger/i);
    assert.match(evaluation, /same or better/i);
    const sourcePolicy = readFileSync(join(root, 'references', 'source-policy.md'), 'utf8');
    assert.match(sourcePolicy, /no private owner or team report corpus/i);
    assert.match(sourcePolicy, /merely naming a\s+private service.*does not\s+authorize a read/is);
    assert.match(sourcePolicy, /does not fabricate/i);
  }
});

test('report resolver consumes the bundled baseline through the shared contract', () => {
  const root = skillRoot('src/skills', 'claude-code');
  const result = resolveTemplateCatalog({
    cwd: ROOT,
    bundledDir: join(root, 'references', 'templates'),
    machineDir: join(ROOT, '.agentic-no-report-machine-store'),
  });
  const selected = result.templates.find(({ id }) => id === 'standalone-analytical-report');
  assert.equal(selected.selectedLayer, 'bundled');
  assert.equal(selected.artifactType, 'standalone-analytical-report');
});

test('report held-out fixtures carry facts, formats, and verification expectations', () => {
  const fixtures = JSON.parse(
    readFileSync(join(ROOT, 'test', 'fixtures', 'report-held-out.json'), 'utf8')
  );
  assert.equal(fixtures.length, 3);
  assert.equal(new Set(fixtures.map(({ id }) => id)).size, 3);
  assert.deepEqual(
    new Set(fixtures.map(({ requestedFormat }) => requestedFormat)),
    new Set(['pdf', 'docx', 'presentation'])
  );
  for (const fixture of fixtures) {
    assert.ok(fixture.invariants.length >= 6);
    assert.deepEqual(fixture.verification, ['visual', 'accessibility']);
    for (const invariant of fixture.invariants) {
      assert.match(fixture.brief, new RegExp(invariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
});

test('report shared files, host copies, and dogfood copies remain byte-identical', () => {
  const claude = skillRoot('src/skills', 'claude-code');
  const codex = skillRoot('src/skills', 'codex');
  for (const file of [
    'references/composition.md',
    'references/evaluation.md',
    'references/source-policy.md',
    'references/template-contract.md',
    'references/templates/report/standalone-analytical-report.md',
    'scripts/template-store.mjs',
  ]) {
    assert.ok(
      readFileSync(join(claude, file)).equals(readFileSync(join(codex, file))),
      `${file} diverged across hosts`
    );
  }
  assert.ok(
    readFileSync(join(claude, 'scripts/template-store.mjs')).equals(
      readFileSync(
        join(ROOT, 'src/skills/claude-code/ad-template-tune/scripts/template-store.mjs')
      )
    ),
    'report resolver diverged from the curator'
  );
  assert.ok(
    readFileSync(join(claude, 'references/template-contract.md')).equals(
      readFileSync(
        join(ROOT, 'src/skills/claude-code/ad-template-tune/references/template-contract.md')
      )
    ),
    'report contract diverged from the curator'
  );

  for (const [source, installed] of [
    [claude, join(ROOT, '.claude/skills/ad-report')],
    [codex, join(ROOT, '.agents/skills/ad-report')],
  ]) {
    assert.deepEqual(filesUnder(installed), filesUnder(source));
    for (const file of filesUnder(source)) {
      assert.ok(readFileSync(join(source, file)).equals(readFileSync(join(installed, file))));
    }
  }
});
