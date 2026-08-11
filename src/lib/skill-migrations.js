// Explicit retirements are the narrow exception to the default "keep orphan
// skills" rule. A known fingerprint lets a legacy install with no state file
// be migrated safely; state-aware installs additionally prove that the target
// still matches the kit file they originally received.
const AD_GRILL_MIGRATIONS = {
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
  ],
};

export function retiredSkillsForAgent(agent) {
  return AD_GRILL_MIGRATIONS[agent] ?? [];
}

export function retiredSkillNamesForAgent(agent) {
  return retiredSkillsForAgent(agent).map(({ from }) => from);
}
