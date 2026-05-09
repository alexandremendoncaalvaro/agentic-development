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
    'Empty project. No code to scan yet — fill placeholders from what I tell you, mark unknowns `<TODO>` and move on.',
  brownfield:
    'Existing code, no `AGENTS.md`. Pre-fill from repo signals; ask only what is genuinely missing or conflicting.',
  audit:
    '`AGENTS.md` already exists. Do not rewrite it. Compare it against the current codebase and against the template structure below. List every drift; wait for my call before changing anything.',
};

const INSTRUCTIONS_BY_MODE = {
  greenfield: `> Your job: produce \`AGENTS.md\` at the repo root from the template above, ≤150 lines, every line operational. Generic agent behavior does **not** belong here — that lives in the \`agentic-philosophy\` skill.
>
> The repo is empty, so there's nothing to scan. Walk the template's \`<placeholders>\` with me one at a time. Ask one question per placeholder. **Do not invent values.** When I don't know something, leave \`<TODO>\` and move on — do not write meta-prose explaining the gap.
>
> Skip philosophical questions ("is this doc primarily for agents or humans?", "what's the most important quality bar?") — those are decisions, not interview material.
>
> **On my confirmation, write the file.** Cut every line that does not change agent behavior. No "External Resources" section. No appended Universal Agent Behavior block.`,

  brownfield: `> Your job: produce \`AGENTS.md\` at the repo root from the template above, ≤150 lines, every line operational. Generic agent behavior does **not** belong here — that lives in the \`agentic-philosophy\` skill.
>
> **Step 1 — Scan.** Read \`package.json\` / \`pyproject.toml\` / \`Cargo.toml\` / \`go.mod\` / equivalent, \`README.md\`, top-level directories, \`doc/\` and \`doc/adr/\` if present, \`.claude/\` if present, lockfiles, hook configs (\`.husky/\`, \`.pre-commit-config.yaml\`, \`.github/workflows/\`), \`git remote -v\`. Build a model of stack, entry points, build/test commands, conventions, quality gates, security boundaries, gotchas confirmed by code.
>
> **Step 2 — Pre-fill.** For every \`<placeholder>\` in the template, fill it from observed signals. No fabrication. If a section has no signal, mark \`<TODO: not yet wired>\` in one line and move on — do not write meta-prose explaining the gap.
>
> **Step 3 — Show me only the gaps.** Print:
> - (a) placeholders you could not fill from repo signals;
> - (b) signals that conflict (e.g. two test commands, two style configs).
>
> One question per gap. Skip everything you filled confidently. Do **not** ask philosophical questions — those are decisions, not interview material.
>
> **Step 4 — On my confirmation, write the file.** Cut every line that does not change agent behavior. No "External Resources" section. No appended Universal Agent Behavior block.
>
> If something I say contradicts what the code shows, surface the conflict. Don't silently trust me; don't silently trust the code. Flag and wait.`,

  audit: `> Your job: list drift between the existing \`AGENTS.md\`, the current codebase, and the template structure above. **Do not rewrite \`AGENTS.md\`.** Do not write any file. Stop after the drift list — I'll decide what to change.
>
> **Step 1 — Read.** Read the existing \`AGENTS.md\`. Read the codebase signals listed in brownfield mode (manifests, READMEs, hook configs, top-level dirs, ADRs).
>
> **Step 2 — Compare.** For every section in \`AGENTS.md\`:
> - flag claims that conflict with what the code shows;
> - flag operational facts the code reveals that \`AGENTS.md\` omits;
> - flag bloat: any line that does not change agent behavior, any "External Resources" section, any appended Universal Agent Behavior block (it belongs in the \`agentic-philosophy\` skill, not here).
>
> Hold the file to ≤150 lines, every line operational.`,
};

const OUTPUT_INSTRUCTION_BY_MODE = {
  greenfield:
    'Output: a single `AGENTS.md` at the repo root, ≤150 lines, every line operational. No appended Universal Agent Behavior block — that lives in the `agentic-philosophy` skill. No "External Resources" section. No meta-prose explaining gaps.',
  brownfield:
    'Output: a single `AGENTS.md` at the repo root, ≤150 lines, every line operational. No appended Universal Agent Behavior block — that lives in the `agentic-philosophy` skill. No "External Resources" section. No meta-prose explaining gaps.',
  audit:
    'Output: a list of disagreements. Format each as `[file or section]: spec says X, code says Y. Suggested resolution: [change spec / change code / discuss].` Do not write any file.',
};

export function renderAgentsBootstrap({ mode }) {
  const project = readKit('templates/agents-project.md').trim();

  return `# Bootstrap AGENTS.md  (mode: ${mode})

Paste this entire output into your agent. Template inlined below — no \`--add-dir\` needed.

---

## Mode context

${MODE_CONTEXT[mode]}

---

## Template: agents-project.md

${project}

---

## Instructions

${INSTRUCTIONS_BY_MODE[mode]}
>
> ${OUTPUT_INSTRUCTION_BY_MODE[mode]}
`;
}
