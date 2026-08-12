import { readFile } from 'node:fs/promises';

const DOCUMENTS = {
  contributing: ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md'],
  security: ['SECURITY.md', '.github/SECURITY.md', 'docs/SECURITY.md'],
};

async function inspect(path, unreadable) {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    unreadable.push({ path, code: error.code ?? 'UNKNOWN' });
    return true;
  }
}

const unreadable = [];
const documents = {};

for (const [kind, paths] of Object.entries(DOCUMENTS)) {
  documents[kind] = [];
  for (const path of paths) {
    if (await inspect(path, unreadable)) documents[kind].push(path);
  }
}

process.stdout.write(`${JSON.stringify({ documents, unreadable })}\n`);
