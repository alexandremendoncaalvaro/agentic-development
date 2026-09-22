import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { freezeArtifact } from '../../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';
import { agentLayout } from '../../src/lib/install.js';

function fail(message) {
  throw new Error(message);
}

/**
 * Install the skills a case declares into one trial copy, at the directory the
 * host reads project skills from, and return each skill's digest. A fixture
 * cannot track a machine path to an installed skill, and a `-p` session lets a
 * personal skill of the same name shadow a project one, so the skills the
 * case needs travel inside the copy the host runs in and the receipt records
 * exactly which bytes were there (GROUND-0028 E2). The source is the
 * canonical `src/skills/<host>/` tree, the same one `skillIdentity` digests,
 * so a receipt's representative digest and its installed copy agree.
 */
export function installFixtureSkills({ trialRoot, host, skills, root, copy = cpSync }) {
  const { skillsDir } = agentLayout(host);
  const installed = {};
  for (const name of skills) {
    const source = join(root, 'src', 'skills', host, name);
    if (!existsSync(source)) fail(`live: fixture skill "${name}" is not bundled for ${host}`);
    copy(source, join(trialRoot, skillsDir, name), { recursive: true });
    installed[name] = freezeArtifact(source).sha256;
  }
  return installed;
}
