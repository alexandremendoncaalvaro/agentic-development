import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { updateRootDoc } from '../src/lib/rootdoc.js';

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-crlf-'));
}

function seedInstalledSkill(cwd, skill) {
  const dir = join(cwd, '.claude/skills', skill);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${skill}\ndescription: Test fixture.\nsummary: Test fixture for ${skill}.\n---\n`
  );
}

function countSectionStarts(text) {
  return (text.match(/<!-- agentic-managed-skills:start -->/g) ?? []).length;
}

// A Windows clone with `core.autocrlf=true` (git's default there) checks the
// root doc out CRLF-terminated. The managed section is still present and still
// well-formed, so a later install must update it in place.
//
// Regression: it appended a second section instead, leaving two contradictory
// skill tables in one AGENTS.md, with no error to signal it.
test('updateRootDoc: managed section stored with CRLF is updated, not duplicated', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-architecture');
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n\nUser notes here.\n');

    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });

    // simulate the CRLF checkout
    const lf = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    writeFileSync(join(dir, 'AGENTS.md'), lf.replace(/\r?\n/g, '\r\n'));
    assert.equal(countSectionStarts(readFileSync(join(dir, 'AGENTS.md'), 'utf8')), 1);

    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-architecture'],
      confirmAppend: async () => true,
      confirmReplace: async () => true,
    });

    const after = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.equal(
      countSectionStarts(after),
      1,
      'a CRLF-stored section must be recognized and replaced, never appended alongside'
    );
    assert.equal(action.type, 'updated');
    assert.match(after, /ad-architecture/);
    assert.ok(after.includes('User notes here.'), 'user content must survive');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Recognizing a CRLF section is not enough on its own: the replacement is
// emitted with LF, so the first run over a CRLF file legitimately rewrites it.
// What must not happen is that rewrite repeating forever, marking the user's
// root doc dirty on every single install.
test('updateRootDoc: a CRLF file settles after one rewrite', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap');
    const doc = join(dir, 'AGENTS.md');
    writeFileSync(doc, '# AGENTS.md\n\nUser notes here.\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });

    writeFileSync(doc, readFileSync(doc, 'utf8').replace(/\r?\n/g, '\r\n'));

    const run = () =>
      updateRootDoc({
        cwd: dir,
        skills: ['ad-bootstrap'],
        confirmAppend: async () => true,
        confirmReplace: async () => true,
      });

    assert.equal((await run()).type, 'updated', 'the CRLF section is rewritten once');
    assert.equal((await run()).type, 'unchanged', 'and then left alone');
    assert.equal(countSectionStarts(readFileSync(doc, 'utf8')), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
