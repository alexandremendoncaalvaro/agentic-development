import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = join(__dirname, '..', '..');

function readKit(relativePath) {
  return readFileSync(join(KIT_ROOT, relativePath), 'utf8');
}

const MODE_CONTEXT = {
  greenfield:
    "Empty project. Interview me from scratch — there's no existing code yet to verify against.",
  brownfield:
    'Existing codebase, no AGENTS.md yet. After interviewing me, read the actual code to verify what I told you and flag any mismatch before writing anything.',
  audit:
    "AGENTS.md already exists. Do not rewrite it. Compare it against the current codebase and against the template structure below. List every drift, then wait — I'll decide what to change.",
};

export function renderAgentsBootstrap({ mode }) {
  const general = readKit('templates/agents-general.md').trim();
  const project = readKit('templates/agents-project.md').trim();

  const outputInstruction =
    mode === 'audit'
      ? 'Output: a list of disagreements. Format each as `[file or section]: spec says X, code says Y. Suggested resolution: [change spec / change code / discuss].`'
      : "Output: a single `AGENTS.md` at the repo root — filled `agents-project.md` content first, then `agents-general.md` content appended. Drop `agents-general.md`'s H1; `agents-project.md`'s `# AGENTS.md` owns the merged document.";

  return `# Bootstrap AGENTS.md  (mode: ${mode})

Paste this entire output into your agent. Both templates are inlined below — no \`--add-dir\` needed.

---

## Mode context

${MODE_CONTEXT[mode]}

---

## Template: agents-general.md (universal agent behavior)

${general}

---

## Template: agents-project.md (per-project structure with placeholders)

${project}

---

## Instructions

> Read both templates above.
>
> Interview me one section at a time to fill \`agents-project.md\`'s \`<placeholders>\`: stack, build/test/lint commands, repo layout (only what's not obvious), commit conventions, security boundaries, and real gotchas you can confirm by reading the code.
>
> **Do not invent values.** When I don't know something, leave \`<TODO>\` and move on.
>
> ${outputInstruction}
>
> Cut every line you can — bloat makes the agent ignore rules.
`;
}
