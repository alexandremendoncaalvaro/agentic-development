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
  return join(ROOT, prefix, agent, 'ad-publish');
}

function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

test('publication baseline is a valid approved proposal template grounded in owner exemplars', () => {
  for (const agent of ['claude-code', 'codex']) {
    const root = skillRoot('src/skills', agent);
    const templatePath = join(
      root,
      'references',
      'templates',
      'publication',
      'github-proposal-issue.md'
    );
    const template = parseTemplateMarkdown(readFileSync(templatePath, 'utf8'));
    assert.deepEqual(validateTemplate(template), []);
    assert.equal(template.id, 'github-proposal-issue');
    assert.equal(template.artifactClass, 'publication');
    assert.equal(template.artifactType, 'github-proposal-issue');
    assert.deepEqual(
      template.provenance.authorGroups.map(({ authorClass }) => authorClass),
      ['owner']
    );
    const locators = template.provenance.authorGroups[0].sources.map(({ locator }) => locator);
    assert.deepEqual(locators, [
      'https://github.com/nikopueringer/CorridorKey/issues/244',
      'https://github.com/nikopueringer/CorridorKey/issues/245',
      'https://github.com/nikopueringer/CorridorKey/issues/246',
    ]);
    assert.equal(template.retainedExcerpts.length, 0);
    assert.deepEqual(
      new Set(template.requiredInformation),
      new Set([
        'Concrete conclusion or current state',
        'Consequence for the reader or project',
        'Evidence and hard constraints',
        'Observable completion',
        'Recommended next path',
        'Risks or trade-offs when material',
        'Explicit exclusions when material',
      ])
    );
  }
});

test('publication workflow keeps drafting, composition, curation, and outward gates explicit', () => {
  for (const agent of ['claude-code', 'codex']) {
    const root = skillRoot('src/skills', agent);
    const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
    assert.match(skill, /brief or an existing draft/i);
    assert.match(skill, /destination.*audience.*purpose.*language.*requested action.*hard constraints/is);
    assert.match(skill, /satisfied.*improved.*not applicable.*higher-priority\s+override/is);
    assert.match(skill, /one usable publication/i);
    assert.match(skill, /final title and body/i);
    assert.match(skill, /outside the usable draft/i);
    assert.match(skill, /final title and body.*exact\s+destination.*selected\s+template.*limitations.*action/is);
    assert.match(skill, /explicit\s+approval/i);
    assert.match(skill, /read-only identity.*repository-target check/is);
    assert.match(skill, /never log in, log out, or switch accounts/i);
    assert.match(skill, /ad-voice/i);
    assert.match(skill, /ad-ground/i);
    assert.match(skill, /ad-research/i);
    assert.match(skill, /ad-pr/i);
    assert.match(skill, /ad-template-tune/i);
    assert.match(skill, /never mutate/i);
    assert.match(skill, /every final title and body.*ad-voice/is);
    assert.match(
      skill,
      /verify privately[\s\S]*after any textual revision[\s\S]*repeat[\s\S]*ad-voice[\s\S]*before return/i
    );
    assert.match(skill, /any later change[\s\S]*invalidates that voice pass/i);
    assert.match(
      skill,
      /do not[\s\S]*return text that changed after the most recent `ad-voice` output/i
    );
    const verificationStep = skill.match(/## Step 5: Verify privately([\s\S]*?)## Step 6:/i)?.[1];
    assert.ok(verificationStep);
    assert.match(
      verificationStep.trim(),
      /Do not return text that changed after the most recent `ad-voice` output\.$/i
    );

    const composition = readFileSync(join(root, 'references', 'composition.md'), 'utf8');
    assert.match(composition, /public contract/i);
    assert.match(composition, /does not imply/i);
    assert.match(composition, /mandatory naturalization pass/i);
    const evaluation = readFileSync(join(root, 'references', 'evaluation.md'), 'utf8');
    assert.match(evaluation, /invariant ledger/i);
    assert.match(evaluation, /same or better/i);
    const sourcePolicy = readFileSync(join(root, 'references', 'source-policy.md'), 'utf8');
    assert.match(sourcePolicy, /exact service or\s+path.*author.*date\s+range/is);
    assert.match(sourcePolicy, /does not fabricate/i);
  }
});

test('publication resolver consumes the bundled baseline through the shared contract', () => {
  const root = skillRoot('src/skills', 'claude-code');
  const result = resolveTemplateCatalog({
    cwd: ROOT,
    bundledDir: join(root, 'references', 'templates'),
    machineDir: join(ROOT, '.agentic-no-publication-machine-store'),
  });
  const selected = result.templates.find(({ id }) => id === 'github-proposal-issue');
  assert.equal(selected.selectedLayer, 'bundled');
  assert.equal(selected.artifactType, 'github-proposal-issue');
});

test('publication held-out fixtures carry facts and structural expectations', () => {
  const fixtures = JSON.parse(
    readFileSync(join(ROOT, 'test', 'fixtures', 'publication-held-out.json'), 'utf8')
  );
  assert.equal(fixtures.length, 3);
  assert.equal(new Set(fixtures.map(({ id }) => id)).size, 3);
  for (const fixture of fixtures) {
    assert.ok(fixture.invariants.length >= 5);
    assert.ok(fixture.requiredElements.includes('concrete-state'));
    assert.ok(fixture.requiredElements.includes('observable-completion'));
    for (const invariant of fixture.invariants) {
      assert.match(fixture.brief, new RegExp(invariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
});

test('publication shared files, host copies, and dogfood copies remain byte-identical', () => {
  const claude = skillRoot('src/skills', 'claude-code');
  const codex = skillRoot('src/skills', 'codex');
  for (const file of [
    'references/composition.md',
    'references/evaluation.md',
    'references/source-policy.md',
    'references/template-contract.md',
    'references/templates/publication/github-proposal-issue.md',
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
    'publication resolver diverged from the curator'
  );
  assert.ok(
    readFileSync(join(claude, 'references/template-contract.md')).equals(
      readFileSync(
        join(ROOT, 'src/skills/claude-code/ad-template-tune/references/template-contract.md')
      )
    ),
    'publication contract diverged from the curator'
  );

  for (const [source, installed] of [
    [claude, join(ROOT, '.claude/skills/ad-publish')],
    [codex, join(ROOT, '.agents/skills/ad-publish')],
  ]) {
    assert.deepEqual(filesUnder(installed), filesUnder(source));
    for (const file of filesUnder(source)) {
      assert.ok(readFileSync(join(source, file)).equals(readFileSync(join(installed, file))));
    }
  }
});
