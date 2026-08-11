// Explicit retirements are the narrow exception to the default "keep orphan
// skills" rule. A known fingerprint lets a legacy install with no state file
// be migrated safely; state-aware installs additionally prove that the target
// still matches the kit file they originally received.
const STATE_ONLY_PREFIX_MIGRATIONS = [
  ['agentic-adr', 'ad-adr'],
  ['agentic-architecture', 'ad-architecture'],
  ['agentic-audit', 'ad-audit'],
  ['agentic-bootstrap', 'ad-bootstrap'],
  ['agentic-commit', 'ad-commit'],
  ['agentic-deepen', 'ad-deepen'],
  ['agentic-design', 'ad-design'],
  ['agentic-diagnose', 'ad-diagnose'],
  ['agentic-domain', 'ad-domain'],
  ['agentic-grill', 'ad-grill-me'],
  ['agentic-ground', 'ad-ground'],
  ['agentic-hooks', 'ad-hooks'],
  ['agentic-merge', 'ad-merge'],
  ['agentic-next', 'ad-next'],
  ['agentic-philosophy', 'ad-philosophy'],
  ['agentic-pr', 'ad-pr'],
  ['agentic-review', 'ad-review'],
  ['agentic-skill', 'ad-skill'],
  ['agentic-spec', 'ad-spec'],
  ['agentic-spike', 'ad-spike'],
  ['agentic-subagent', 'ad-subagent'],
  ['agentic-task', 'ad-task'],
  ['agentic-tdg', 'ad-tdg'],
].map(([from, to]) => ({ from, to, files: [] }));

const RETIRED_SKILL_MIGRATIONS = {
  'claude-code': [
    {
      from: 'ad-grill',
      to: 'ad-grill-me',
      files: [
        {
          path: '.claude/skills/ad-grill/SKILL.md',
          knownShas: [
            '0df4dcd35113f75ff82e76ea2dc63f341256977ef12a09e51b756bf09b1f3e2e',
          ],
        },
      ],
    },
    {
      from: 'ad-clean',
      to: 'ad-archive',
      files: [
        {
          path: '.claude/skills/ad-clean/SKILL.md',
          knownShas: [
            'bb315007e059943dd230b8b5c264d7efad0abe88aad2ec1b01ddc915976bc642',
          ],
        },
      ],
    },
  ],
  codex: [
    {
      from: 'ad-grill',
      to: 'ad-grill-me',
      files: [
        {
          path: '.agents/skills/ad-grill/SKILL.md',
          knownShas: [
            '7bb9a87fae699f1e7f5e468f5419027560f84587a7bfefea8df7822438b8ca79',
          ],
        },
        {
          path: '.agents/skills/ad-grill/agents/openai.yaml',
          knownShas: [
            'cff51605a057a12be162116d2b8a7c885e72e407df642f807d6b6b38e2f1824d',
          ],
        },
      ],
    },
    {
      from: 'ad-clean',
      to: 'ad-archive',
      files: [
        {
          path: '.agents/skills/ad-clean/SKILL.md',
          knownShas: [
            'fff910109ed8d7ed23f43a92a83d7360a321bdf13242d9de5de5ae8193081ae4',
          ],
        },
        {
          path: '.agents/skills/ad-clean/agents/openai.yaml',
          knownShas: [
            '2e4de5f0ec2901330b8e535c17709163ba3dd4685db1822241c8b0298b6eab00',
          ],
        },
      ],
    },
  ],
};

export function retiredSkillsForAgent(agent) {
  return [...(RETIRED_SKILL_MIGRATIONS[agent] ?? []), ...STATE_ONLY_PREFIX_MIGRATIONS];
}

export function retiredSkillNamesForAgent(agent) {
  return retiredSkillsForAgent(agent).map(({ from }) => from);
}
